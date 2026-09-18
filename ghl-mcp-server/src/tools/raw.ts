import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ghlRequest, handleApiError, requireConfirmation, respond, respondError } from "../services/client.js";

/**
 * Escape hatch: GHL's v2 API has hundreds of endpoints (social planner,
 * surveys, forms, funnels, blogs, SaaS/relationships, etc). Rather than
 * hand-write a tool per endpoint, this tool lets the model call ANY GHL
 * v2 path directly, giving full API coverage beyond the curated tools
 * above. GET requests run immediately (read-only); anything that writes
 * requires confirm:true.
 */
export function registerRawRequestTool(server: McpServer): void {
  server.registerTool(
    "ghl_api_request",
    {
      title: "Llamada directa a cualquier endpoint de la API v2 de GHL",
      description: `Escape hatch de acceso total: llama directamente a cualquier endpoint de la API v2 de GoHighLevel (https://services.leadconnectorhq.com) que no tenga una tool dedicada arriba (ej. formularios, encuestas, funnels, social planner, relaciones SaaS, campos personalizados avanzados, etc).

Usa esta tool SOLO cuando ninguna tool especifica (ghl_*) cubra lo que necesitas. Consulta la documentacion oficial de GHL API v2 para conocer el path y payload exactos de cada endpoint antes de usarla.

Args:
  - method (string, requerido): "GET" | "POST" | "PUT" | "DELETE" | "PATCH".
  - path (string, requerido): path del endpoint SIN el dominio, ej. "/forms/" o "/surveys/submissions". Debe empezar con "/".
  - query (object, opcional): query params como pares clave-valor.
  - body (object, opcional): body JSON para POST/PUT/PATCH.
  - confirm (boolean, default false): OBLIGATORIO en true para cualquier metodo distinto de GET, ya que puede crear, modificar o borrar datos reales sin las validaciones de las tools dedicadas.

GET se ejecuta de inmediato (solo lectura). Para POST/PUT/DELETE/PATCH sin confirm:true, la tool describe la llamada que haria y no la ejecuta.`,
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
        path: z.string().min(1).regex(/^\//, "path debe empezar con /"),
        query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
        body: z.record(z.unknown()).optional(),
        confirm: z.boolean().default(false),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ method, path, query, body, confirm }) => {
      if (method !== "GET") {
        const pending = requireConfirmation(
          confirm,
          `Se hara ${method} ${path} contra la API de GHL con body=${JSON.stringify(body ?? {})}. Esto puede crear, modificar o borrar datos reales sin las validaciones de una tool dedicada.`
        );
        if (pending) return pending;
      }
      try {
        const data = await ghlRequest(method, path, { query, body });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
