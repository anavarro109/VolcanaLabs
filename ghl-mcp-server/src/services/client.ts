import axios, { AxiosError } from "axios";
import { CHARACTER_LIMIT, GHL_API_BASE_URL, GHL_API_VERSION } from "../constants.js";
import type { HttpMethod } from "../types.js";

function getToken(): string {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  if (!token) {
    throw new Error(
      "GHL_PRIVATE_INTEGRATION_TOKEN environment variable is required. " +
        "Generate a Private Integration Token in GHL under Settings > Private Integrations."
    );
  }
  return token;
}

/**
 * The default sub-account (location) to operate on when a tool call
 * doesn't explicitly override locationId. Most GHL v2 endpoints require
 * locationId even when the Private Integration Token is already scoped
 * to a single location.
 */
export function getDefaultLocationId(): string | undefined {
  return process.env.GHL_LOCATION_ID;
}

export function resolveLocationId(explicit?: string): string {
  const locationId = explicit ?? getDefaultLocationId();
  if (!locationId) {
    throw new Error(
      "locationId is required: pass it explicitly or set GHL_LOCATION_ID in the environment."
    );
  }
  return locationId;
}

export async function ghlRequest<T = unknown>(
  method: HttpMethod,
  path: string,
  options: { query?: Record<string, unknown>; body?: unknown } = {}
): Promise<T> {
  const response = await axios({
    method,
    url: `${GHL_API_BASE_URL}${path}`,
    params: options.query,
    data: options.body,
    timeout: 30000,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  return response.data as T;
}

export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string }>;
    if (err.response) {
      const apiMessage = err.response.data?.message;
      switch (err.response.status) {
        case 400:
          return `Error: Solicitud inválida (400)${apiMessage ? ` - ${apiMessage}` : ""}. Revisa los parámetros enviados.`;
        case 401:
          return "Error: No autorizado (401). El GHL_PRIVATE_INTEGRATION_TOKEN es inválido o expiró.";
        case 403:
          return "Error: Permiso denegado (403). El token no tiene scope para esta operación en este sub-account.";
        case 404:
          return `Error: Recurso no encontrado (404)${apiMessage ? ` - ${apiMessage}` : ""}. Verifica el ID.`;
        case 422:
          return `Error: Datos no procesables (422)${apiMessage ? ` - ${apiMessage}` : ""}.`;
        case 429:
          return "Error: Límite de rate excedido (429). Espera antes de reintentar.";
        default:
          return `Error: la API de GHL respondió con status ${err.response.status}${apiMessage ? ` - ${apiMessage}` : ""}.`;
      }
    }
    if (err.code === "ECONNABORTED") {
      return "Error: la solicitud a GHL superó el timeout de 30s. Intenta de nuevo.";
    }
  }
  return `Error inesperado: ${error instanceof Error ? error.message : String(error)}`;
}

export function respond(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  const { text } = truncate(JSON.stringify(data, null, 2));
  return { content: [{ type: "text", text }] };
}

export function respondError(message: string): { isError: true; content: Array<{ type: "text"; text: string }> } {
  return { isError: true, content: [{ type: "text", text: message }] };
}

export function truncate(text: string): { text: string; truncated: boolean } {
  if (text.length <= CHARACTER_LIMIT) {
    return { text, truncated: false };
  }
  return {
    text:
      text.slice(0, CHARACTER_LIMIT) +
      `\n\n[Respuesta truncada a ${CHARACTER_LIMIT} caracteres. Usa filtros o paginación (limit/offset) para reducir el resultado.]`,
    truncated: true,
  };
}

/**
 * Every write tool that can destroy or irreversibly send data (delete,
 * void, send message, enroll in workflow, ...) must gate on this helper
 * instead of executing directly. When confirm is false we describe the
 * action and stop, so the model has to explicitly opt in with confirm:true
 * after showing the user what it's about to do.
 */
export function requireConfirmation(
  confirm: boolean | undefined,
  actionDescription: string
): { content: Array<{ type: "text"; text: string }> } | null {
  if (confirm) return null;
  return {
    content: [
      {
        type: "text",
        text:
          `Acción no ejecutada (requiere confirmación). ${actionDescription}\n\n` +
          `Para ejecutarla, vuelve a llamar esta misma tool con confirm: true.`,
      },
    ],
  };
}
