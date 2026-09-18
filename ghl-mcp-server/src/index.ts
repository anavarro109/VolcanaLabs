#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerOpportunityTools } from "./tools/opportunities.js";
import { registerCalendarTools } from "./tools/calendars.js";
import { registerConversationTools } from "./tools/conversations.js";
import { registerWorkflowTools } from "./tools/workflows.js";
import { registerCustomFieldTools } from "./tools/customFields.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerUserAndLocationTools } from "./tools/users.js";
import { registerRawRequestTool } from "./tools/raw.js";

const server = new McpServer({
  name: "ghl-mcp-server",
  version: "1.0.0",
});

registerContactTools(server);
registerOpportunityTools(server);
registerCalendarTools(server);
registerConversationTools(server);
registerWorkflowTools(server);
registerCustomFieldTools(server);
registerInvoiceTools(server);
registerUserAndLocationTools(server);
registerRawRequestTool(server);

async function main(): Promise<void> {
  if (!process.env.GHL_PRIVATE_INTEGRATION_TOKEN) {
    console.error("ERROR: GHL_PRIVATE_INTEGRATION_TOKEN environment variable is required.");
    console.error("Generate one in GHL under Settings > Private Integrations.");
    process.exit(1);
  }
  if (!process.env.GHL_LOCATION_ID) {
    console.error(
      "WARNING: GHL_LOCATION_ID is not set. Every tool call will need locationId passed explicitly."
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ghl-mcp-server corriendo via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
