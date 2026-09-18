import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ghlRequest,
  handleApiError,
  requireConfirmation,
  resolveLocationId,
  respond,
  respondError,
} from "../services/client.js";

export function registerWorkflowTools(server: McpServer): void {
  server.registerTool(
    "ghl_list_workflows",
    {
      title: "Listar workflows de GHL",
      description: `Lista los workflows (automatizaciones) configurados en un sub-account, con sus IDs.

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.`,
      inputSchema: { locationId: z.string().optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId }) => {
      try {
        const data = await ghlRequest("GET", "/workflows/", { query: { locationId: resolveLocationId(locationId) } });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_add_contact_to_workflow",
    {
      title: "Inscribir contacto en un workflow",
      description: `Inscribe a un contacto en un workflow, disparando toda su secuencia de automatizacion (emails, SMS, tareas, esperas, etc). Puede tener efectos externos irreversibles. Requiere confirm:true.

Args:
  - contactId (string, requerido).
  - workflowId (string, requerido).
  - confirm (boolean, default false).`,
      inputSchema: {
        contactId: z.string().min(1),
        workflowId: z.string().min(1),
        confirm: z.boolean().default(false),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ contactId, workflowId, confirm }) => {
      const pending = requireConfirmation(
        confirm,
        `Se inscribira al contacto ${contactId} en el workflow ${workflowId}, disparando su automatizacion completa.`
      );
      if (pending) return pending;
      try {
        const data = await ghlRequest("POST", `/contacts/${contactId}/workflow/${workflowId}`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
