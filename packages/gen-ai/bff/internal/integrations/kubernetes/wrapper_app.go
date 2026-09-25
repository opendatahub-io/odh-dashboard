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
const wrapperAppScript = `import asyncio
import os, json, time
from datetime import datetime, timezone
import httpx
import uvicorn
from ogx.core.server.server import create_app

MAAS_GATEWAY_URL = os.environ["MAAS_GATEWAY_URL"]
MAAS_SUBSCRIPTION = os.environ["MAAS_SUBSCRIPTION"]
AGENT_CONFIG_JSON = os.environ["AGENT_CONFIG_JSON"]
AGENT_OGX_MODEL_ID = os.environ["AGENT_OGX_MODEL_ID"]
AGENT_MODEL_SOURCE_TYPE = os.environ.get("AGENT_MODEL_SOURCE_TYPE", "")
AGENT_SYSTEM_PROMPT = os.environ.get("AGENT_SYSTEM_PROMPT", "")
# json.Marshal(nil) produces "null". Normalize both that value and an absent
# environment variable to an empty list so non-MCP deployments still rewrite
# Responses API requests with their configured model and system prompt.
MCP_SERVERS = json.loads(os.environ.get("AGENT_MCP_SERVERS_JSON", "[]")) or []
VECTOR_STORE_IDS = json.loads(os.environ.get("AGENT_VECTOR_STORE_IDS_JSON", "[]")) or []

_token_cache = {}
_token_locks = {}
MAX_TOKEN_CACHE_ENTRIES = 1024
MAAS_HTTP_CLIENT = httpx.AsyncClient()


def _get_cached_maas_api_key(user_token: str, now: float) -> str | None:
    cached = _token_cache.get(user_token)
    if cached and cached[1] > now + 30:
        return cached[0]
    return None


def _cache_maas_api_key(user_token: str, api_key: str, expires_at: float, now: float):
    for token, (_, expiry) in list(_token_cache.items()):
        if expiry <= now:
            del _token_cache[token]

    while len(_token_cache) >= MAX_TOKEN_CACHE_ENTRIES:
        oldest_token = min(_token_cache, key=lambda token: _token_cache[token][1])
        del _token_cache[oldest_token]

    _token_cache[user_token] = (api_key, expires_at)


async def _send_json(send, status: int, value: dict):
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


async def _get_maas_api_key(user_token: str) -> str:
    now = time.time()
    if cached := _get_cached_maas_api_key(user_token, now):
        return cached

    lock = _token_locks.setdefault(user_token, asyncio.Lock())
    try:
        async with lock:
            now = time.time()
            if cached := _get_cached_maas_api_key(user_token, now):
                return cached

            resp = await MAAS_HTTP_CLIENT.post(
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
            _cache_maas_api_key(user_token, key, expires_at, now)
            return key
    finally:
        if not lock.locked() and _token_locks.get(user_token) is lock:
            del _token_locks[user_token]


class MaaSTokenMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope["headers"])
            auth = headers.get(b"authorization", b"").decode()
            if not auth.startswith("Bearer ") or not (user_token := auth.removeprefix("Bearer ").strip()):
                await _send_json(send, 401, {"detail": "Unauthorized"})
                return
            sanitized_headers = [
                *(header for header in scope["headers"] if header[0].lower() != b"x-ogx-provider-data"),
            ]
            if AGENT_MODEL_SOURCE_TYPE == "maas":
                try:
                    api_key = await _get_maas_api_key(user_token)
                except Exception as e:
                    print(f"[MaaSTokenMiddleware] token exchange failed: {e}")
                    await _send_json(send, 401, {"detail": "Unauthorized"})
                    return
                provider_data = json.dumps({"openai_api_key": api_key}).encode()
                sanitized_headers.append((b"x-ogx-provider-data", provider_data))
            elif AGENT_MODEL_SOURCE_TYPE == "custom_endpoint":
                try:
                    provider_data = json.dumps({"openai_api_key": os.environ["AGENT_MODEL_API_KEY"]}).encode()
                except KeyError:
                    await _send_json(send, 500, {"detail": "Custom endpoint credentials are not configured"})
                    return
                sanitized_headers.append((b"x-ogx-provider-data", provider_data))
            elif AGENT_MODEL_SOURCE_TYPE == "namespace":
                provider_data = json.dumps({"openai_api_key": user_token}).encode()
                sanitized_headers.append((b"x-ogx-provider-data", provider_data))
            scope = {**scope, "headers": sanitized_headers}

        await self.app(scope, receive, send)


class AgentConfigMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["path"] == "/internal/agent_config":
            if scope["method"] != "GET":
                await _send_json(send, 405, {"detail": "Method Not Allowed"})
                return

            auth = dict(scope["headers"]).get(b"authorization", b"").decode()
            if not auth.startswith("Bearer ") or not auth.removeprefix("Bearer ").strip():
                await _send_json(send, 401, {"detail": "Unauthorized"})
                return
            try:
                await _get_maas_api_key(auth.removeprefix("Bearer ").strip())
            except Exception as e:
                print(f"[AgentConfigMiddleware] token validation failed: {e}")
                await _send_json(send, 401, {"detail": "Unauthorized"})
                return

            await _send_json(send, 200, json.loads(AGENT_CONFIG_JSON))
            return

        await self.app(scope, receive, send)


class MCPServerMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST" or scope["path"] != "/v1/responses":
            await self.app(scope, receive, send)
            return

        chunks = []
        body_size = 0
        more_body = True
        while more_body:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            body_size += len(chunk)
            if body_size > 20 * 1024 * 1024:
                await _send_json(send, 413, {"detail": "Request body too large"})
                return
            chunks.append(chunk)
            more_body = message.get("more_body", False)
        body = b"".join(chunks)

        try:
            request = json.loads(body)
        except (json.JSONDecodeError, TypeError):
            await _send_json(send, 400, {"detail": "Request body must be a JSON object"})
            return
        if not isinstance(request, dict):
            await _send_json(send, 400, {"detail": "Request body must be a JSON object"})
            return

        try:
            # Agent deployments expose exactly one LLM. Do not let callers select
            # a different OGX model through the public Responses API.
            request["model"] = AGENT_OGX_MODEL_ID
            if AGENT_SYSTEM_PROMPT:
                # The deployment's resolved MLflow system message takes precedence over
                # caller-supplied instructions.
                request["instructions"] = AGENT_SYSTEM_PROMPT
            tools = request.get("tools")
            if tools is None:
                tools = []
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
            await _send_json(send, 500, {"detail": "Unable to configure agent tools"})
            return

        async def replay_receive():
            return {"type": "http.request", "body": body, "more_body": False}

        await self.app(scope, replay_receive, send)


for d in ["/opt/app-root/.llama/providers.d", "/opt/app-root/src/.llama/distributions/rh/files"]:
    os.makedirs(d, exist_ok=True)

os.environ.setdefault("OGX_CONFIG", "/etc/ogx/config.yaml")

ogx_app = create_app()
app = AgentConfigMiddleware(MaaSTokenMiddleware(MCPServerMiddleware(ogx_app)))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8321)
`

// GenerateWrapperAppScript returns the app.py content for the wrapper-app ConfigMap.
func GenerateWrapperAppScript() string {
	return wrapperAppScript
}
