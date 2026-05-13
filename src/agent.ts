import Anthropic from "@anthropic-ai/sdk";
import { tools, toolDefinitions } from "./tools";
import { Message } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runAgent(userMessage: string): Promise<string> {
  const messages: Message[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  // agent 循环, 每次循环都将 messages 传入模型, 模型会返回一个 tool call, agent 根据 tool call 来调用工具, 将工具的结果添加到 messages 中, 继续下一轮循环. 直到模型不再返回 tool call, 而是直接返回最终的回答.
  for (let i = 0; i < 10; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024, // 模型回答的最大 token 数, 可以根据需要调整
      tools: toolDefinitions,
      messages,
    });

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

    // 其他 stop_reason（比如 max_tokens）
    break;
  }
  return "Agent 达到最大循环次数";
}
