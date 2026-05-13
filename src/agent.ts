import Anthropic from "@anthropic-ai/sdk";
import { mkdir, writeFile } from "fs/promises";
import { tools, toolDefinitions } from "./tools";
import { Message } from "./types";

const LOG_DIR = "log";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_API_BASE_URL || "https://api.anthropic.com",
});

export async function runAgent(userMessage: string): Promise<string> {
  await mkdir(LOG_DIR, { recursive: true });

  const messages: Message[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  // agent 循环, 每次循环都将 messages 传入模型, 模型会返回一个 tool call, agent 根据 tool call 来调用工具, 将工具的结果添加到 messages 中, 继续下一轮循环. 直到模型不再返回 tool call, 而是直接返回最终的回答.
  for (let i = 0; i < 10; i++) {
    const response = await client.messages.create({
      system: "你是一个简洁的助手。当任务需要外部能力时，调用提供的工具完成；不要做长篇思考。",
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-7",
      max_tokens: 1024, // 模型回答的最大 token 数, 可以根据需要调整
      tools: toolDefinitions,
      messages,
    });

    // 把每一轮的 response 写到 log/response-{i}.json, 方便调试
    await writeFile(`${LOG_DIR}/response-${i}.json`, JSON.stringify(response, null, 2));

    // 把llm的回答添加到 messages 中, 以便下一轮循环时模型可以看到之前的对话历史
    messages.push({
      role: "assistant",
      content: response.content,
    });

    // 如果llm 说结束了, 那么就直接返回
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "（无文本回复）";
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") {
          continue;
        }

        const tool = tools[block.name];
        const result = (await tool)
          ? await tool.execute(block.input)
          : `工具 ${block.name} 不存在`;

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      // 把工具的结果添加到 messages 中, 以便下一轮循环时模型可以看到工具的结果
      messages.push({
        role: "user",
        content: toolResults,
      });
    }

    if (response.stop_reason === "max_tokens") {
      return "回复达到最大 token 数, 请调整模型参数以获得更长的回复";
    }
  }
  return "Agent 达到最大循环次数";
}
