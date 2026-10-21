const DEFAULT_API_KEY_VISIBLE_PREFIX_LENGTH = 7;

/** First characters of the key stay readable; the remainder is shown as bullets (matches CreateApiKeyModal). */
export const formatApiKeyHiddenPreview = (
  apiKey: string,
  visiblePrefixLength: number = DEFAULT_API_KEY_VISIBLE_PREFIX_LENGTH,
): string => {
  if (apiKey.length <= visiblePrefixLength) {
    return apiKey;
  }
  return `${apiKey.slice(0, visiblePrefixLength)}${'•'.repeat(apiKey.length - visiblePrefixLength)}`;
};

export const formatApiKeyError = (message: string): string => {
  const maxExpirationMatch = message.match(/exceeds maximum allowed \((\d+) days\)/);
  if (maxExpirationMatch) {
    return `Requested expiration exceeds maximum allowed (${maxExpirationMatch[1]} days). Select a shorter duration and try again.`;
  }
  return message.charAt(0).toUpperCase() + message.slice(1);
};

/** JS Date cannot represent arbitrarily large day offsets; cap the calendar UI. */
export const DATE_PICKER_MAX_DAYS = 100 * 365;

export const EXPIRATION_MODE_VALUES = ['onDate', 'after', 'max'] as const;

export type ExpirationMode = (typeof EXPIRATION_MODE_VALUES)[number];

export const isExpirationMode = (v: string | number | undefined): v is ExpirationMode =>
  EXPIRATION_MODE_VALUES.some((mode) => mode === v);

export const getExpirationModeLabel = (mode: ExpirationMode, maxDays: number): string => {
  switch (mode) {
    case 'max':
      return `Use max value of ${maxDays} days`;
    case 'onDate':
      return 'On date';
    case 'after':
      return 'After';
  }
};

export const formatDatePickerValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDatePickerValue = (value: string): Date | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Calendar-day difference (end - start), local dates. */
export const getCalendarDaysBetween = (start: Date, end: Date): number => {
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / (24 * 60 * 60 * 1000));
};

export const addCalendarDays = (from: Date, days: number): Date => {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  result.setDate(result.getDate() + days);
  return result;
};

