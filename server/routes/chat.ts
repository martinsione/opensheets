import { createAgentUIStreamResponse, smoothStream } from "ai";
import type * as z from "zod";
import {
  SpreadsheetAgent,
  type SpreadsheetAgentUIMessage,
} from "@/server/ai/agent";
import type {
  callOptionsSchema,
  messageMetadataSchema,
} from "@/server/ai/schema";
import type { tools } from "@/server/ai/tools";

async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: SpreadsheetAgentUIMessage[];
    options: z.infer<typeof callOptionsSchema>;
  };

  if (!body.options.anthropicApiKey) {
    return new Response("API key is required", { status: 400 });
  }

  return createAgentUIStreamResponse<
    z.infer<typeof callOptionsSchema>,
    typeof tools,
    never,
    z.infer<typeof messageMetadataSchema>
  >({
    agent: SpreadsheetAgent,
    options: body.options,
    sendSources: true,
    uiMessages: body.messages,
    experimental_transform: [smoothStream()],
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return { model: body.options.model, ...part.totalUsage };
      }
    },
  });
}

export function chatRoute(req: Request) {
  switch (req.method) {
    case "POST":
      return POST(req);
    default:
      return new Response("Method not allowed", { status: 405 });
  }
}
