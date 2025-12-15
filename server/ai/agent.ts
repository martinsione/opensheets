import { type AnthropicProviderOptions, anthropic } from "@ai-sdk/anthropic";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import type { InferAgentUIMessage } from "ai";
import { ToolLoopAgent, wrapLanguageModel } from "ai";
import * as z from "zod";
import { getSystemPrompt } from "@/server/ai/prompt";
import { tools } from "@/server/ai/tools";
import { Sheet } from "@/spreadsheet-service";

const wrappedAnthropic = (model: string) =>
  wrapLanguageModel({
    model: anthropic(model),
    middleware: devToolsMiddleware(),
  });

const Models = z.enum(["claude-sonnet-4-5", "claude-opus-4-5"]);

export const SpreadsheetAgent = new ToolLoopAgent({
  model: "", // Will be set in `prepareCall`
  tools,
  callOptionsSchema: z.object({
    model: Models.default("claude-opus-4-5"),
    sheets: z.array(Sheet),
  }),
  prepareCall: ({ options, ...initialOptions }) => {
    return {
      ...initialOptions,
      model: wrappedAnthropic(options.model),
      system: getSystemPrompt(options.sheets, "excel"),
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