export const startOfLocalDay = (date: Date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Max selectable calendar date: today + min(maxDays, DATE_PICKER_MAX_DAYS). */
export const getMaxSelectableExpirationDate = (maxDays: number, from: Date = new Date()): Date => {
  const cappedDays = Math.min(Math.max(maxDays, 1), DATE_PICKER_MAX_DAYS);
  return addCalendarDays(startOfLocalDay(from), cappedDays);
};

/** Min selectable date: tomorrow (at least 1 day of validity). */
export const getMinSelectableExpirationDate = (from: Date = new Date()): Date =>
  addCalendarDays(startOfLocalDay(from), 1);

/** Default "after N days" / on-date offset: tomorrow (1 day). */
export const DEFAULT_AFTER_DAYS = 1;

/** Default expiration date for "On date" mode (tomorrow). */
export const getDefaultExpirationDate = (from: Date = new Date()): Date =>
  addCalendarDays(startOfLocalDay(from), DEFAULT_AFTER_DAYS);

export const getExpiresInFromDays = (days: number): string => `${days}d`;

export const getExpirationDateValidationMessage = (
  maxDays: number,
  from: Date = new Date(),
): string => {
  const minDate = formatDatePickerValue(getMinSelectableExpirationDate(from));
  const effectiveMax = maxDays < 1 ? DATE_PICKER_MAX_DAYS : Math.min(maxDays, DATE_PICKER_MAX_DAYS);
  const maxDate = formatDatePickerValue(getMaxSelectableExpirationDate(effectiveMax, from));
  if (maxDays < 1) {
    return `Select a date on or after tomorrow (${minDate})`;
  }
  if (maxDays > DATE_PICKER_MAX_DAYS) {
    return `Select a date between tomorrow (${minDate}) and ${maxDate}, or use After / max value for longer expirations`;
  }
  return `Select a date between tomorrow (${minDate}) and ${maxDate}`;
};

export const getAfterDaysValidationMessage = (maxDays: number): string =>
  maxDays < 1 ? 'Enter a value of at least 1 day' : `Enter a value between 1 and ${maxDays} days`;

export const validateExpirationDate = (
  value: string,
  maxDays: number,
  from: Date = new Date(),
): string => {
  const date = parseDatePickerValue(value);
  if (!date) {
    return 'Enter a valid date (YYYY-MM-DD)';
  }
  const days = getCalendarDaysBetween(startOfLocalDay(from), date);
  const pickerMaxDays =
    maxDays < 1 ? DATE_PICKER_MAX_DAYS : Math.min(maxDays, DATE_PICKER_MAX_DAYS);
  if (days < 1 || days > pickerMaxDays) {
    return getExpirationDateValidationMessage(maxDays, from);
  }
  return '';
};

export const validateAfterDays = (value: string, maxDays: number): string => {
  const days = parseInt(value, 10);
  if (!value || !/^\d+$/.test(value) || days < 1) {
    return getAfterDaysValidationMessage(maxDays);
  }
  if (maxDays >= 1 && days > maxDays) {
    return getAfterDaysValidationMessage(maxDays);
  }
  return '';
};

export const formatExpirationLabel = (days: number, mode: ExpirationMode): string => {
  if (mode === 'max') {
    return `${days} days (maximum)`;
  }
  return `${days} days`;
};

export const getModelDocumentationUrl = (
  modelId: string,
  gatewayUrl: string,
): string | undefined => {
  try {
    const url = new URL(gatewayUrl);
    return `${url.origin}/v1/models/${modelId}/docs`;
  } catch {
    return undefined;
  }
};

export type FindMaaSModelBySubscriptionRefOptions = {
  /** Short subscription model-ref name (MaaSModelRef / CR name). */
  refName: string;
  refNamespace?: string;
  /** Catalog id from subscription `model_refs[].model_name` when present. */
  catalogModelId?: string;
  /** Subscription id header — used with catalog `subscriptions[].name`. */
  subscriptionId?: string;
};

type CatalogModelMatchFields = {
  id: string;
  owned_by?: string;
  subscriptions?: { name: string }[];
};

const ownedByMatchesRefName = (ownedBy: string | undefined, refName: string): boolean => {
  if (!ownedBy || !refName) {
    return false;
  }
  return ownedBy === refName || ownedBy.endsWith(`/${refName}`);
};

/**
 * Resolve a MaaS catalog model from a subscription model-ref.
 * Prefer catalog id (`model_name`) and owned_by / subscription membership —
 * path-style catalog ids (e.g. publishers/llm/models/Qwen/Qwen2.5-0.5B-Instruct)
 * often do not share a last segment with the short ref name (qwen2-5-0-5b-instruct).
 */
export const findMaaSModelBySubscriptionRef = <T extends CatalogModelMatchFields>(
  models: T[],
  options: FindMaaSModelBySubscriptionRefOptions,
): T | undefined => {
  const { refName, refNamespace, catalogModelId, subscriptionId } = options;
  if (!refName && !catalogModelId) {
    return undefined;
  }

  if (catalogModelId) {
    const byCatalogId = models.find((model) => model.id === catalogModelId);
    if (byCatalogId) {
      return byCatalogId;
    }
  }

  if (!refName) {
    return undefined;
  }

  const exact = models.find((model) => model.id === refName);
  if (exact) {
    return exact;
  }

  if (refNamespace) {
    const byPublisherPath = models.find(
      (model) =>
        model.id === `publishers/${refNamespace}/models/${refName}` ||
        model.id.endsWith(`/${refNamespace}/models/${refName}`),
    );
    if (byPublisherPath) {
      return byPublisherPath;
    }
  }

  // Prefer exact namespace/name owned_by. Never take the first name-only hit across
  // namespaces (team-a/qwen vs team-b/qwen). Ambiguous short-name matches → skip.
  if (refNamespace) {
    const byOwnedByExact = models.find((model) => model.owned_by === `${refNamespace}/${refName}`);
    if (byOwnedByExact) {
      return byOwnedByExact;
    }
  } else {
    const ownedByMatches = models.filter((model) => ownedByMatchesRefName(model.owned_by, refName));
    if (ownedByMatches.length === 1) {
      return ownedByMatches[0];
    }
  }

  if (subscriptionId) {
    const entitled = models.filter((model) =>
      model.subscriptions?.some((sub) => sub.name === subscriptionId),
    );
    if (entitled.length === 1) {
      return entitled[0];
    }
  }

  return models.find(
    (model) => model.id.endsWith(`/models/${refName}`) || model.id.split('/').pop() === refName,
  );
};

export enum ApiKeyUsageExampleKind {
  Chat = 'chat',
  Embedding = 'embedding',
  Transcription = 'transcription',
}

const API_KEY_USAGE_ENDPOINT_SUFFIX: Record<ApiKeyUsageExampleKind, string> = {
  [ApiKeyUsageExampleKind.Chat]: 'chat/completions',
  [ApiKeyUsageExampleKind.Embedding]: 'embeddings',
  [ApiKeyUsageExampleKind.Transcription]: 'audio/transcriptions',
};

const CAPABILITY_TEXT_GENERATION = 'text-generation';
const CAPABILITY_AUDIO_TRANSCRIPTION = 'audio-transcription';
const EMBEDDING_CAPABILITIES = new Set(['text-embedding', 'embeddings', 'embedding']);

/**
 * Resolve curl example kind from MaaS modelCapabilities
 * (opendatahub.io/model-capabilities on the model).
 */
export const resolveApiKeyUsageExampleKind = (capabilities?: string[]): ApiKeyUsageExampleKind => {
  const caps = capabilities ?? [];
  if (caps.some((cap) => EMBEDDING_CAPABILITIES.has(cap))) {
    return ApiKeyUsageExampleKind.Embedding;
  }
  const hasAsr = caps.includes(CAPABILITY_AUDIO_TRANSCRIPTION);
  const hasTextGen = caps.includes(CAPABILITY_TEXT_GENERATION);
  if (hasAsr && !hasTextGen) {
    return ApiKeyUsageExampleKind.Transcription;
  }
  return ApiKeyUsageExampleKind.Chat;
};

export const getApiKeyUsageExampleEndpointPath = (kind: ApiKeyUsageExampleKind): string =>
  `/v1/${API_KEY_USAGE_ENDPOINT_SUFFIX[kind]}`;

/** OpenAI-compatible curl example for the created API key (Access details). */
export const buildApiKeyUsageExample = (
  baseURL: string | undefined,
  modelID: string,
  apiKey: string,
  kind: ApiKeyUsageExampleKind = ApiKeyUsageExampleKind.Chat,
): string => {
  if (!baseURL || !modelID || !apiKey) {
    return '';
  }

  try {
    const requestURL = new URL(baseURL);
    if (requestURL.protocol !== 'http:' && requestURL.protocol !== 'https:') {
      return '';
    }

    requestURL.search = '';
    requestURL.hash = '';
    const basePath = requestURL.pathname.replace(/\/$/, '');
    const apiVersionPath = basePath.endsWith('/v1') ? basePath : `${basePath}/v1`;
    requestURL.pathname = `${apiVersionPath}/${API_KEY_USAGE_ENDPOINT_SUFFIX[kind]}`;

    const escapeDoubleQuotedShell = (value: string): string =>
      value
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('$', '\\$')
        .replaceAll('`', '\\`');

    const shellSafeKey = escapeDoubleQuotedShell(apiKey);
    const shellSafeModelId = escapeDoubleQuotedShell(modelID);
    const requestURLString = requestURL.toString();
    const authHeader = '  -H "Authorization: Bearer $API_KEY" \\';

    if (kind === ApiKeyUsageExampleKind.Transcription) {
      return [
        `export API_KEY="${shellSafeKey}"`,
        '',
        `curl -X POST ${requestURLString} \\`,
        authHeader,
        '  -F "file=@<path-to-audio-file>" \\',
        `  -F "model=${shellSafeModelId}"`,
      ].join('\n');
    }

    const requestBody =
      kind === ApiKeyUsageExampleKind.Embedding
        ? { model: modelID, input: 'Hello' }
        : { model: modelID, messages: [{ role: 'user', content: 'Hello' }] };
    const shellSafeBody = JSON.stringify(requestBody).replaceAll("'", "'\"'\"'");

    return [
      `export API_KEY="${shellSafeKey}"`,
      `curl -X POST ${requestURLString} \\`,
      '  -H "Content-Type: application/json" \\',
      authHeader,
      `  -d '${shellSafeBody}'`,
    ].join('\n');
  } catch {
    return '';
  }
};
