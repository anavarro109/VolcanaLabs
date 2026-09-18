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

export function registerContactTools(server: McpServer): void {
  server.registerTool(
    "ghl_search_contacts",
    {
      title: "Buscar contactos en GHL",
      description: `Busca contactos en un sub-account de GoHighLevel por texto libre (nombre, email, telefono) con paginacion.

No crea ni modifica datos.

Args:
  - query (string, opcional): texto de busqueda libre.
  - locationId (string, opcional): sub-account. Si se omite usa GHL_LOCATION_ID.
  - limit (number, opcional): maximo de resultados, 1-100 (default 20).
  - offset (number, opcional): resultados a saltar para paginar (default 0).

Retorna la respuesta cruda de GHL (contactos + metadata de paginacion).`,
      inputSchema: {
        query: z.string().max(200).optional().describe("Texto de busqueda libre"),
        locationId: z.string().optional().describe("Sub-account de GHL (default: GHL_LOCATION_ID)"),
        limit: z.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ query, locationId, limit, offset }) => {
      try {
        const data = await ghlRequest("POST", "/contacts/search", {
          body: {
            locationId: resolveLocationId(locationId),
            query,
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
    "ghl_get_contact",
    {
      title: "Obtener contacto de GHL",
      description: `Obtiene el detalle completo de un contacto por su ID.

Args:
  - contactId (string, requerido): ID del contacto en GHL.`,
      inputSchema: { contactId: z.string().min(1) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ contactId }) => {
      try {
        const data = await ghlRequest("GET", `/contacts/${contactId}`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_create_contact",
    {
      title: "Crear contacto en GHL",
      description: `Crea un nuevo contacto en un sub-account de GHL. Si ya existe un contacto con el mismo email/telefono, GHL puede fusionarlo en lugar de duplicar.

Args:
  - locationId (string, opcional): sub-account (default: GHL_LOCATION_ID).
  - firstName, lastName, email, phone (string, opcionales).
  - tags (string[], opcional): tags a asignar al crear.
  - source (string, opcional): origen del lead (util para atribucion, ej. "demo-chatbot").`,
      inputSchema: {
        locationId: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ locationId, firstName, lastName, email, phone, tags, source }) => {
      try {
        const data = await ghlRequest("POST", "/contacts/", {
          body: { locationId: resolveLocationId(locationId), firstName, lastName, email, phone, tags, source },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_update_contact",
    {
      title: "Actualizar contacto en GHL",
      description: `Actualiza campos de un contacto existente (sobrescribe los campos enviados).

Args:
  - contactId (string, requerido).
  - firstName, lastName, email, phone (string, opcionales): solo se actualizan los campos provistos.`,
      inputSchema: {
        contactId: z.string().min(1),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ contactId, ...fields }) => {
      try {
        const data = await ghlRequest("PUT", `/contacts/${contactId}`, { body: fields });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_delete_contact",
    {
      title: "Eliminar contacto de GHL",
      description: `Elimina permanentemente un contacto. Accion IRREVERSIBLE.

Requiere confirm:true. Si se llama con confirm:false u omitido, describe la accion sin ejecutarla.

Args:
  - contactId (string, requerido).
  - confirm (boolean, default false): debe ser true para ejecutar el borrado.`,
      inputSchema: { contactId: z.string().min(1), confirm: z.boolean().default(false) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ contactId, confirm }) => {
      const pending = requireConfirmation(confirm, `Se eliminara permanentemente el contacto ${contactId}.`);
      if (pending) return pending;
      try {
        const data = await ghlRequest("DELETE", `/contacts/${contactId}`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_add_contact_tags",
    {
      title: "Agregar tags a un contacto",
      description: `Agrega uno o mas tags a un contacto (no elimina los existentes).

Args:
  - contactId (string, requerido).
  - tags (string[], requerido, minimo 1).`,
      inputSchema: { contactId: z.string().min(1), tags: z.array(z.string()).min(1) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ contactId, tags }) => {
      try {
        const data = await ghlRequest("POST", `/contacts/${contactId}/tags`, { body: { tags } });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_remove_contact_tags",
    {
      title: "Quitar tags de un contacto",
      description: `Elimina uno o mas tags de un contacto. Requiere confirm:true.

Args:
  - contactId (string, requerido).
  - tags (string[], requerido, minimo 1).
  - confirm (boolean, default false).`,
      inputSchema: { contactId: z.string().min(1), tags: z.array(z.string()).min(1), confirm: z.boolean().default(false) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ contactId, tags, confirm }) => {
      const pending = requireConfirmation(confirm, `Se quitaran los tags [${tags.join(", ")}] del contacto ${contactId}.`);
      if (pending) return pending;
      try {
        const data = await ghlRequest("DELETE", `/contacts/${contactId}/tags`, { body: { tags } });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_add_contact_note",
    {
      title: "Agregar nota a un contacto",
      description: `Agrega una nota interna (no visible para el contacto) a su timeline en GHL.

Args:
  - contactId (string, requerido).
  - body (string, requerido): texto de la nota.`,
      inputSchema: { contactId: z.string().min(1), body: z.string().min(1) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ contactId, body }) => {
      try {
        const data = await ghlRequest("POST", `/contacts/${contactId}/notes`, { body: { body } });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_list_contact_tasks",
    {
      title: "Listar tareas de un contacto",
      description: `Lista las tareas (to-dos) asociadas a un contacto.

Args:
  - contactId (string, requerido).`,
      inputSchema: { contactId: z.string().min(1) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ contactId }) => {
      try {
        const data = await ghlRequest("GET", `/contacts/${contactId}/tasks`);
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_create_contact_task",
    {
      title: "Crear tarea para un contacto",
      description: `Crea una tarea (to-do) asociada a un contacto, con fecha de vencimiento opcional.

Args:
  - contactId (string, requerido).
  - title (string, requerido).
  - dueDate (string, opcional): fecha ISO 8601 (ej. "2026-09-25T15:00:00Z").
  - assignedTo (string, opcional): userId de GHL asignado a la tarea.`,
      inputSchema: {
        contactId: z.string().min(1),
        title: z.string().min(1),
        dueDate: z.string().optional(),
        assignedTo: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ contactId, title, dueDate, assignedTo }) => {
      try {
        const data = await ghlRequest("POST", `/contacts/${contactId}/tasks`, {
          body: { title, dueDate, assignedTo },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
