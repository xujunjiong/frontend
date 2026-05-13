import { Tool } from "../types";
import { calculatorTool } from "./calculator";

// 后续文件可以在这里导入并添加到工具列表中

export const tools: Record<string, Tool> = {
    calculator: calculatorTool,
}

// 给anthropic sdk 用的definition 数组
export const toolDefinitions = Object.values(tools).map(t => (t.definition));