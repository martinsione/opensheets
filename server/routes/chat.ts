import { createAgentUIStreamResponse } from "ai";
import {
  SpreadsheetAgent,
  type SpreadsheetAgentUIMessage,
} from "@/server/ai/agent";

async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: SpreadsheetAgentUIMessage[];
    model: string;
  };

  return createAgentUIStreamResponse({
    agent: SpreadsheetAgent,
    options: { model: body.model },
    messages: body.messages,
    sendReasoning: true,
    sendSources: true,
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
