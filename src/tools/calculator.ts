import { Tool } from "../types";

export const calculatorTool: Tool = {
  definition: {
    name: "calculator",
    description: "执行数学计算，输入一个数学表达式字符串",
    input_schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "数学表达式，例如 '2 + 3 * 4'",
        },
      },
      required: ["expression"],
    },
  },
  async execute(input) {
    const { expression } = input as { expression: string };
    try {
      // 注意：生产环境不要用 eval，这里只是演示
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch {
      return "计算出错，请检查表达式";
    }
  },
};