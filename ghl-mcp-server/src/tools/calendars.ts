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

export function registerCalendarTools(server: McpServer): void {
  server.registerTool(
    "ghl_list_calendars",
    {
      title: "Listar calendarios de GHL",
      description: `Lista los calendarios configurados en un sub-account (para agendar citas via ghl_create_appointment).

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.`,
      inputSchema: { locationId: z.string().optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId }) => {
      try {
        const data = await ghlRequest("GET", "/calendars/", { query: { locationId: resolveLocationId(locationId) } });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_get_free_slots",
    {
      title: "Obtener horarios disponibles de un calendario",
      description: `Obtiene los slots libres de un calendario en un rango de fechas, para ofrecer horarios al agendar una cita.

Args:
  - calendarId (string, requerido).
  - startDate (string, requerido): timestamp en milisegundos epoch (ej. Date.now()).
  - endDate (string, requerido): timestamp en milisegundos epoch.
  - timezone (string, opcional): ej. "America/Mexico_City".`,
      inputSchema: {
        calendarId: z.string().min(1),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        timezone: z.string().optional(),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ calendarId, startDate, endDate, timezone }) => {
      try {
        const data = await ghlRequest("GET", `/calendars/${calendarId}/free-slots`, {
          query: { startDate, endDate, timezone },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_list_appointments",
    {
      title: "Listar citas de un calendario",
      description: `Lista las citas (appointments) de un calendario en un rango de fechas.

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.
  - calendarId (string, requerido).
  - startTime (string, requerido): timestamp en milisegundos epoch.
  - endTime (string, requerido): timestamp en milisegundos epoch.`,
      inputSchema: {
        locationId: z.string().optional(),
        calendarId: z.string().min(1),
        startTime: z.string().min(1),
        endTime: z.string().min(1),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ locationId, calendarId, startTime, endTime }) => {
      try {
        const data = await ghlRequest("GET", "/calendars/events", {
          query: { locationId: resolveLocationId(locationId), calendarId, startTime, endTime },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_create_appointment",
    {
      title: "Crear cita en GHL",
      description: `Agenda una nueva cita para un contacto en un calendario. Notifica al contacto segun la configuracion del calendario (puede enviar SMS/email de confirmacion).

Args:
  - locationId (string, opcional): default GHL_LOCATION_ID.
  - calendarId (string, requerido).
  - contactId (string, requerido).
  - startTime (string, requerido): ISO 8601, ej. "2026-09-25T15:00:00-06:00".
  - endTime (string, requerido): ISO 8601.
  - title (string, opcional).`,
      inputSchema: {
        locationId: z.string().optional(),
        calendarId: z.string().min(1),
        contactId: z.string().min(1),
        startTime: z.string().min(1),
        endTime: z.string().min(1),
        title: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ locationId, calendarId, contactId, startTime, endTime, title }) => {
      try {
        const data = await ghlRequest("POST", "/calendars/events/appointments", {
          body: {
            locationId: resolveLocationId(locationId),
            calendarId,
            contactId,
            startTime,
            endTime,
            title,
          },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );

  server.registerTool(
    "ghl_cancel_appointment",
    {
      title: "Cancelar cita en GHL",
      description: `Cancela una cita existente. Puede disparar una notificacion de cancelacion al contacto. Requiere confirm:true.

Args:
  - appointmentId (string, requerido).
  - confirm (boolean, default false).`,
      inputSchema: { appointmentId: z.string().min(1), confirm: z.boolean().default(false) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ appointmentId, confirm }) => {
      const pending = requireConfirmation(confirm, `Se cancelara la cita ${appointmentId} y se puede notificar al contacto.`);
      if (pending) return pending;
      try {
        const data = await ghlRequest("PUT", `/calendars/events/appointments/${appointmentId}`, {
          body: { appointmentStatus: "cancelled" },
        });
        return respond(data);
      } catch (error) {
        return respondError(handleApiError(error));
      }
    }
  );
}
