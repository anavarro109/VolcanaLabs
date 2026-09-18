import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ghlRequest, handleApiError, resolveLocationId, respond, respondError } from "../services/client.js";

export function registerUserAndLocationTools(server: McpServer): void {
  server.registerTool(
    "ghl_list_users",
    {
      title: "Listar usuarios de un sub-account",
      description: `Lista los usuarios (miembros del equipo) con acceso a un sub-account.

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.`,
      inputSchema: { locationId: z.string().optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId }) => {
      try {
        const data = await ghlRequest("GET", "/users/", { query: { locationId: resolveLocationId(locationId) } });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_get_location",
    {
      title: "Obtener datos del sub-account (location)",
      description: `Obtiene la configuracion e informacion general de un sub-account de GHL (nombre, direccion, telefono, timezone, etc).

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.`,
      inputSchema: { locationId: z.string().optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId }) => {
      try {
        const data = await ghlRequest("GET", `/locations/${resolveLocationId(locationId)}`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
