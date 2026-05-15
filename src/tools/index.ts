import { Tool } from "../types";
import { calculatorTool } from "./calculator";
import { loadMcpTools } from "./mcp";

// 本地工具 + MCP 桥接工具，统一放进这个 registry
export const tools: Record<string, Tool> = {
    calculator: calculatorTool,
}

// 给 anthropic sdk 用的 definition 数组：函数形式，每次 agent 循环时取当前快照
export function getToolDefinitions() {
    return Object.values(tools).map(t => t.definition);
}

// 启动时调用一次：把 MCP server 拉起来，把它们暴露的工具合并进 tools
export async function initTools() {
    const mcp = await loadMcpTools();
    Object.assign(tools, mcp);
}
