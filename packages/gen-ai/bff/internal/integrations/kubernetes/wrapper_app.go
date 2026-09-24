package kubernetes

// wrapperAppScript is the app.py content stored in the wrapper-app ConfigMap and
// mounted at /opt/custom inside the Sandbox pod.
//
// Boot sequence:
//  1. Create the llama-stack provider/distribution directories that the operator
//     entrypoint would normally set up (skipped because we override the command).
//  2. Start the OGX ASGI app via create_app().
//  3. Wrap it with MaaSTokenMiddleware, which exchanges the caller's Bearer token
//     for an ephemeral MaaS API key and injects it as X-OGX-Provider-Data.
const wrapperAppScript = `import os, json, time
from datetime import datetime, timezone
import httpx
import uvicorn
from ogx.core.server.server import create_app

MAAS_GATEWAY_URL = os.environ["MAAS_GATEWAY_URL"]
MAAS_SUBSCRIPTION = os.environ["MAAS_SUBSCRIPTION"]
AGENT_CONFIG_JSON = os.environ["AGENT_CONFIG_JSON"]
AGENT_OGX_MODEL_ID = os.environ["AGENT_OGX_MODEL_ID"]
AGENT_SYSTEM_PROMPT = os.environ.get("AGENT_SYSTEM_PROMPT", "")
# json.Marshal(nil) produces "null". Normalize both that value and an absent
# environment variable to an empty list so non-MCP deployments still rewrite
# Responses API requests with their configured model and system prompt.
MCP_SERVERS = json.loads(os.environ.get("AGENT_MCP_SERVERS_JSON", "[]")) or []
VECTOR_STORE_IDS = json.loads(os.environ.get("AGENT_VECTOR_STORE_IDS_JSON", "[]")) or []

_token_cache = {}


async def _get_maas_api_key(user_token: str) -> str:
    now = time.time()
    cached = _token_cache.get(user_token)
    if cached and cached[1] > now + 30:
        return cached[0]

    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.post(
            f"{MAAS_GATEWAY_URL}/v1/api-keys",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "name": f"agent-{int(now)}",
                "subscription": MAAS_SUBSCRIPTION,
                "ephemeral": True,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        key = data["key"]
        expires_at = now + 3600
        if expires_str := data.get("expiresAt"):
            try:
                dt = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
                expires_at = dt.timestamp()
            except Exception:
                pass
        _token_cache[user_token] = (key, expires_at)
        return key


class MaaSTokenMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope["headers"])
            auth = headers.get(b"authorization", b"").decode()
            user_token = auth.removeprefix("Bearer ").strip()

            if user_token:
                try:
                    api_key = await _get_maas_api_key(user_token)
                    provider_data = json.dumps({"openai_api_key": api_key}).encode()
                    scope = {**scope, "headers": [
                        *scope["headers"],
                        (b"x-ogx-provider-data", provider_data),
                    ]}
                except Exception as e:
                    print(f"[MaaSTokenMiddleware] token exchange failed: {e}")

        await self.app(scope, receive, send)


class AgentConfigMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["path"] == "/internal/agent_config":
            if scope["method"] != "GET":
                await self._send_json(send, 405, {"detail": "Method Not Allowed"})
                return

            auth = dict(scope["headers"]).get(b"authorization", b"").decode()
            if not auth.startswith("Bearer ") or not auth.removeprefix("Bearer ").strip():
                await self._send_json(send, 401, {"detail": "Unauthorized"})
                return
            try:
                await _get_maas_api_key(auth.removeprefix("Bearer ").strip())
            except Exception as e:
                print(f"[AgentConfigMiddleware] token validation failed: {e}")
                await self._send_json(send, 401, {"detail": "Unauthorized"})
                return

            body = AGENT_CONFIG_JSON.encode()
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                ],
            })
            await send({"type": "http.response.body", "body": body})
            return

        await self.app(scope, receive, send)

    async def _send_json(self, send, status, value):
        body = json.dumps(value).encode()
        await send({
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        })
        await send({"type": "http.response.body", "body": body})


class MCPServerMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST" or scope["path"] != "/v1/responses":
            await self.app(scope, receive, send)
            return

        body = b""
        more_body = True
        while more_body:
            message = await receive()
            body += message.get("body", b"")
            more_body = message.get("more_body", False)

        try:
            request = json.loads(body)
            # Agent deployments expose exactly one LLM. Do not let callers select
            # a different OGX model through the public Responses API.
            request["model"] = AGENT_OGX_MODEL_ID
            if AGENT_SYSTEM_PROMPT:
                # The deployment's resolved MLflow system message takes precedence over
                # caller-supplied instructions.
                request["instructions"] = AGENT_SYSTEM_PROMPT
            tools = request.get("tools", [])
            if not isinstance(tools, list):
                raise ValueError("tools must be an array")
            for server in MCP_SERVERS:
                tool = {
                    "type": "mcp",
                    "server_label": server["server_label"],
                    "server_url": server["server_url"],
                }
                if "allowed_tools" in server:
                    tool["allowed_tools"] = server["allowed_tools"]
                if auth_env_var := server.get("authorization_env_var"):
                    tool["authorization"] = os.environ[auth_env_var]
                tools.append(tool)
            if VECTOR_STORE_IDS:
                tools.append({
                    "type": "file_search",
                    "vector_store_ids": VECTOR_STORE_IDS,
                })
            request["tools"] = tools
            body = json.dumps(request).encode()
        except Exception as e:
            print(f"[MCPServerMiddleware] could not configure MCP tools: {e}")

        async def replay_receive():
            return {"type": "http.request", "body": body, "more_body": False}

        await self.app(scope, replay_receive, send)


for d in ["/opt/app-root/.llama/providers.d", "/opt/app-root/src/.llama/distributions/rh/files"]:
    os.makedirs(d, exist_ok=True)

os.environ.setdefault("OGX_CONFIG", "/etc/ogx/config.yaml")

ogx_app = create_app()
app = AgentConfigMiddleware(MCPServerMiddleware(MaaSTokenMiddleware(ogx_app)))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8321)
`

// GenerateWrapperAppScript returns the app.py content for the wrapper-app ConfigMap.
func GenerateWrapperAppScript() string {
	return wrapperAppScript
}
