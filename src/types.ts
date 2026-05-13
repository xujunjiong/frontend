import Anthropic from "@anthropic-ai/sdk";

export type Message = Anthropic.MessageParam;

export interface Tool {
    definition: Anthropic.Tool; // 给llm 看的描述
    execute: (input: unknown) => Promise<string>; // 给agent 看的执行函数
}
