import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ghlRequest, handleApiError, resolveLocationId, respond, respondError } from "../services/client.js";

export function registerCustomFieldTools(server: McpServer): void {
  server.registerTool(
    "ghl_list_custom_fields",
    {
      title: "Listar custom fields de GHL",
      description: `Lista los campos personalizados definidos en un sub-account (usados en contactos/oportunidades).

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.`,
      inputSchema: { locationId: z.string().optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId }) => {
      try {
        const data = await ghlRequest("GET", `/locations/${resolveLocationId(locationId)}/customFields`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_create_custom_field",
    {
      title: "Crear custom field en GHL",
      description: `Crea un nuevo campo personalizado a nivel de sub-account.

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.
  - name (string, requerido): nombre del campo.
  - dataType (string, requerido): "TEXT" | "NUMERICAL" | "PHONE" | "DATE" | "SINGLE_OPTIONS" | "MULTIPLE_OPTIONS" | "CHECKBOX".
  - model (string, opcional): "contact" | "opportunity" (default "contact").`,
      inputSchema: {
        locationId: z.string().optional(),
        name: z.string().min(1),
        dataType: z.enum(["TEXT", "NUMERICAL", "PHONE", "DATE", "SINGLE_OPTIONS", "MULTIPLE_OPTIONS", "CHECKBOX"]),
        model: z.enum(["contact", "opportunity"]).default("contact"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ locationId, name, dataType, model }) => {
      try {
        const data = await ghlRequest("POST", `/locations/${resolveLocationId(locationId)}/customFields`, {
          body: { name, dataType, model },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
