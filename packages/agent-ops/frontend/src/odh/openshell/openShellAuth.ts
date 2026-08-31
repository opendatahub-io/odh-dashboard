import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { openShellProviderPath } from '~/app/utilities/routes';

/**
 * Browser-side OpenShell (Token B) authentication for the RHOAI double-auth
 * pattern. OpenShell is a *separate* service: the user's RHOAI/OpenShift token
 * (Token A) authorizes namespace agent CRs, but OpenShell requires its own OIDC
 * JWT (Token B) validated by the gateway's JWKS.
 *
 * With a shared Keycloak, Token B is obtained *silently* (prompt=none) using the
 * existing SSO session — zero extra login pages. This module owns that flow and
 * hands the token to the OpenShell package via setAuthTokenGetter. The BFF's
 * GET /openshell/auth/config supplies the (non-secret) Keycloak client details.
 */

export type OpenShellConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'unconfigured';

export type OpenShellConnectionState = {
  status: OpenShellConnectionStatus;
  username: string | null;
  error: string | null;
};

type OpenShellAuthConfig = {
  configured: boolean;
  // When true, OpenShell shares the dashboard IdP so Token B can be obtained via
  // silent OIDC (prompt=none). When false (default), OpenShell is a separate
  // provider requiring an explicit sign-in.
  sharedSession?: boolean;
  issuer?: string;
  clientId?: string;
  audience?: string;
  scope?: string;
};

// Emitted by the OpenShell package's session-expired handler (see
// OpenShellProviders) so the OpenShell area can reconnect inline without tearing
// down the RHOAI context. Defined here to keep it a dependency-free shared const.
export const OPENSHELL_SESSION_EXPIRED_EVENT = 'openshell:session-expired';

// Dedicated request header that carries Token B from the browser to the
// agent-ops BFF proxy. RHOAI's data-science-gateway ext-authz (kube-auth-proxy)
// rewrites `Authorization` and `x-forwarded-access-token` to the platform's own
// OpenShift token, so Token B cannot ride either — it travels on this custom
// header (passed through untouched) and the BFF translates it into the relay's
// x-forwarded-access-token. Must match OpenShellAuthHeader in openshell_handler.go.
export const OPENSHELL_AUTH_HEADER = 'X-OpenShell-Authorization';

// Native agent-sandbox CRs (RHOAI login / Token A) — a separate, less first-class
// view of sandboxes in the user's own projects, reached from a top-right link.

// App routes the SPA registers to complete the OIDC redirect / silent-renew.
// Intentionally OUTSIDE the /openshell/* prefix (which is reverse-proxied to the
// BFF) so these resolve as SPA routes. Register both as redirect URIs in Keycloak.
const AGENTS_ROOT = '/ai-hub/agents';
const OPENSHELL_HOME = openShellProviderPath;
export const OIDC_CALLBACK_PATH = `${AGENTS_ROOT}/oidc/callback`;
export const OIDC_SILENT_CALLBACK_PATH = `${AGENTS_ROOT}/oidc/silent-callback`;

let managerPromise: Promise<UserManager | null> | null = null;
// Whether OpenShell shares the dashboard IdP (silent SSO possible). Default
// false: OpenShell is a separate provider requiring an explicit sign-in.
let sharedSession = false;
let state: OpenShellConnectionState = { status: 'idle', username: null, error: null };
const listeners = new Set<(s: OpenShellConnectionState) => void>();

const setState = (next: Partial<OpenShellConnectionState>): void => {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
};

export const getOpenShellConnectionState = (): OpenShellConnectionState => state;

export const subscribeOpenShellConnection = (
  listener: (s: OpenShellConnectionState) => void,
): (() => void) => {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
};

