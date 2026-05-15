import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "../types";

// 一个 MCP server 的描述：怎么把它启起来。
interface McpServerSpec {
  command: string;
  args: string[];
}

// 你想接入的 MCP server 列表，后续可以继续加。
const SERVERS: Record<string, McpServerSpec> = {
  "dep-audit": {
    command: "node",
    args: ["node_modules/dep-audit-mcp/build/index.js"],
  },
};

// 把一个 MCP server 拉起来，列出它的工具，桥接成 agent 用的 Tool。
async function bridgeServer(name: string, spec: McpServerSpec): Promise<Record<string, Tool>> {
  const transport = new StdioClientTransport({
    command: spec.command,
    args: spec.args,
  });
  const client = new Client({ name: "frontend-agent", version: "1.0.0" });
  await client.connect(transport);

  const { tools: mcpTools } = await client.listTools();
  const bridged: Record<string, Tool> = {};

  for (const t of mcpTools) {
    // MCP 工具名前加 server 前缀，避免不同 server 冲突
    const toolName = `${name}__${t.name}`;
    bridged[toolName] = {
      definition: {
        name: toolName,
        description: t.description ?? "",
        input_schema: t.inputSchema as Tool["definition"]["input_schema"],
      },
      async execute(input) {
        const result = await client.callTool({
          name: t.name,
          arguments: input as Record<string, unknown>,
        });
        // MCP 返回的是 content blocks 数组，这里把文本块拼起来给 agent
        const content = result.content as Array<{ type: string; text?: string }> | undefined;
        if (!content) return "";
        return content
          .map((c) => (c.type === "text" && c.text ? c.text : JSON.stringify(c)))
          .join("\n");
      },
    };
  }

  console.log(`[mcp] ${name} connected, tools: ${Object.keys(bridged).join(", ")}`);
  return bridged;
}

export async function loadMcpTools(): Promise<Record<string, Tool>> {
  const all: Record<string, Tool> = {};
  for (const [name, spec] of Object.entries(SERVERS)) {
    try {
      Object.assign(all, await bridgeServer(name, spec));
    } catch (err) {
      // 单个 MCP 起不来不影响其它工具
      console.error(`[mcp] failed to load ${name}:`, err);
    }
  }
  return all;
}
