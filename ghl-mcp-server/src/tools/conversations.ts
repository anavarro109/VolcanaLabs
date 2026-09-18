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
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../constants.js";

export function registerConversationTools(server: McpServer): void {
  server.registerTool(
    "ghl_search_conversations",
    {
      title: "Buscar conversaciones en GHL",
      description: `Busca conversaciones (SMS/email/chat/llamadas) de un sub-account, opcionalmente filtradas por contacto.

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.
  - contactId (string, opcional): filtra por contacto.
  - limit (number, opcional, 1-100, default 20).
  - offset (number, opcional, default 0).`,
      inputSchema: {
        locationId: z.string().optional(),
        contactId: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId, contactId, limit, offset }) => {
      try {
        const data = await ghlRequest("GET", "/conversations/search", {
          query: { locationId: resolveLocationId(locationId), contactId, limit, skip: offset },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_list_messages",
    {
      title: "Listar mensajes de una conversacion",
      description: `Lista los mensajes de una conversacion especifica, en orden cronologico.

Args:
  - conversationId (string, requerido).
  - limit (number, opcional, 1-100, default 20).`,
      inputSchema: {
        conversationId: z.string().min(1),
        limit: z.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ conversationId, limit }) => {
      try {
        const data = await ghlRequest("GET", `/conversations/${conversationId}/messages`, { query: { limit } });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_send_message",
    {
      title: "Enviar mensaje (SMS/email) a un contacto",
      description: `Envia un mensaje real (SMS o email) a un contacto desde el sub-account. Accion IRREVERSIBLE (el mensaje sale de inmediato). Requiere confirm:true.

Args:
  - contactId (string, requerido).
  - type (string, requerido): "SMS" | "Email".
  - message (string, requerido): cuerpo del mensaje (texto plano para SMS, puede ser HTML para Email).
  - confirm (boolean, default false).`,
      inputSchema: {
        contactId: z.string().min(1),
        type: z.enum(["SMS", "Email"]),
        message: z.string().min(1),
        confirm: z.boolean().default(false),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ contactId, type, message, confirm }) => {
      const pending = requireConfirmation(
        confirm,
        `Se enviara un mensaje real de tipo ${type} al contacto ${contactId}: "${message.slice(0, 120)}${message.length > 120 ? "..." : ""}"`
      );
      if (pending) return pending;
      try {
        const data = await ghlRequest("POST", "/conversations/messages", {
          body: { contactId, type, message },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