const firstStringClaim = (claims: object, names: string[]): string | null => {
  for (const name of names) {
    const value = Reflect.get(claims, name);
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  return null;
};

const usernameOf = (user: User | null): string | null =>
  user?.profile ? firstStringClaim(user.profile, ['preferred_username', 'name', 'email']) : null;

const fetchAuthConfig = async (): Promise<OpenShellAuthConfig> => {
  try {
    const res = await fetch('/openshell/auth/config', { credentials: 'same-origin' });
    if (!res.ok) {
      return { configured: false };
    }
    const config: unknown = await res.json();
    if (!config || typeof config !== 'object') {
      return { configured: false };
    }
    return {
      configured: Reflect.get(config, 'configured') === true,
      sharedSession:
        typeof Reflect.get(config, 'sharedSession') === 'boolean'
          ? Reflect.get(config, 'sharedSession')
          : undefined,
      issuer:
        typeof Reflect.get(config, 'issuer') === 'string'
          ? Reflect.get(config, 'issuer')
          : undefined,
      clientId:
        typeof Reflect.get(config, 'clientId') === 'string'
          ? Reflect.get(config, 'clientId')
          : undefined,
      audience:
        typeof Reflect.get(config, 'audience') === 'string'
          ? Reflect.get(config, 'audience')
          : undefined,
      scope:
        typeof Reflect.get(config, 'scope') === 'string' ? Reflect.get(config, 'scope') : undefined,
    };
  } catch {
    return { configured: false };
  }
};

const buildManager = async (): Promise<UserManager | null> => {
  const cfg = await fetchAuthConfig();
  if (!cfg.configured || !cfg.issuer || !cfg.clientId) {
    setState({ status: 'unconfigured' });
    return null;
  }
  sharedSession = cfg.sharedSession ?? false;
  const { origin } = window.location;
  const manager = new UserManager({
    authority: cfg.issuer,
    client_id: cfg.clientId,
    redirect_uri: `${origin}${OIDC_CALLBACK_PATH}`,
    silent_redirect_uri: `${origin}${OIDC_SILENT_CALLBACK_PATH}`,
    post_logout_redirect_uri: origin,
    response_type: 'code',
    scope: cfg.scope || 'openid profile',
    // Request the OpenShell gateway audience so the minted access token (Token B)
    // is accepted by the gateway's JWKS validation.
    extraQueryParams: cfg.audience ? { audience: cfg.audience } : undefined,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: true,
    monitorSession: false,
  });
  manager.events.addUserLoaded((user) =>
    setState({ status: 'connected', username: usernameOf(user), error: null }),
  );
  manager.events.addUserUnloaded(() => setState({ status: 'disconnected', username: null }));
  manager.events.addSilentRenewError((e) => setState({ status: 'error', error: e.message }));
  return manager;
};

const getManager = (): Promise<UserManager | null> => {
  if (!managerPromise) {
    managerPromise = buildManager();
  }
  return managerPromise;
};

// LOCAL DEV ONLY: on localhost, allow reusing a Token B pasted into
// localStorage('openshell-dev-token') instead of running the OIDC redirect flow
// (which would need Dex localhost redirect URIs). Hard-gated to hostname
// 'localhost' so it can NEVER be used in a deployed dashboard.
const getDevToken = (): string | null => {
  if (typeof window === 'undefined' || window.location.hostname !== 'localhost') {
    return null;
  }
  try {
    return window.localStorage.getItem('openshell-dev-token');
  } catch {
    return null;
  }
};

const usernameFromDevToken = (token: string): string | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const claims: unknown = JSON.parse(window.atob(padded));
    if (claims && typeof claims === 'object') {
      return firstStringClaim(claims, ['preferred_username', 'name', 'email', 'sub']);
    }
  } catch {
    // The localhost escape hatch also permits opaque tokens. In that case the
    // UI uses a generic development identity rather than failing connection.
  }
  return null;
};

/**
 * Per-request token provider for setAuthTokenGetter. Returns a fresh Token B.
 * An expired-but-resumable session is refreshed via its refresh token (works for
 * a separate provider too). With no session it only attempts silent SSO when the
 * IdP is shared; otherwise it returns null and the user must explicitly connect.
 */
export const getOpenShellToken = async (): Promise<string | null> => {
  const devToken = getDevToken();
  if (devToken) {
    return devToken;
  }
  const manager = await getManager();
  if (!manager) {
    return null;
  }
  let user = await manager.getUser();
  if (user && !user.expired) {
    return user.access_token;
  }

  if (user) {
    // Expired but resumable — refresh silently via the refresh token.
    try {
      user = await manager.signinSilent();
    } catch {
      setState({ status: 'disconnected', username: null });
      return null;
    }
  } else if (sharedSession) {
    // No session, but a shared IdP allows silent SSO (prompt=none).
    try {
      setState({ status: 'connecting' });
      user = await manager.signinSilent();
    } catch {
      setState({ status: 'disconnected' });
      return null;
    }
  } else {
    // Separate provider: no implicit session — require an explicit connect.
    return null;
  }

  if (user) {
    setState({ status: 'connected', username: usernameOf(user), error: null });
  }
  return user?.access_token ?? null;
};

/**
 * Establish connection state on mount WITHOUT forcing a login: resume an
 * existing session, try silent SSO only when the IdP is shared, otherwise leave
 * disconnected so the connect gate is shown (explicit double-auth sign-in).
 */
export const initOpenShellConnection = async (): Promise<void> => {
  const devToken = getDevToken();
  if (devToken) {
    setState({
      status: 'connected',
      username: usernameFromDevToken(devToken) ?? 'dev',
      error: null,
    });
    return;
  }
  const manager = await getManager();
  if (!manager) {
    return; // 'unconfigured' already set
  }
  const user = await manager.getUser();
  if (user && !user.expired) {
    setState({ status: 'connected', username: usernameOf(user), error: null });
    return;
  }
  if (user || sharedSession) {
    await getOpenShellToken(); // resume via refresh token, or silent SSO
    return;
  }
  setState({ status: 'disconnected', username: null });
};

/**
 * Interactive connect. For a shared IdP, try silent first (may be zero-click);
 * for a separate provider, go straight to the explicit redirect sign-in.
 */
export const connectOpenShell = async (): Promise<void> => {
  const manager = await getManager();
  if (!manager) {
    return;
  }
  setState({ status: 'connecting' });
  if (sharedSession) {
    try {
      const user = await manager.signinSilent();
      if (user) {
        setState({ status: 'connected', username: usernameOf(user), error: null });
        return;
      }
    } catch {
      // fall through to interactive redirect
    }
  }
  await manager.signinRedirect();
};

export const disconnectOpenShell = async (): Promise<void> => {
  const manager = await getManager();
  if (!manager) {
    return;
  }
  await manager.removeUser();
  setState({ status: 'disconnected', username: null });
};

export const isOpenShellCallbackPath = (pathname: string): boolean =>
  pathname === OIDC_CALLBACK_PATH || pathname === OIDC_SILENT_CALLBACK_PATH;

/** Completes the OIDC redirect / silent-renew when the app loads on a callback route. */
export const handleOpenShellCallback = async (): Promise<void> => {
  const manager = await getManager();
  if (!manager) {
    return;
  }
  if (window.location.pathname === OIDC_SILENT_CALLBACK_PATH) {
    await manager.signinSilentCallback();
    return;
  }
  await manager.signinCallback();
  window.location.replace(OPENSHELL_HOME);
};
