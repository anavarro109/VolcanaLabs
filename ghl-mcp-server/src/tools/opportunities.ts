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

export function registerOpportunityTools(server: McpServer): void {
  server.registerTool(
    "ghl_list_pipelines",
    {
      title: "Listar pipelines de GHL",
      description: `Lista los pipelines de ventas configurados en un sub-account, incluyendo sus stages (etapas) e IDs, necesarios para crear/mover oportunidades.

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.`,
      inputSchema: { locationId: z.string().optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId }) => {
      try {
        const data = await ghlRequest("GET", "/opportunities/pipelines", {
          query: { locationId: resolveLocationId(locationId) },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_search_opportunities",
    {
      title: "Buscar oportunidades en GHL",
      description: `Busca oportunidades (deals) en un pipeline, opcionalmente filtradas por stage, contacto o texto libre.

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.
  - pipelineId (string, opcional): filtra por pipeline.
  - pipelineStageId (string, opcional): filtra por etapa.
  - contactId (string, opcional): filtra por contacto asociado.
  - query (string, opcional): texto libre.
  - limit (number, opcional, 1-100, default 20).
  - offset (number, opcional, default 0).`,
      inputSchema: {
        locationId: z.string().optional(),
        pipelineId: z.string().optional(),
        pipelineStageId: z.string().optional(),
        contactId: z.string().optional(),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId, pipelineId, pipelineStageId, contactId, query, limit, offset }) => {
      try {
        const data = await ghlRequest("GET", "/opportunities/search", {
          query: {
            location_id: resolveLocationId(locationId),
            pipeline_id: pipelineId,
            pipeline_stage_id: pipelineStageId,
            contact_id: contactId,
            q: query,
            limit,
            skip: offset,
          },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_get_opportunity",
    {
      title: "Obtener oportunidad de GHL",
      description: `Obtiene el detalle de una oportunidad por ID.

Args:
  - opportunityId (string, requerido).`,
      inputSchema: { opportunityId: z.string().min(1) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ opportunityId }) => {
      try {
        const data = await ghlRequest("GET", `/opportunities/${opportunityId}`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_create_opportunity",
    {
      title: "Crear oportunidad en GHL",
      description: `Crea una nueva oportunidad (deal) en un pipeline, asociada a un contacto existente.

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.
  - pipelineId (string, requerido).
  - pipelineStageId (string, requerido).
  - contactId (string, requerido): contacto asociado.
  - name (string, requerido): titulo de la oportunidad.
  - monetaryValue (number, opcional): valor estimado del deal.
  - status (string, opcional): "open" | "won" | "lost" | "abandoned" (default "open").`,
      inputSchema: {
        locationId: z.string().optional(),
        pipelineId: z.string().min(1),
        pipelineStageId: z.string().min(1),
        contactId: z.string().min(1),
        name: z.string().min(1),
        monetaryValue: z.number().optional(),
        status: z.enum(["open", "won", "lost", "abandoned"]).default("open"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ locationId, pipelineId, pipelineStageId, contactId, name, monetaryValue, status }) => {
      try {
        const data = await ghlRequest("POST", "/opportunities/", {
          body: {
            locationId: resolveLocationId(locationId),
            pipelineId,
            pipelineStageId,
            contactId,
            name,
            monetaryValue,
            status,
          },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_update_opportunity",
    {
      title: "Actualizar oportunidad en GHL (incluye mover de stage)",
      description: `Actualiza campos de una oportunidad existente. Para mover una oportunidad a otra etapa, envia pipelineStageId.

Args:
  - opportunityId (string, requerido).
  - pipelineStageId (string, opcional): nueva etapa.
  - name (string, opcional).
  - monetaryValue (number, opcional).
  - status (string, opcional): "open" | "won" | "lost" | "abandoned".`,
      inputSchema: {
        opportunityId: z.string().min(1),
        pipelineStageId: z.string().optional(),
        name: z.string().optional(),
        monetaryValue: z.number().optional(),
        status: z.enum(["open", "won", "lost", "abandoned"]).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ opportunityId, ...fields }) => {
      try {
        const data = await ghlRequest("PUT", `/opportunities/${opportunityId}`, { body: fields });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_delete_opportunity",
    {
      title: "Eliminar oportunidad de GHL",
      description: `Elimina permanentemente una oportunidad. Accion IRREVERSIBLE. Requiere confirm:true.

Args:
  - opportunityId (string, requerido).
  - confirm (boolean, default false).`,
      inputSchema: { opportunityId: z.string().min(1), confirm: z.boolean().default(false) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ opportunityId, confirm }) => {
      const pending = requireConfirmation(confirm, `Se eliminara permanentemente la oportunidad ${opportunityId}.`);
      if (pending) return pending;
      try {
        const data = await ghlRequest("DELETE", `/opportunities/${opportunityId}`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
