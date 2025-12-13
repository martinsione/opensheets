import { type AnthropicProviderOptions, anthropic } from "@ai-sdk/anthropic";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import type { InferAgentUIMessage } from "ai";
import { ToolLoopAgent, wrapLanguageModel } from "ai";
import { z } from "zod";

const wrappedAnthropic = (model: string) =>
  wrapLanguageModel({
    model: anthropic(model),
    middleware: devToolsMiddleware(),
  });

const tools = {
  bashCodeExecution: anthropic.tools.bash_20250124({}),
  codeExecution: anthropic.tools.codeExecution_20250522({}),
  textEditorCodeExecution: anthropic.tools.textEditor_20250728({}),
  webSearch: anthropic.tools.webSearch_20250305({}),
};

export const SpreadsheetAgent = new ToolLoopAgent({
  callOptionsSchema: z.object({
    model: z
      .enum(["claude-sonnet-4-5", "claude-opus-4-5"])
      .default("claude-opus-4-5"),
  }),
  model: wrappedAnthropic("claude-opus-4-5"),
  tools,
  prepareCall: ({ options, ...initialOptions }) => {
    return {
      ...initialOptions,
      model: wrappedAnthropic(options.model),
      providerOptions: {
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 16000 },
        } satisfies AnthropicProviderOptions,
      },
    };
  },
});

export type SpreadsheetAgentUIMessage = InferAgentUIMessage<
  typeof SpreadsheetAgent
>;
