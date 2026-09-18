# ghl-mcp-server

Servidor MCP (Model Context Protocol) para la API v2 de GoHighLevel (GHL). Da acceso desde Claude a contactos, oportunidades/pipelines, calendarios/citas, conversaciones, workflows, custom fields, facturas y usuarios/sub-account de un location de GHL, mas una tool generica que permite llamar cualquier otro endpoint de la API v2 no cubierto explicitamente.

## Tools incluidas

| Dominio | Tools |
|---|---|
| Contactos | `ghl_search_contacts`, `ghl_get_contact`, `ghl_create_contact`, `ghl_update_contact`, `ghl_delete_contact`, `ghl_add_contact_tags`, `ghl_remove_contact_tags`, `ghl_add_contact_note`, `ghl_list_contact_tasks`, `ghl_create_contact_task` |
| Oportunidades | `ghl_list_pipelines`, `ghl_search_opportunities`, `ghl_get_opportunity`, `ghl_create_opportunity`, `ghl_update_opportunity`, `ghl_delete_opportunity` |
| Calendarios/Citas | `ghl_list_calendars`, `ghl_get_free_slots`, `ghl_list_appointments`, `ghl_create_appointment`, `ghl_cancel_appointment` |
| Conversaciones | `ghl_search_conversations`, `ghl_list_messages`, `ghl_send_message` |
| Workflows | `ghl_list_workflows`, `ghl_add_contact_to_workflow` |
| Custom Fields | `ghl_list_custom_fields`, `ghl_create_custom_field` |
| Facturas | `ghl_list_invoices`, `ghl_get_invoice`, `ghl_create_invoice`, `ghl_void_invoice` |
| Usuarios / Location | `ghl_list_users`, `ghl_get_location` |
| Escape hatch (acceso total) | `ghl_api_request` — llama cualquier endpoint de `https://services.leadconnectorhq.com` con `method`/`path`/`query`/`body` |

## Seguridad: acciones destructivas requieren confirmacion

Toda tool que borra, anula, envia comunicaciones reales o dispara automatizaciones (`ghl_delete_contact`, `ghl_delete_opportunity`, `ghl_remove_contact_tags`, `ghl_cancel_appointment`, `ghl_send_message`, `ghl_add_contact_to_workflow`, `ghl_void_invoice`, y `ghl_api_request` para cualquier metodo distinto de GET) recibe un parametro `confirm` (default `false`). Si se llama sin `confirm:true`, la tool describe lo que haria y NO ejecuta nada — el modelo debe volver a llamarla con `confirm:true` para confirmarla.

`ghl_api_request` es el escape hatch que da cobertura a endpoints de GHL sin tool dedicada (formularios, encuestas, funnels, social planner, etc). Verifica siempre el path/payload exacto contra la [documentacion oficial de GHL API v2](https://highlevel.stoplight.io/) antes de usarlo, ya que no tiene la validacion especifica de las tools dedicadas.

## Requisitos

- Node.js >= 18
- Un **Private Integration Token (PIT)** de GHL: dentro del sub-account, ve a `Settings > Private Integrations`, crea una integracion y otorga los scopes que necesites (contacts, opportunities, calendars, conversations, workflows, invoices, etc — otorga solo los que vayas a usar).
- El `locationId` del sub-account (visible en la URL del dashboard o via `ghl_get_location` una vez conectado).

## Instalacion

```bash
npm install
npm run build
```

## Configuracion

Copia `.env.example` a `.env` y completa los valores, **o** define las variables directamente en la config del cliente MCP (recomendado para Claude Desktop/Code, ver abajo):

```
GHL_PRIVATE_INTEGRATION_TOKEN=tu_token
GHL_LOCATION_ID=tu_location_id
```

## Uso con Claude Desktop / Claude Code

Agrega esto a tu config de MCP servers (`claude_desktop_config.json` en Desktop, o la config de MCP de Claude Code):

```json
{
  "mcpServers": {
    "ghl": {
      "command": "node",
      "args": ["/ruta/absoluta/a/ghl-mcp-server/dist/index.js"],
      "env": {
        "GHL_PRIVATE_INTEGRATION_TOKEN": "tu_token",
        "GHL_LOCATION_ID": "tu_location_id"
      }
    }
  }
}
```

Reinicia el cliente y las tools `ghl_*` deberian aparecer disponibles.

## Probar con MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Notas

- Autenticacion: Private Integration Token vale solo para el sub-account donde se genero (no multi-location). Para servir a varios clientes/sub-accounts desde un solo servidor, se necesitaria migrar a una OAuth Marketplace App.
- La API v2 de GHL evoluciona; si algun endpoint de las tools dedicadas devuelve 404/400 inesperado, usa `ghl_api_request` como respaldo mientras se ajusta el path exacto contra la documentacion oficial.
- Todas las respuestas se truncan a 25000 caracteres (ver `CHARACTER_LIMIT` en `src/constants.ts`); usa `limit`/`offset` en las tools de listado para paginar.
