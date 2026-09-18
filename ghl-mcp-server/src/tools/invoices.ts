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

export function registerInvoiceTools(server: McpServer): void {
  server.registerTool(
    "ghl_list_invoices",
    {
      title: "Listar facturas de GHL",
      description: `Lista las facturas (invoices) de un sub-account.

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
        const data = await ghlRequest("GET", "/invoices/", {
          query: { altId: resolveLocationId(locationId), altType: "location", contactId, limit, offset },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_get_invoice",
    {
      title: "Obtener factura de GHL",
      description: `Obtiene el detalle de una factura por ID.

Args:
  - invoiceId (string, requerido).`,
      inputSchema: { invoiceId: z.string().min(1) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ invoiceId }) => {
      try {
        const data = await ghlRequest("GET", `/invoices/${invoiceId}`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_create_invoice",
    {
      title: "Crear factura en GHL",
      description: `Crea una factura para un contacto. No la envia automaticamente (segun configuracion de GHL puede requerir un paso de envio separado).

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.
  - contactId (string, requerido).
  - title (string, requerido).
  - items (array, requerido): lista de { name: string, amount: number, quantity: number }.
  - currency (string, opcional): default "USD".`,
      inputSchema: {
        locationId: z.string().optional(),
        contactId: z.string().min(1),
        title: z.string().min(1),
        items: z
          .array(
            z.object({
              name: z.string().min(1),
              amount: z.number().positive(),
              quantity: z.number().int().positive().default(1),
            })
          )
          .min(1),
        currency: z.string().default("USD"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ locationId, contactId, title, items, currency }) => {
      try {
        const data = await ghlRequest("POST", "/invoices/", {
          body: { altId: resolveLocationId(locationId), altType: "location", contactId, title, items, currency },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_void_invoice",
    {
      title: "Anular factura en GHL",
      description: `Anula (void) una factura existente. Accion IRREVERSIBLE. Requiere confirm:true.

Args:
  - invoiceId (string, requerido).
  - confirm (boolean, default false).`,
      inputSchema: { invoiceId: z.string().min(1), confirm: z.boolean().default(false) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ invoiceId, confirm }) => {
      const pending = requireConfirmation(confirm, `Se anulara permanentemente la factura ${invoiceId}.`);
      if (pending) return pending;
      try {
        const data = await ghlRequest("POST", `/invoices/${invoiceId}/void`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
