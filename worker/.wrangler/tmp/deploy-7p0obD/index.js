var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var UAZAPI_URL = "https://clara-ai.uazapi.com";
var UAZAPI_TOKEN = "10625a6c-1690-4356-a862-57da4401d555";
var ALLOWED_ORIGINS = [
  "https://thiagosilvasantos-beep.github.io",
  "http://localhost",
  "http://127.0.0.1",
  "null"
  // file:// protocol
];
function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o)) || origin === "null";
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
__name(corsHeaders, "corsHeaders");
var index_default = {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "M\xE9todo n\xE3o permitido" }), {
        status: 405,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }
    try {
      const body = await request.json();
      const { number, text } = body;
      if (!number || !text) {
        return new Response(JSON.stringify({ error: "number e text s\xE3o obrigat\xF3rios" }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      const resp = await fetch(`${UAZAPI_URL}/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_TOKEN
        },
        body: JSON.stringify({ number, text })
      });
      const data = await resp.text();
      return new Response(data, {
        status: resp.status,
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
