// This page is a temporary placeholder used only to verify BFF connectivity during development.
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Divider,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  MenuToggleElement,
  Popover,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Stack,
  StackItem,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useNamespaceSelector } from 'mod-arch-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import {
  MlflowExperimentSelector,
  type MlflowExperiment,
  type MlflowSelectorStatus,
} from '@odh-dashboard/internal/concepts/mlflow';
import { getGlobalMLflowNamespaces, updateGlobalMLflowNamespaces } from '~/app/api/k8s';
import { useAppContext } from '~/app/context/AppContext';
import { URL_PREFIX, WORKSPACE_PARAM } from '~/app/utilities/const';

type InlineFeedback = {
  variant: React.ComponentProps<typeof Alert>['variant'];
  title: string;
  description?: string;
};

type PromptAction = 'list' | 'load' | 'create' | 'versions' | 'deletePrompt' | 'deleteVersion';
type ResponseTabKey = 'prettified' | 'raw';
type RegisterContentMode = 'template' | 'messages';

type PromptRequest = {
  action: PromptAction;
  method: 'GET' | 'POST' | 'DELETE';
  url: string;
  body?: unknown;
};

type PromptErrorEnvelope = {
  code: string;
  message: string;
};

type PromptListRow = {
  name: string;
  description: string;
  latestVersion: number;
  scopeType: 'project' | 'global' | 'unknown';
  namespace: string;
  createdAt: string;
};

type PromptVersionDetail = {
  name: string;
  version: number;
  contentType: 'template' | 'messages' | 'unknown';
  template?: string;
  messages?: { role: string; content: string }[];
  commitMessage?: string;
  aliases: string[];
  tags: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

type PromptVersionMetaRow = {
  version: number;
  commitMessage?: string;
  aliases: string[];
  tags: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

type PromptListCounts = {
  projectCount: number;
  globalCount: number;
  failedNamespacesCount: number;
  failedNamespaces: string[];
};

type PromptRequestResult = {
  ok: boolean;
  action: PromptAction;
  method: string;
  url: string;
  status: number;
  statusText: string;
  rawBody: string;
  parsedJson?: unknown;
  errorEnvelope?: PromptErrorEnvelope;
  message: string;
  listRows?: PromptListRow[];
  listCounts?: PromptListCounts;
  versionDetail?: PromptVersionDetail;
  versionRows?: PromptVersionMetaRow[];
  nextPageToken?: string;
};

type TagRow = {
  id: number;
  key: string;
  value: string;
};

type JsonBuildResult = {
  ok: boolean;
  body?: unknown;
  error?: string;
};

type FetchTextResult = {
  route: string;
  ok: boolean;
  status: number;
  statusText: string;
  contentType: string;
  text: string;
  networkError?: string;
};

type ParsedRouteResponse = {
  ok: boolean;
  json?: unknown;
  rawBody: string;
  error?: string;
};

const ACTION_LABELS: Record<PromptAction, string> = {
  list: 'GET /api/v1/prompts — List prompts',
  load: 'GET /api/v1/prompts/{name} — Load prompt',
  create: 'POST /api/v1/prompts — Create or update prompt',
  versions: 'GET /api/v1/prompts/{name}/versions — List versions',
  deletePrompt: 'DELETE /api/v1/prompts/{name} — Delete prompt',
  deleteVersion: 'DELETE /api/v1/prompts/{name}/versions/{version} — Delete version',
};

const PROMPT_ACTION_OPTIONS: { value: PromptAction; label: string }[] = [
  { value: 'list', label: ACTION_LABELS.list },
  { value: 'load', label: ACTION_LABELS.load },
  { value: 'create', label: ACTION_LABELS.create },
  { value: 'versions', label: ACTION_LABELS.versions },
  { value: 'deletePrompt', label: ACTION_LABELS.deletePrompt },
  { value: 'deleteVersion', label: ACTION_LABELS.deleteVersion },
];

const CONTENT_MODE_LABELS: Record<RegisterContentMode, string> = {
  template: 'Template',
  messages: 'Messages JSON',
};

const PROMPTS_BASE_PATH = `${URL_PREFIX}/api/v1/prompts`;

const CONTROL_WIDTH_PX = 280;
const SMALL_INPUT_WIDTH_PX = 120;
const TEXTAREA_WIDTH_PX = 640;
const TEXTAREA_HEIGHT_PX = 160;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPromptActionValue = (value: string | number | undefined): value is PromptAction =>
  value === 'list' ||
  value === 'load' ||
  value === 'create' ||
  value === 'versions' ||
  value === 'deletePrompt' ||
  value === 'deleteVersion';

const isResponseTabKey = (value: string): value is ResponseTabKey =>
  value === 'prettified' || value === 'raw';

const isRegisterContentMode = (value: string | number | undefined): value is RegisterContentMode =>
  value === 'template' || value === 'messages';

const actionNeedsName = (action: PromptAction): boolean =>
  action === 'load' ||
  action === 'versions' ||
  action === 'deletePrompt' ||
  action === 'deleteVersion';

const actionNeedsVersion = (action: PromptAction): boolean => action === 'deleteVersion';

const isPostAction = (action: PromptAction): boolean => action === 'create';

const unwrapDataEnvelope = (value: unknown): unknown => {
  if (isRecord(value) && 'data' in value) {
    return value.data;
  }
  return value;
};

const parseJsonText = (value: string): { ok: boolean; json?: unknown; error?: string } => {
  try {
    return { ok: true, json: JSON.parse(value) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON payload',
    };
  }
};

const formatDateTime = (timestamp?: string): string => {
  if (!timestamp) {
    return '-';
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }
  return parsed.toLocaleString();
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (!isRecord(error)) {
    return fallback;
  }
  const { response, message } = error;
  if (isRecord(response) && isRecord(response.data)) {
    if (typeof response.data.error === 'string' && response.data.error) {
      return response.data.error;
    }
    if (typeof response.data.message === 'string' && response.data.message) {
      return response.data.message;
    }
  }
  if (typeof message === 'string' && message) {
    return message;
  }
  return fallback;
};

const extractResponseErrorEnvelope = (value: unknown): PromptErrorEnvelope | undefined => {
  const payload = unwrapDataEnvelope(value);
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.code === 'string' && typeof payload.message === 'string') {
    return { code: payload.code, message: payload.message };
  }

  if (isRecord(payload.error)) {
    if (typeof payload.error.code === 'string' && typeof payload.error.message === 'string') {
      return { code: payload.error.code, message: payload.error.message };
    }
  }

  return undefined;
};

const extractFailedNamespaces = (value: unknown): string[] => {
  const payload = unwrapDataEnvelope(value);
  if (!isRecord(payload) || !Array.isArray(payload.failed_namespaces)) {
    return [];
  }
  return payload.failed_namespaces.filter((item): item is string => typeof item === 'string');
};

const extractPromptListRows = (value: unknown): PromptListRow[] => {
  const payload = unwrapDataEnvelope(value);
  if (!isRecord(payload) || !Array.isArray(payload.prompts)) {
    return [];
  }

  return payload.prompts.flatMap((prompt): PromptListRow[] => {
    if (!isRecord(prompt)) {
      return [];
    }
    if (typeof prompt.name !== 'string' || typeof prompt.latest_version !== 'number') {
      return [];
    }
    let scopeType: PromptListRow['scopeType'] = 'unknown';
    let namespace = '-';
    if (isRecord(prompt.scope)) {
      if (prompt.scope.type === 'project' || prompt.scope.type === 'global') {
        scopeType = prompt.scope.type;
      }
      if (typeof prompt.scope.namespace === 'string') {
        namespace = prompt.scope.namespace;
      }
    }

    return [
      {
        name: prompt.name,
        description: typeof prompt.description === 'string' ? prompt.description : '',
        latestVersion: prompt.latest_version,
        scopeType,
        namespace,
        createdAt: typeof prompt.creation_timestamp === 'string' ? prompt.creation_timestamp : '',
      },
    ];
  });
};

const getPromptListCounts = (rows: PromptListRow[], value: unknown): PromptListCounts => {
  const projectCount = rows.filter((row) => row.scopeType === 'project').length;
  const globalCount = rows.filter((row) => row.scopeType === 'global').length;
  const failedNamespaces = extractFailedNamespaces(value);
  return {
    projectCount,
    globalCount,
    failedNamespacesCount: failedNamespaces.length,
    failedNamespaces,
  };
};

const toStringMap = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }
  const output: Record<string, string> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (typeof entryValue === 'string') {
      output[key] = entryValue;
    }
  });
  return output;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const extractPromptVersionDetail = (value: unknown): PromptVersionDetail | undefined => {
  const payload = unwrapDataEnvelope(value);
  if (!isRecord(payload)) {
    return undefined;
  }
  if (typeof payload.name !== 'string' || typeof payload.version !== 'number') {
    return undefined;
  }

  let contentType: PromptVersionDetail['contentType'] = 'unknown';
  if (typeof payload.template === 'string') {
    contentType = 'template';
  } else if (Array.isArray(payload.messages)) {
    contentType = 'messages';
  }

  const messages = Array.isArray(payload.messages)
    ? payload.messages.flatMap((message) => {
        if (!isRecord(message)) {
          return [];
        }
        if (typeof message.role !== 'string' || typeof message.content !== 'string') {
          return [];
        }
        return [{ role: message.role, content: message.content }];
      })
    : undefined;

  return {
    name: payload.name,
    version: payload.version,
    contentType,
    template: typeof payload.template === 'string' ? payload.template : undefined,
    messages,
    commitMessage: typeof payload.commit_message === 'string' ? payload.commit_message : undefined,
    aliases: toStringArray(payload.aliases),
    tags: toStringMap(payload.tags),
    createdAt: typeof payload.created_at === 'string' ? payload.created_at : undefined,
    updatedAt: typeof payload.updated_at === 'string' ? payload.updated_at : undefined,
  };
};

const extractPromptVersionRows = (
  value: unknown,
): {
  rows: PromptVersionMetaRow[];
  nextPageToken?: string;
} => {
  const payload = unwrapDataEnvelope(value);
  if (!isRecord(payload) || !Array.isArray(payload.versions)) {
    return { rows: [] };
  }

  const rows = payload.versions.flatMap((version): PromptVersionMetaRow[] => {
    if (!isRecord(version) || typeof version.version !== 'number') {
      return [];
    }

    return [
      {
        version: version.version,
        commitMessage:
          typeof version.commit_message === 'string' ? version.commit_message : undefined,
        aliases: toStringArray(version.aliases),
        tags: toStringMap(version.tags),
        createdAt: typeof version.created_at === 'string' ? version.created_at : undefined,
        updatedAt: typeof version.updated_at === 'string' ? version.updated_at : undefined,
      },
    ];
  });

  return {
    rows,
    nextPageToken:
      typeof payload.next_page_token === 'string' ? payload.next_page_token : undefined,
  };
};

const extractGlobalMLflowNamespaces = (value: unknown): string[] => {
  const payload = unwrapDataEnvelope(value);
  if (!isRecord(payload) || !isRecord(payload.spec)) {
    return [];
  }
  if (!Array.isArray(payload.spec.globalMLflowNamespaces)) {
    return [];
  }
  return payload.spec.globalMLflowNamespaces.filter(
    (item): item is string => typeof item === 'string',
  );
};

const extractDashboardConfigNamespace = (value: unknown): string | undefined => {
  const payload = unwrapDataEnvelope(value);
  if (!isRecord(payload) || !isRecord(payload.metadata)) {
    return undefined;
  }
  return typeof payload.metadata.namespace === 'string' ? payload.metadata.namespace : undefined;
};

const getDashboardConfigHtmlErrorMessage = (route: string): string =>
  `Dashboard config API is unavailable in this environment (received HTML from ${route}).`;

const isHtmlResponse = (contentType: string, body: string): boolean => {
  const loweredType = contentType.toLowerCase();
  const loweredBody = body.trim().toLowerCase();
  return (
    loweredType.includes('text/html') ||
    loweredBody.startsWith('<!doctype html') ||
    loweredBody.startsWith('<html')
  );
};

const parseNamespaceList = (value: string): string[] => {
  const uniqueNamespaces = new Set<string>();
  value
    .split(/[\n,]/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .forEach((entry) => uniqueNamespaces.add(entry));
  return Array.from(uniqueNamespaces);
};

const fetchTextResponse = async (route: string, init?: RequestInit): Promise<FetchTextResult> => {
  try {
    const response = await fetch(route, init);
    return {
      route,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type') ?? '',
      text: await response.text(),
    };
  } catch (error) {
    return {
      route,
      ok: false,
      status: 0,
      statusText: 'Network error',
      contentType: '',
      text: '',
      networkError: toErrorMessage(error, 'Request failed'),
    };
  }
};

const parseDashboardRouteResponse = (response: FetchTextResult): ParsedRouteResponse => {
  if (response.networkError) {
    return {
      ok: false,
      rawBody: response.text,
      error: response.networkError,
    };
  }

  if (isHtmlResponse(response.contentType, response.text)) {
    return {
      ok: false,
      rawBody: response.text,
      error: getDashboardConfigHtmlErrorMessage(response.route),
    };
  }

  const body = response.text.trim();
  if (!body) {
    if (!response.ok) {
      return {
        ok: false,
        rawBody: response.text,
        error: `Request to ${response.route} failed (${response.status} ${response.statusText})`,
      };
    }
    return { ok: true, json: undefined, rawBody: response.text };
  }

  const parsed = parseJsonText(response.text);
  if (!parsed.ok) {
    return {
      ok: false,
      rawBody: response.text,
      error: `Could not parse JSON from ${response.route}: ${parsed.error}`,
    };
  }

  if (!response.ok) {
    const envelope = extractResponseErrorEnvelope(parsed.json);
    return {
      ok: false,
      json: parsed.json,
      rawBody: response.text,
      error: envelope
        ? `${envelope.code}: ${envelope.message}`
        : `Request to ${response.route} failed (${response.status} ${response.statusText})`,
    };
  }

  return { ok: true, json: parsed.json, rawBody: response.text };
};

const buildRegisterPromptRequestBody = ({
  useRawBody,
  rawBodyValue,
  structuredName,
  contentMode,
  templateValue,
  messagesJsonValue,
  commitMessage,
  createOnly,
  tagRows,
}: {
  useRawBody: boolean;
  rawBodyValue: string;
  structuredName: string;
  contentMode: RegisterContentMode;
  templateValue: string;
  messagesJsonValue: string;
  commitMessage: string;
  createOnly: boolean;
  tagRows: TagRow[];
}): JsonBuildResult => {
  if (useRawBody) {
    const trimmedRaw = rawBodyValue.trim();
    if (!trimmedRaw) {
      return { ok: false, error: 'Raw JSON body is empty' };
    }
    const parsed = parseJsonText(trimmedRaw);
    if (!parsed.ok) {
      return { ok: false, error: `Invalid raw JSON body: ${parsed.error}` };
    }
    return { ok: true, body: parsed.json };
  }

  const normalizedName = structuredName.trim();
  if (!normalizedName) {
    return { ok: false, error: 'Prompt name is required for structured mode' };
  }

  const normalizedCommitMessage = commitMessage.trim();
  const payload: Record<string, unknown> = {
    name: normalizedName,
    // eslint-disable-next-line camelcase
    create_only: createOnly,
    ...(normalizedCommitMessage
      ? {
          // eslint-disable-next-line camelcase
          commit_message: normalizedCommitMessage,
        }
      : {}),
  };

  const tags: Record<string, string> = {};
  tagRows.forEach((row) => {
    const key = row.key.trim();
    const value = row.value.trim();
    if (key) {
      tags[key] = value;
    }
  });
  if (Object.keys(tags).length > 0) {
    payload.tags = tags;
  }

  if (contentMode === 'template') {
    const normalizedTemplate = templateValue.trim();
    if (!normalizedTemplate) {
      return { ok: false, error: 'Template content is required in template mode' };
    }
    payload.template = normalizedTemplate;
    return { ok: true, body: payload };
  }

  const normalizedMessagesJson = messagesJsonValue.trim();
  if (!normalizedMessagesJson) {
    return { ok: false, error: 'Messages JSON is required in messages mode' };
  }

  const parsedMessages = parseJsonText(normalizedMessagesJson);
  if (!parsedMessages.ok) {
    return { ok: false, error: `Invalid messages JSON: ${parsedMessages.error}` };
  }

  if (!Array.isArray(parsedMessages.json)) {
    return { ok: false, error: 'Messages JSON must be an array' };
  }

  const messages = parsedMessages.json.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    if (typeof entry.role !== 'string' || typeof entry.content !== 'string') {
      return [];
    }
    return [{ role: entry.role, content: entry.content }];
  });

  if (messages.length !== parsedMessages.json.length) {
    return {
      ok: false,
      error: 'Each message must be an object containing string role and content fields',
    };
  }

  payload.messages = messages;
  return { ok: true, body: payload };
};

const BffConnectionAlert: React.FC<{ selectorStatus: MlflowSelectorStatus }> = ({
  selectorStatus,
}) => {
  let alertVariant: React.ComponentProps<typeof Alert>['variant'] = 'success';
  let alertTitle = 'BFF connected';
  if (!selectorStatus.loaded) {
    alertVariant = 'info';
    alertTitle = 'Checking BFF connectivity...';
  } else if (selectorStatus.error) {
    alertVariant = 'danger';
    alertTitle = 'Could not connect to BFF';
  }

  return <Alert variant={alertVariant} isInline isPlain title={alertTitle} />;
};

const MainPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<MlflowExperiment | undefined>();
  const [selectorStatus, setSelectorStatus] = useState<MlflowSelectorStatus>({ loaded: false });
  const [filterInput, setFilterInput] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAppContext();
  const { namespaces, preferredNamespace, updatePreferredNamespace, namespacesLoaded } =
    useNamespaceSelector();

  // Always show admin tools on this dev/testing page; in production use: user.clusterAdmin ?? false
  const isClusterAdmin = user.clusterAdmin ?? true;

  const [globalNamespaces, setGlobalNamespaces] = useState<string[]>([]);
  const [globalNamespaceInput, setGlobalNamespaceInput] = useState('');
  const [globalNamespacesLoaded, setGlobalNamespacesLoaded] = useState(false);
  const [globalNamespacesLoadError, setGlobalNamespacesLoadError] = useState<string>();
  const [isUpdatingGlobalNamespaces, setIsUpdatingGlobalNamespaces] = useState(false);
  const [globalNamespaceFeedback, setGlobalNamespaceFeedback] = useState<InlineFeedback>();

  const [isPromptActionOpen, setIsPromptActionOpen] = useState(false);
  const [promptAction, setPromptAction] = useState<PromptAction>('list');
  const [promptName, setPromptName] = useState('');
  const [promptVersion, setPromptVersion] = useState('');
  const [filterName, setFilterName] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [maxResults, setMaxResults] = useState('25');
  const [useRawJsonBody, setUseRawJsonBody] = useState(false);
  const [registerPromptName, setRegisterPromptName] = useState('');
  const [isContentModeOpen, setIsContentModeOpen] = useState(false);
  const [registerContentMode, setRegisterContentMode] = useState<RegisterContentMode>('template');
  const [registerTemplateText, setRegisterTemplateText] = useState('');
  const [registerMessagesJson, setRegisterMessagesJson] = useState(
    '[\n  {\n    "role": "user",\n    "content": "Hello {{name}}"\n  }\n]',
  );
  const [registerCommitMessage, setRegisterCommitMessage] = useState('');
  const [registerCreateOnly, setRegisterCreateOnly] = useState(false);
  const [registerTagRows, setRegisterTagRows] = useState<TagRow[]>([{ id: 1, key: '', value: '' }]);
  const [nextTagRowId, setNextTagRowId] = useState(2);
  const [rawJsonBody, setRawJsonBody] = useState(
    '{\n  "name": "my-prompt",\n  "template": "Hello {{name}}"\n}',
  );
  const [isPromptRequestRunning, setIsPromptRequestRunning] = useState(false);
  const [promptRequestResult, setPromptRequestResult] = useState<PromptRequestResult>();
  const [responseTabKey, setResponseTabKey] = useState<ResponseTabKey>('prettified');

  const [isAdminToolsExpanded, setIsAdminToolsExpanded] = useState(false);
  const [configNamespace, setConfigNamespace] = useState('');
  const [globalNamespacesText, setGlobalNamespacesText] = useState('');
  const [adminFeedback, setAdminFeedback] = useState<InlineFeedback>();
  const [adminRawResponse, setAdminRawResponse] = useState('');
  const [isInferringNamespace, setIsInferringNamespace] = useState(false);
  const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(false);
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);

  const excludedNames = new Set(['default', 'system', 'openshift', 'opendatahub']);
  const filteredNamespaces = namespaces.filter(
    (namespace) =>
      !namespace.name.startsWith('openshift-') &&
      !namespace.name.startsWith('kube-') &&
      !excludedNames.has(namespace.name),
  );

  const workspace =
    searchParams.get(WORKSPACE_PARAM) ||
    preferredNamespace?.name ||
    filteredNamespaces[0]?.name ||
    '';
  const filter = appliedFilter || undefined;

  const setWorkspaceSearchParam = React.useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(WORKSPACE_PARAM, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!workspace || searchParams.get(WORKSPACE_PARAM) === workspace) {
      return;
    }
    setWorkspaceSearchParam(workspace);
  }, [workspace, searchParams, setWorkspaceSearchParam]);

  useEffect(() => {
    setSelectedExperiment(undefined);
    setSelectorStatus({ loaded: false, error: undefined });
  }, [workspace, appliedFilter]);

  useEffect(() => {
    if (!isClusterAdmin) {
      return;
    }

    let disposed = false;
    setGlobalNamespacesLoaded(false);
    setGlobalNamespacesLoadError(undefined);

    const loadGlobalNamespaces = async () => {
      try {
        const response = await getGlobalMLflowNamespaces('')({});
        if (disposed) {
          return;
        }
        setGlobalNamespaces(response);
        setGlobalNamespaceInput(response[0] ?? '');
      } catch (error) {
        if (disposed) {
          return;
        }
        setGlobalNamespacesLoadError(
          toErrorMessage(error, 'Could not load global workspace configuration'),
        );
      } finally {
        if (!disposed) {
          setGlobalNamespacesLoaded(true);
        }
      }
    };

    void loadGlobalNamespaces();

    return () => {
      disposed = true;
    };
  }, [isClusterAdmin]);

  const onGlobalNamespaceUpdate = React.useCallback(async (nextNamespaces: string[]) => {
    setIsUpdatingGlobalNamespaces(true);
    setGlobalNamespaceFeedback(undefined);
    try {
      const response = await updateGlobalMLflowNamespaces('')({}, nextNamespaces);
      setGlobalNamespaces(response.globalMLflowNamespaces);
      setGlobalNamespaceInput(response.globalMLflowNamespaces[0] ?? '');
      setGlobalNamespaceFeedback({
        variant: response.warnings?.length ? 'warning' : 'success',
        title:
          response.globalMLflowNamespaces.length > 0
            ? `Global namespace set to ${response.globalMLflowNamespaces[0]}`
            : 'Global namespace cleared',
        description: response.warnings?.join(' '),
      });
    } catch (error) {
      setGlobalNamespaceFeedback({
        variant: 'danger',
        title: 'Failed to update global namespace',
        description: toErrorMessage(error, 'Please try again'),
      });
    } finally {
      setIsUpdatingGlobalNamespaces(false);
    }
  }, []);

  const actionToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsPromptActionOpen((prev) => !prev)}
        isExpanded={isPromptActionOpen}
        style={{ minWidth: '480px' }}
      >
        {ACTION_LABELS[promptAction]}
      </MenuToggle>
    ),
    [isPromptActionOpen, promptAction],
  );

  const contentModeToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsContentModeOpen((prev) => !prev)}
        isExpanded={isContentModeOpen}
        style={{ width: `${CONTROL_WIDTH_PX}px` }}
      >
        {CONTENT_MODE_LABELS[registerContentMode]}
      </MenuToggle>
    ),
    [isContentModeOpen, registerContentMode],
  );

  const onProjectSelect = (
    _event: React.MouseEvent<Element> | undefined,
    value: string | number | undefined,
  ) => {
    if (value) {
      const selected = String(value);
      const match = filteredNamespaces.find((namespace) => namespace.name === selected);
      if (match) {
        updatePreferredNamespace(match);
      }
      setWorkspaceSearchParam(selected);
    }
    setIsOpen(false);
  };

  const onPromptActionSelect = (
    _event: React.MouseEvent<Element> | undefined,
    value: string | number | undefined,
  ) => {
    if (isPromptActionValue(value)) {
      setPromptAction(value);
    }
    setIsPromptActionOpen(false);
  };

  const onContentModeSelect = (
    _event: React.MouseEvent<Element> | undefined,
    value: string | number | undefined,
  ) => {
    if (isRegisterContentMode(value)) {
      setRegisterContentMode(value);
    }
    setIsContentModeOpen(false);
  };

  const addTagRow = () => {
    setRegisterTagRows((rows) => [...rows, { id: nextTagRowId, key: '', value: '' }]);
    setNextTagRowId((value) => value + 1);
  };

  const updateTagRow = (id: number, field: 'key' | 'value', newValue: string) => {
    setRegisterTagRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: newValue } : row)),
    );
  };

  const removeTagRow = (id: number) => {
    setRegisterTagRows((rows) => rows.filter((row) => row.id !== id));
  };

  const runPromptRequest = React.useCallback(async () => {
    if (!workspace) {
      setPromptRequestResult({
        ok: false,
        action: promptAction,
        method: 'GET',
        url: '',
        status: 0,
        statusText: 'Missing workspace',
        rawBody: '',
        message: 'Select a workspace before running prompt requests.',
      });
      return;
    }

    if (actionNeedsName(promptAction) && !promptName.trim()) {
      setPromptRequestResult({
        ok: false,
        action: promptAction,
        method: 'GET',
        url: '',
        status: 0,
        statusText: 'Validation error',
        rawBody: '',
        message: 'Prompt name is required for this action.',
      });
      return;
    }

    if (actionNeedsVersion(promptAction) && !promptVersion.trim()) {
      setPromptRequestResult({
        ok: false,
        action: promptAction,
        method: 'DELETE',
        url: '',
        status: 0,
        statusText: 'Validation error',
        rawBody: '',
        message: 'Prompt version is required for delete version action.',
      });
      return;
    }

    const trimmedName = promptName.trim();
    const trimmedVersion = promptVersion.trim();
    const queryParams = new URLSearchParams({ workspace });
    let request: PromptRequest;

    if (promptAction === 'list') {
      if (filterName.trim()) {
        queryParams.set('filter_name', filterName.trim());
      }
      request = {
        action: promptAction,
        method: 'GET',
        url: `${PROMPTS_BASE_PATH}?${queryParams.toString()}`,
      };
    } else if (promptAction === 'load') {
      if (trimmedVersion) {
        queryParams.set('version', trimmedVersion);
      }
      request = {
        action: promptAction,
        method: 'GET',
        url: `${PROMPTS_BASE_PATH}/${encodeURIComponent(trimmedName)}?${queryParams.toString()}`,
      };
    } else if (promptAction === 'create') {
      const bodyResult = buildRegisterPromptRequestBody({
        useRawBody: useRawJsonBody,
        rawBodyValue: rawJsonBody,
        structuredName: registerPromptName,
        contentMode: registerContentMode,
        templateValue: registerTemplateText,
        messagesJsonValue: registerMessagesJson,
        commitMessage: registerCommitMessage,
        createOnly: registerCreateOnly,
        tagRows: registerTagRows,
      });
      if (!bodyResult.ok) {
        setPromptRequestResult({
          ok: false,
          action: promptAction,
          method: 'POST',
          url: '',
          status: 0,
          statusText: 'Validation error',
          rawBody: '',
          message: bodyResult.error ?? 'Could not build request body',
        });
        return;
      }
      request = {
        action: promptAction,
        method: 'POST',
        url: `${PROMPTS_BASE_PATH}?${queryParams.toString()}`,
        body: bodyResult.body,
      };
    } else if (promptAction === 'versions') {
      if (pageToken.trim()) {
        queryParams.set('page_token', pageToken.trim());
      }
      if (maxResults.trim()) {
        queryParams.set('max_results', maxResults.trim());
      }
      request = {
        action: promptAction,
        method: 'GET',
        url: `${PROMPTS_BASE_PATH}/${encodeURIComponent(trimmedName)}/versions?${queryParams.toString()}`,
      };
    } else if (promptAction === 'deletePrompt') {
      request = {
        action: promptAction,
        method: 'DELETE',
        url: `${PROMPTS_BASE_PATH}/${encodeURIComponent(trimmedName)}?${queryParams.toString()}`,
      };
    } else {
      request = {
        action: promptAction,
        method: 'DELETE',
        url: `${PROMPTS_BASE_PATH}/${encodeURIComponent(trimmedName)}/versions/${encodeURIComponent(trimmedVersion)}?${queryParams.toString()}`,
      };
    }

    setIsPromptRequestRunning(true);
    setPromptRequestResult(undefined);
    setResponseTabKey('prettified');
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers:
          request.body !== undefined
            ? {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              }
            : { Accept: 'application/json' },
        body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
      });

      const rawBody = await response.text();
      const parsedBody = rawBody.trim() ? parseJsonText(rawBody) : { ok: true, json: undefined };
      const parsedJson = parsedBody.ok ? parsedBody.json : undefined;
      const envelope = parsedBody.ok ? extractResponseErrorEnvelope(parsedJson) : undefined;

      const result: PromptRequestResult = {
        ok: response.ok,
        action: request.action,
        method: request.method,
        url: request.url,
        status: response.status,
        statusText: response.statusText,
        rawBody,
        parsedJson,
        errorEnvelope: envelope,
        message: response.ok
          ? `${request.method} request completed (${response.status} ${response.statusText})`
          : envelope
            ? `${envelope.code}: ${envelope.message}`
            : `Request failed (${response.status} ${response.statusText})`,
      };

      if (!parsedBody.ok) {
        result.message = `Response is not valid JSON: ${parsedBody.error}`;
      } else if (request.action === 'list' && parsedJson !== undefined) {
        result.listRows = extractPromptListRows(parsedJson);
        result.listCounts = getPromptListCounts(result.listRows, parsedJson);
      } else if (
        (request.action === 'load' || request.action === 'create') &&
        parsedJson !== undefined
      ) {
        result.versionDetail = extractPromptVersionDetail(parsedJson);
      } else if (request.action === 'versions' && parsedJson !== undefined) {
        const versions = extractPromptVersionRows(parsedJson);
        result.versionRows = versions.rows;
        result.nextPageToken = versions.nextPageToken;
      }

      setPromptRequestResult(result);
    } catch (error) {
      setPromptRequestResult({
        ok: false,
        action: request.action,
        method: request.method,
        url: request.url,
        status: 0,
        statusText: 'Network error',
        rawBody: '',
        message: toErrorMessage(error, 'Request failed before receiving a response'),
      });
    } finally {
      setIsPromptRequestRunning(false);
    }
  }, [
    filterName,
    maxResults,
    pageToken,
    promptAction,
    promptName,
    promptVersion,
    rawJsonBody,
    registerCommitMessage,
    registerContentMode,
    registerCreateOnly,
    registerMessagesJson,
    registerPromptName,
    registerTagRows,
    registerTemplateText,
    useRawJsonBody,
    workspace,
  ]);

  const inferNamespaceFromConfig = React.useCallback(async () => {
    setAdminFeedback(undefined);
    setIsInferringNamespace(true);

    const response = await fetchTextResponse('/api/config');
    const parsed = parseDashboardRouteResponse(response);
    setAdminRawResponse(parsed.rawBody);

    if (!parsed.ok) {
      setAdminFeedback({
        variant: 'danger',
        title: 'Failed to detect dashboard config namespace',
        description: parsed.error ?? 'Request failed',
      });
      setIsInferringNamespace(false);
      return;
    }

    const detectedNamespace = extractDashboardConfigNamespace(parsed.json);
    const detectedNamespaces = extractGlobalMLflowNamespaces(parsed.json);

    if (detectedNamespace) {
      setConfigNamespace(detectedNamespace);
    }
    setGlobalNamespacesText(detectedNamespaces.join('\n'));
    setAdminFeedback({
      variant: detectedNamespace ? 'success' : 'warning',
      title: detectedNamespace
        ? `Detected config namespace: ${detectedNamespace}`
        : 'Detected config but namespace metadata was missing',
      description: detectedNamespace
        ? undefined
        : 'Set namespace manually, then load current namespaces.',
    });
    setIsInferringNamespace(false);
  }, []);

  const loadCurrentNamespaces = React.useCallback(async () => {
    setAdminFeedback(undefined);
    setIsLoadingNamespaces(true);

    const namespaceValue = configNamespace.trim();
    const primaryRoute = namespaceValue
      ? `/api/dashboardConfig/${encodeURIComponent(namespaceValue)}/odh-dashboard-config`
      : '';

    let primaryError: string | undefined;
    let responseBody = '';

    if (primaryRoute) {
      const primaryResponse = await fetchTextResponse(primaryRoute);
      const parsedPrimary = parseDashboardRouteResponse(primaryResponse);
      responseBody = parsedPrimary.rawBody;
      if (parsedPrimary.ok) {
        const primaryNamespaces = extractGlobalMLflowNamespaces(parsedPrimary.json);
        setGlobalNamespacesText(primaryNamespaces.join('\n'));
        setAdminRawResponse(parsedPrimary.rawBody);
        setAdminFeedback({
          variant: 'success',
          title: 'Loaded current global namespaces',
          description: `Source: ${primaryRoute}`,
        });
        setIsLoadingNamespaces(false);
        return;
      }
      primaryError = parsedPrimary.error;
    }

    const fallbackRoute = '/api/config';
    const fallbackResponse = await fetchTextResponse(fallbackRoute);
    const parsedFallback = parseDashboardRouteResponse(fallbackResponse);
    if (!parsedFallback.ok) {
      setAdminRawResponse(parsedFallback.rawBody || responseBody);
      setAdminFeedback({
        variant: 'danger',
        title: 'Failed to load global namespaces',
        description: primaryError
          ? `${primaryError} Fallback failed: ${parsedFallback.error}`
          : parsedFallback.error,
      });
      setIsLoadingNamespaces(false);
      return;
    }

    const fallbackNamespaces = extractGlobalMLflowNamespaces(parsedFallback.json);
    const fallbackNamespace = extractDashboardConfigNamespace(parsedFallback.json);
    if (!namespaceValue && fallbackNamespace) {
      setConfigNamespace(fallbackNamespace);
    }
    setGlobalNamespacesText(fallbackNamespaces.join('\n'));
    setAdminRawResponse(parsedFallback.rawBody);
    setAdminFeedback({
      variant: primaryError ? 'warning' : 'success',
      title: 'Loaded current global namespaces',
      description: primaryError
        ? `Primary route failed, fallback to ${fallbackRoute} succeeded.`
        : `Source: ${fallbackRoute}`,
    });
    setIsLoadingNamespaces(false);
  }, [configNamespace]);

  const applyGlobalNamespacesPatch = React.useCallback(async () => {
    setAdminFeedback(undefined);
    setIsApplyingPatch(true);

    const namespaceValue = configNamespace.trim();
    if (!namespaceValue) {
      setAdminFeedback({
        variant: 'danger',
        title: 'Patch failed',
        description: 'Dashboard config namespace is required.',
      });
      setIsApplyingPatch(false);
      return;
    }

    const parsedNamespaces = parseNamespaceList(globalNamespacesText);
    const route = `/api/dashboardConfig/${encodeURIComponent(namespaceValue)}/odh-dashboard-config`;
    const patchPayload = [
      {
        op: 'add',
        path: '/spec/globalMLflowNamespaces',
        value: parsedNamespaces,
      },
    ];

    const response = await fetchTextResponse(route, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json',
        Accept: 'application/json',
      },
      body: JSON.stringify(patchPayload),
    });
    const parsed = parseDashboardRouteResponse(response);
    setAdminRawResponse(parsed.rawBody);

    if (!parsed.ok) {
      setAdminFeedback({
        variant: 'danger',
        title: 'Patch failed',
        description: parsed.error,
      });
      setIsApplyingPatch(false);
      return;
    }

    const updatedNamespaces = extractGlobalMLflowNamespaces(parsed.json);
    setGlobalNamespacesText(updatedNamespaces.join('\n'));
    setAdminFeedback({
      variant: 'success',
      title: 'Patch applied',
      description: `Updated global namespaces count: ${updatedNamespaces.length}`,
    });
    setIsApplyingPatch(false);
  }, [configNamespace, globalNamespacesText]);

  const prettifiedResultContent = useMemo(() => {
    if (!promptRequestResult) {
      return (
        <EmptyState headingLevel="h4" titleText="No response yet">
          <EmptyStateBody>Run a prompt request to see prettified output.</EmptyStateBody>
        </EmptyState>
      );
    }

    const envelope = promptRequestResult.errorEnvelope;

    if (promptRequestResult.action === 'list') {
      const rows = promptRequestResult.listRows ?? [];
      return (
        <Stack hasGutter>
          {envelope && (
            <StackItem>
              <Alert variant="danger" isInline title={`Error envelope: ${envelope.code}`}>
                {envelope.message}
              </Alert>
            </StackItem>
          )}
          {rows.length === 0 ? (
            <StackItem>
              <EmptyState headingLevel="h4" titleText="No prompts returned">
                <EmptyStateBody>The list response did not include any prompt rows.</EmptyStateBody>
              </EmptyState>
            </StackItem>
          ) : (
            <StackItem>
              <table className="pf-v6-c-table pf-m-grid-md" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Scope</th>
                    <th>Namespace</th>
                    <th>Latest version</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.name}-${row.namespace}-${row.latestVersion}`}>
                      <td>
                        <strong>{row.name}</strong>
                        <div>{row.description || 'No description'}</div>
                      </td>
                      <td>
                        <Label color={row.scopeType === 'global' ? 'green' : 'blue'}>
                          {row.scopeType}
                        </Label>
                      </td>
                      <td>{row.namespace}</td>
                      <td>{row.latestVersion}</td>
                      <td>{formatDateTime(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StackItem>
          )}
        </Stack>
      );
    }

    if (promptRequestResult.action === 'load' || promptRequestResult.action === 'create') {
      const detail = promptRequestResult.versionDetail;
      return (
        <Stack hasGutter>
          {envelope && (
            <StackItem>
              <Alert variant="danger" isInline title={`Error envelope: ${envelope.code}`}>
                {envelope.message}
              </Alert>
            </StackItem>
          )}
          {!detail ? (
            <StackItem>
              <Alert variant="warning" isInline title="No prompt version details parsed">
                Response did not match expected prompt version shape.
              </Alert>
            </StackItem>
          ) : (
            <>
              <StackItem>
                <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <Title headingLevel="h4" size="md">
                      {detail.name}
                    </Title>
                  </FlexItem>
                  <FlexItem>
                    <Label color="blue">v{detail.version}</Label>
                  </FlexItem>
                  <FlexItem>
                    <Label color="grey">{detail.contentType}</Label>
                  </FlexItem>
                </Flex>
              </StackItem>
              {detail.commitMessage && (
                <StackItem>
                  <strong>Commit message:</strong> {detail.commitMessage}
                </StackItem>
              )}
              <StackItem>
                <strong>Created:</strong> {formatDateTime(detail.createdAt)}
                <br />
                <strong>Updated:</strong> {formatDateTime(detail.updatedAt)}
              </StackItem>
              {detail.aliases.length > 0 && (
                <StackItem>
                  <strong>Aliases:</strong> {detail.aliases.join(', ')}
                </StackItem>
              )}
              {Object.keys(detail.tags).length > 0 && (
                <StackItem>
                  <strong>Tags:</strong>{' '}
                  {Object.entries(detail.tags)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(', ')}
                </StackItem>
              )}
              {detail.contentType === 'template' && detail.template && (
                <StackItem>
                  <strong>Template:</strong>
                  <br />
                  <textarea
                    readOnly
                    value={detail.template}
                    style={{ width: `${TEXTAREA_WIDTH_PX}px`, minHeight: '100px' }}
                  />
                </StackItem>
              )}
              {detail.contentType === 'messages' && detail.messages && (
                <StackItem>
                  <strong>Messages:</strong>
                  <br />
                  <textarea
                    readOnly
                    value={JSON.stringify(detail.messages, null, 2)}
                    style={{ width: `${TEXTAREA_WIDTH_PX}px`, minHeight: '120px' }}
                  />
                </StackItem>
              )}
            </>
          )}
        </Stack>
      );
    }

    if (promptRequestResult.action === 'versions') {
      const rows = promptRequestResult.versionRows ?? [];
      return (
        <Stack hasGutter>
          {envelope && (
            <StackItem>
              <Alert variant="danger" isInline title={`Error envelope: ${envelope.code}`}>
                {envelope.message}
              </Alert>
            </StackItem>
          )}
          {rows.length === 0 ? (
            <StackItem>
              <EmptyState headingLevel="h4" titleText="No versions returned">
                <EmptyStateBody>The versions response did not include any rows.</EmptyStateBody>
              </EmptyState>
            </StackItem>
          ) : (
            <StackItem>
              <table className="pf-v6-c-table pf-m-grid-md" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Commit message</th>
                    <th>Aliases</th>
                    <th>Tags</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`version-${row.version}`}>
                      <td>{row.version}</td>
                      <td>{row.commitMessage || '-'}</td>
                      <td>{row.aliases.join(', ') || '-'}</td>
                      <td>
                        {Object.entries(row.tags)
                          .map(([key, value]) => `${key}=${value}`)
                          .join(', ') || '-'}
                      </td>
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>{formatDateTime(row.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </StackItem>
          )}
          {promptRequestResult.nextPageToken && (
            <StackItem>
              <Alert variant="info" isInline title="Next page token">
                {promptRequestResult.nextPageToken}
              </Alert>
            </StackItem>
          )}
        </Stack>
      );
    }

    return (
      <Stack hasGutter>
        {envelope && (
          <StackItem>
            <Alert variant="danger" isInline title={`Error envelope: ${envelope.code}`}>
              {envelope.message}
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <Alert
            variant={promptRequestResult.ok ? 'success' : 'danger'}
            isInline
            title={promptRequestResult.ok ? 'Delete action completed' : 'Delete action failed'}
          >
            {promptRequestResult.message}
          </Alert>
        </StackItem>
      </Stack>
    );
  }, [promptRequestResult]);

  const projectToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((prev) => !prev)}
        isExpanded={isOpen}
        isDisabled={!namespacesLoaded || filteredNamespaces.length === 0}
        style={{ minWidth: '250px' }}
      >
        {workspace || 'Select project'}
      </MenuToggle>
    ),
    [filteredNamespaces.length, isOpen, namespacesLoaded, workspace],
  );

  return (
    <ApplicationsPage
      title="MLflow"
      description=""
      empty={false}
      loaded
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <Stack hasGutter>
        <StackItem>
          <Card>
            <CardTitle>
              <Title headingLevel="h2" size="lg">
                Workspace
              </Title>
            </CardTitle>
            <CardBody>
              <Stack hasGutter>
                <StackItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                    <FlexItem>Project</FlexItem>
                    <FlexItem>
                      <Select
                        isOpen={isOpen}
                        selected={workspace}
                        onSelect={onProjectSelect}
                        onOpenChange={(open) => setIsOpen(open)}
                        isScrollable
                        toggle={projectToggle}
                      >
                        <SelectList>
                          {filteredNamespaces.map((namespace) => (
                            <SelectOption
                              key={namespace.name}
                              value={namespace.name}
                              isSelected={namespace.name === workspace}
                            >
                              {namespace.name}
                            </SelectOption>
                          ))}
                        </SelectList>
                      </Select>
                    </FlexItem>
                  </Flex>
                </StackItem>
                <StackItem>
                  <BffConnectionAlert selectorStatus={selectorStatus} />
                </StackItem>
              </Stack>
            </CardBody>
          </Card>
        </StackItem>
        {isClusterAdmin && (
          <StackItem>
            <Card>
              <CardTitle>
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                  <FlexItem>
                    <Title headingLevel="h2" size="lg">
                      Global Workspace
                    </Title>
                  </FlexItem>
                  <FlexItem>
                    <Popover
                      headerContent="Global Workspace (high-level API)"
                      bodyContent={
                        <Stack hasGutter>
                          <StackItem>
                            Calls <strong>PUT /api/mlflow-global-namespace</strong> on the host
                            dashboard backend (port 4010 in dev).
                          </StackItem>
                          <StackItem>
                            This is the &quot;proper&quot; API that validates the namespace exists,
                            checks RBAC permissions, applies the Kubernetes label, and patches the
                            OdhDashboardConfig CR — all in one call.
                          </StackItem>
                          <StackItem>
                            <strong>Use when:</strong> Running federated against the full dashboard
                            backend (e.g. <code>npm run dev</code> from repo root, or on-cluster).
                          </StackItem>
                        </Stack>
                      }
                    >
                      <DashboardPopupIconButton
                        icon={<OutlinedQuestionCircleIcon />}
                        aria-label="Global Workspace help"
                      />
                    </Popover>
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                {!globalNamespacesLoaded ? (
                  <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                    <FlexItem>
                      <Spinner size="md" />
                    </FlexItem>
                    <FlexItem>Loading global workspace settings...</FlexItem>
                  </Flex>
                ) : (
                  <Stack hasGutter>
                    <StackItem>
                      {globalNamespacesLoadError ? (
                        <Alert
                          variant="danger"
                          isInline
                          title="Could not load global workspace setting"
                        >
                          {globalNamespacesLoadError}
                        </Alert>
                      ) : (
                        <Flex
                          alignItems={{ default: 'alignItemsCenter' }}
                          gap={{ default: 'gapSm' }}
                        >
                          <FlexItem>
                            <div>
                              Current namespace:
                              <strong> {globalNamespaces[0] ?? 'None configured'}</strong>
                            </div>
                          </FlexItem>
                          <FlexItem>
                            <Label color={globalNamespaces[0] ? 'green' : 'orange'}>
                              {globalNamespaces[0] ? 'Configured' : 'Not configured'}
                            </Label>
                          </FlexItem>
                        </Flex>
                      )}
                    </StackItem>
                    <StackItem>
                      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                        <FlexItem style={{ width: '360px' }}>
                          <TextInput
                            aria-label="Global MLflow namespace"
                            value={globalNamespaceInput}
                            placeholder="Enter namespace"
                            onChange={(_event, value) => setGlobalNamespaceInput(value)}
                            isDisabled={isUpdatingGlobalNamespaces}
                          />
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="primary"
                            isDisabled={
                              isUpdatingGlobalNamespaces ||
                              !globalNamespaceInput.trim() ||
                              globalNamespaceInput.trim() === (globalNamespaces[0] ?? '')
                            }
                            onClick={() =>
                              void onGlobalNamespaceUpdate([globalNamespaceInput.trim()])
                            }
                          >
                            {globalNamespaces[0] ? 'Update' : 'Set'} namespace
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="secondary"
                            isDisabled={isUpdatingGlobalNamespaces || globalNamespaces.length === 0}
                            onClick={() => void onGlobalNamespaceUpdate([])}
                          >
                            Clear
                          </Button>
                        </FlexItem>
                      </Flex>
                    </StackItem>
                    <StackItem>
                      <div>
                        Changes may take up to 30 seconds to appear in prompt fan-out while the BFF
                        config cache refreshes.
                      </div>
                    </StackItem>
                    {globalNamespaceFeedback && (
                      <StackItem>
                        <Alert
                          variant={globalNamespaceFeedback.variant}
                          isInline
                          title={globalNamespaceFeedback.title}
                        >
                          {globalNamespaceFeedback.description}
                        </Alert>
                      </StackItem>
                    )}
                    {globalNamespaces[0] && globalNamespaceFeedback?.variant !== 'danger' && (
                      <StackItem>
                        <Alert variant="info" isInline title="Namespace label applied">
                          <Stack hasGutter>
                            <StackItem>
                              <strong>Label:</strong>{' '}
                              <code>opendatahub.io/global-mlflow-workspace=mlflow</code>
                            </StackItem>
                            <StackItem>
                              <strong>Target namespace:</strong> <code>{globalNamespaces[0]}</code>
                            </StackItem>
                            <StackItem>
                              Verified via successful PUT response. To confirm on-cluster:
                              <br />
                              <code>
                                oc get namespace {globalNamespaces[0]} -o
                                jsonpath=&apos;&#123;.metadata.labels&#125;&apos;
                              </code>
                            </StackItem>
                          </Stack>
                        </Alert>
                      </StackItem>
                    )}
                  </Stack>
                )}
              </CardBody>
            </Card>
          </StackItem>
        )}
        {workspace && (
          <>
            <StackItem>
              <Card>
                <CardTitle>
                  <Title headingLevel="h2" size="lg">
                    Experiments
                  </Title>
                </CardTitle>
                <CardBody>
                  <Stack hasGutter>
                    <StackItem>
                      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                        <FlexItem>
                          Filter{' '}
                          <Popover
                            headerContent="MLflow filter syntax"
                            bodyContent={
                              <Stack hasGutter>
                                <StackItem>
                                  Uses SQL-like expressions. Multiple clauses joined with AND.
                                </StackItem>
                                <StackItem>
                                  <strong>By name</strong>
                                  <br />
                                  name = &apos;my-experiment&apos;
                                  <br />
                                  name LIKE &apos;%training%&apos;
                                </StackItem>
                                <StackItem>
                                  <strong>By tag</strong>
                                  <br />
                                  tags.team = &apos;ml-platform&apos;
                                  <br />
                                  tags.env = &apos;prod&apos;
                                </StackItem>
                                <StackItem>
                                  <strong>Combined</strong>
                                  <br />
                                  name LIKE &apos;%train%&apos; AND tags.team =
                                  &apos;ml-platform&apos;
                                </StackItem>
                              </Stack>
                            }
                          >
                            <DashboardPopupIconButton
                              icon={<OutlinedQuestionCircleIcon />}
                              aria-label="MLflow filter help"
                            />
                          </Popover>
                        </FlexItem>
                        <FlexItem style={{ width: '400px' }}>
                          <TextInput
                            aria-label="Experiment filter"
                            placeholder="e.g. tags.team = 'ml-platform'"
                            value={filterInput}
                            onChange={(_event, value) => {
                              setFilterInput(value);
                              if (!value.trim()) {
                                setAppliedFilter('');
                              }
                            }}
                          />
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="secondary"
                            isDisabled={filterInput.trim() === appliedFilter}
                            onClick={() => setAppliedFilter(filterInput.trim())}
                          >
                            Apply
                          </Button>
                        </FlexItem>
                      </Flex>
                    </StackItem>
                    <StackItem>
                      <Divider />
                    </StackItem>
                    <StackItem>
                      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                        <FlexItem>Experiment</FlexItem>
                        <FlexItem style={{ width: '500px' }}>
                          <MlflowExperimentSelector
                            workspace={workspace}
                            filter={filter}
                            selection={selectedExperiment?.name}
                            onSelect={setSelectedExperiment}
                            onStatusChange={setSelectorStatus}
                          />
                        </FlexItem>
                      </Flex>
                    </StackItem>
                  </Stack>
                </CardBody>
              </Card>
            </StackItem>
            <StackItem>
              <Card>
                <CardTitle>
                  <Title headingLevel="h2" size="lg">
                    MLflow Prompts
                  </Title>
                </CardTitle>
                <CardBody>
                  <Stack hasGutter>
                    <StackItem>
                      Use this playground to test prompt APIs against the selected workspace,
                      inspect prettified responses, and review raw JSON payloads.
                    </StackItem>
                    {isClusterAdmin && (
                      <StackItem>
                        <Card>
                          <CardTitle>
                            <Flex
                              justifyContent={{ default: 'justifyContentSpaceBetween' }}
                              alignItems={{ default: 'alignItemsCenter' }}
                            >
                              <FlexItem>
                                <Flex
                                  alignItems={{ default: 'alignItemsCenter' }}
                                  gap={{ default: 'gapSm' }}
                                >
                                  <FlexItem>
                                    <Title headingLevel="h3" size="md">
                                      Admin tools: patch global namespaces
                                    </Title>
                                  </FlexItem>
                                  <FlexItem>
                                    <Popover
                                      headerContent="Admin patch tool (low-level API)"
                                      bodyContent={
                                        <Stack hasGutter>
                                          <StackItem>
                                            Directly calls{' '}
                                            <strong>
                                              PATCH
                                              /api/dashboardConfig/&#123;ns&#125;/odh-dashboard-config
                                            </strong>{' '}
                                            to JSON-patch the CR&apos;s{' '}
                                            <code>spec.globalMLflowNamespaces</code> field.
                                          </StackItem>
                                          <StackItem>
                                            Skips namespace validation, RBAC checks, and Kubernetes
                                            label application. Writes directly to the CR.
                                          </StackItem>
                                          <StackItem>
                                            <strong>Use when:</strong> You need to force-set the
                                            value, debug what the CR actually contains, or the
                                            higher-level PUT API isn&apos;t working as expected.
                                          </StackItem>
                                        </Stack>
                                      }
                                    >
                                      <DashboardPopupIconButton
                                        icon={<OutlinedQuestionCircleIcon />}
                                        aria-label="Admin patch tool help"
                                      />
                                    </Popover>
                                  </FlexItem>
                                </Flex>
                              </FlexItem>
                              <FlexItem>
                                <Button
                                  variant="secondary"
                                  onClick={() => setIsAdminToolsExpanded((value) => !value)}
                                >
                                  {isAdminToolsExpanded ? 'Hide' : 'Show'}
                                </Button>
                              </FlexItem>
                            </Flex>
                          </CardTitle>
                          {isAdminToolsExpanded && (
                            <CardBody>
                              <Stack hasGutter>
                                <StackItem>
                                  <Alert
                                    variant="warning"
                                    isInline
                                    title="Admin permissions required"
                                  >
                                    Use this only in dev/test environments. Config cache refresh can
                                    take up to 30 seconds.
                                  </Alert>
                                </StackItem>
                                <StackItem>
                                  <Flex
                                    gap={{ default: 'gapSm' }}
                                    alignItems={{ default: 'alignItemsCenter' }}
                                  >
                                    <FlexItem>
                                      <span>Config namespace</span>
                                    </FlexItem>
                                    <FlexItem style={{ width: `${CONTROL_WIDTH_PX}px` }}>
                                      <TextInput
                                        aria-label="Config namespace"
                                        value={configNamespace}
                                        onChange={(_event, value) => setConfigNamespace(value)}
                                      />
                                    </FlexItem>
                                  </Flex>
                                </StackItem>
                                <StackItem>
                                  <label htmlFor="global-namespaces-textarea">
                                    Global namespaces (one per line or comma-separated)
                                  </label>
                                  <br />
                                  <textarea
                                    id="global-namespaces-textarea"
                                    aria-label="Global namespaces text area"
                                    value={globalNamespacesText}
                                    onChange={(event) =>
                                      setGlobalNamespacesText(event.currentTarget.value)
                                    }
                                    style={{
                                      width: `${TEXTAREA_WIDTH_PX}px`,
                                      minHeight: `${TEXTAREA_HEIGHT_PX}px`,
                                    }}
                                  />
                                </StackItem>
                                <StackItem>
                                  <Flex gap={{ default: 'gapSm' }}>
                                    <FlexItem>
                                      <Button
                                        variant="secondary"
                                        onClick={() => void inferNamespaceFromConfig()}
                                        isDisabled={isInferringNamespace}
                                      >
                                        {isInferringNamespace
                                          ? 'Detecting...'
                                          : 'Re-detect namespace'}
                                      </Button>
                                    </FlexItem>
                                    <FlexItem>
                                      <Button
                                        variant="secondary"
                                        onClick={() => void loadCurrentNamespaces()}
                                        isDisabled={isLoadingNamespaces}
                                      >
                                        {isLoadingNamespaces
                                          ? 'Loading...'
                                          : 'Load current namespaces'}
                                      </Button>
                                    </FlexItem>
                                    <FlexItem>
                                      <Button
                                        variant="primary"
                                        onClick={() => void applyGlobalNamespacesPatch()}
                                        isDisabled={isApplyingPatch}
                                      >
                                        {isApplyingPatch ? 'Applying...' : 'Apply patch'}
                                      </Button>
                                    </FlexItem>
                                  </Flex>
                                </StackItem>
                                {adminFeedback && (
                                  <StackItem>
                                    <Alert
                                      variant={adminFeedback.variant}
                                      isInline
                                      title={adminFeedback.title}
                                    >
                                      {adminFeedback.description}
                                    </Alert>
                                  </StackItem>
                                )}
                                {adminRawResponse && (
                                  <StackItem>
                                    <label htmlFor="admin-raw-response">Admin raw response</label>
                                    <br />
                                    <textarea
                                      id="admin-raw-response"
                                      aria-label="Admin raw response"
                                      readOnly
                                      value={adminRawResponse}
                                      style={{
                                        width: `${TEXTAREA_WIDTH_PX}px`,
                                        minHeight: `${TEXTAREA_HEIGHT_PX}px`,
                                      }}
                                    />
                                  </StackItem>
                                )}
                              </Stack>
                            </CardBody>
                          )}
                        </Card>
                      </StackItem>
                    )}
                    <StackItem>
                      <Divider />
                    </StackItem>
                    <StackItem>
                      <Title headingLevel="h3" size="md">
                        Run prompt requests
                      </Title>
                    </StackItem>
                    <StackItem>
                      Use this runner to call prompt list/load/create/versions/delete endpoints with
                      workspace-aware query params.
                    </StackItem>
                    <StackItem>
                      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                        <FlexItem>Action</FlexItem>
                        <FlexItem>
                          <Select
                            isOpen={isPromptActionOpen}
                            selected={promptAction}
                            onSelect={onPromptActionSelect}
                            onOpenChange={(open) => setIsPromptActionOpen(open)}
                            toggle={actionToggle}
                          >
                            <SelectList>
                              {PROMPT_ACTION_OPTIONS.map((option) => (
                                <SelectOption
                                  key={option.value}
                                  value={option.value}
                                  isSelected={option.value === promptAction}
                                >
                                  {option.label}
                                </SelectOption>
                              ))}
                            </SelectList>
                          </Select>
                        </FlexItem>
                        <FlexItem>
                          <Label color="blue">workspace={workspace}</Label>
                        </FlexItem>
                      </Flex>
                    </StackItem>
                    {(actionNeedsName(promptAction) || promptAction === 'create') && (
                      <StackItem>
                        <Flex
                          gap={{ default: 'gapSm' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                        >
                          <FlexItem>Prompt name</FlexItem>
                          <FlexItem style={{ width: `${CONTROL_WIDTH_PX}px` }}>
                            <TextInput
                              aria-label="Prompt name"
                              value={promptName}
                              onChange={(_event, value) => setPromptName(value)}
                              placeholder="my-prompt"
                            />
                          </FlexItem>
                        </Flex>
                      </StackItem>
                    )}
                    {(promptAction === 'load' || promptAction === 'deleteVersion') && (
                      <StackItem>
                        <Flex
                          gap={{ default: 'gapSm' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                        >
                          <FlexItem>Version</FlexItem>
                          <FlexItem style={{ width: `${SMALL_INPUT_WIDTH_PX}px` }}>
                            <TextInput
                              aria-label="Prompt version"
                              type="number"
                              value={promptVersion}
                              onChange={(_event, value) => setPromptVersion(value)}
                              placeholder="1"
                            />
                          </FlexItem>
                        </Flex>
                      </StackItem>
                    )}
                    {promptAction === 'list' && (
                      <StackItem>
                        <Flex
                          gap={{ default: 'gapSm' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                        >
                          <FlexItem>filter_name</FlexItem>
                          <FlexItem style={{ width: `${CONTROL_WIDTH_PX}px` }}>
                            <TextInput
                              aria-label="Filter name"
                              value={filterName}
                              onChange={(_event, value) => setFilterName(value)}
                              placeholder="prefix"
                            />
                          </FlexItem>
                        </Flex>
                      </StackItem>
                    )}
                    {promptAction === 'versions' && (
                      <StackItem>
                        <Flex
                          gap={{ default: 'gapSm' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                        >
                          <FlexItem>page_token</FlexItem>
                          <FlexItem style={{ width: `${CONTROL_WIDTH_PX}px` }}>
                            <TextInput
                              aria-label="Page token"
                              value={pageToken}
                              onChange={(_event, value) => setPageToken(value)}
                              placeholder="token"
                            />
                          </FlexItem>
                          <FlexItem>max_results</FlexItem>
                          <FlexItem style={{ width: `${SMALL_INPUT_WIDTH_PX}px` }}>
                            <TextInput
                              aria-label="Max results"
                              type="number"
                              value={maxResults}
                              onChange={(_event, value) => setMaxResults(value)}
                            />
                          </FlexItem>
                        </Flex>
                      </StackItem>
                    )}
                    {isPostAction(promptAction) && (
                      <>
                        <StackItem>
                          <label htmlFor="raw-json-toggle">
                            <input
                              id="raw-json-toggle"
                              type="checkbox"
                              checked={useRawJsonBody}
                              onChange={(event) => setUseRawJsonBody(event.currentTarget.checked)}
                            />{' '}
                            Use raw JSON body
                          </label>
                        </StackItem>
                        {useRawJsonBody ? (
                          <StackItem>
                            <label htmlFor="raw-json-body">Raw JSON body</label>
                            <br />
                            <textarea
                              id="raw-json-body"
                              aria-label="Raw prompt JSON body"
                              value={rawJsonBody}
                              onChange={(event) => setRawJsonBody(event.currentTarget.value)}
                              style={{
                                width: `${TEXTAREA_WIDTH_PX}px`,
                                minHeight: `${TEXTAREA_HEIGHT_PX}px`,
                              }}
                            />
                          </StackItem>
                        ) : (
                          <>
                            <StackItem>
                              <Flex
                                gap={{ default: 'gapSm' }}
                                alignItems={{ default: 'alignItemsCenter' }}
                              >
                                <FlexItem>Structured prompt name</FlexItem>
                                <FlexItem style={{ width: `${CONTROL_WIDTH_PX}px` }}>
                                  <TextInput
                                    aria-label="Structured prompt name"
                                    value={registerPromptName}
                                    onChange={(_event, value) => setRegisterPromptName(value)}
                                    placeholder="my-prompt"
                                  />
                                </FlexItem>
                              </Flex>
                            </StackItem>
                            <StackItem>
                              <Flex
                                gap={{ default: 'gapSm' }}
                                alignItems={{ default: 'alignItemsCenter' }}
                              >
                                <FlexItem>Content mode</FlexItem>
                                <FlexItem>
                                  <Select
                                    isOpen={isContentModeOpen}
                                    selected={registerContentMode}
                                    onSelect={onContentModeSelect}
                                    onOpenChange={(open) => setIsContentModeOpen(open)}
                                    toggle={contentModeToggle}
                                  >
                                    <SelectList>
                                      <SelectOption
                                        value="template"
                                        isSelected={registerContentMode === 'template'}
                                      >
                                        {CONTENT_MODE_LABELS.template}
                                      </SelectOption>
                                      <SelectOption
                                        value="messages"
                                        isSelected={registerContentMode === 'messages'}
                                      >
                                        {CONTENT_MODE_LABELS.messages}
                                      </SelectOption>
                                    </SelectList>
                                  </Select>
                                </FlexItem>
                              </Flex>
                            </StackItem>
                            {registerContentMode === 'template' ? (
                              <StackItem>
                                <label htmlFor="template-editor">Template</label>
                                <br />
                                <textarea
                                  id="template-editor"
                                  aria-label="Prompt template"
                                  value={registerTemplateText}
                                  onChange={(event) =>
                                    setRegisterTemplateText(event.currentTarget.value)
                                  }
                                  style={{
                                    width: `${TEXTAREA_WIDTH_PX}px`,
                                    minHeight: `${TEXTAREA_HEIGHT_PX}px`,
                                  }}
                                />
                              </StackItem>
                            ) : (
                              <StackItem>
                                <label htmlFor="messages-editor">Messages JSON</label>
                                <br />
                                <textarea
                                  id="messages-editor"
                                  aria-label="Prompt messages JSON"
                                  value={registerMessagesJson}
                                  onChange={(event) =>
                                    setRegisterMessagesJson(event.currentTarget.value)
                                  }
                                  style={{
                                    width: `${TEXTAREA_WIDTH_PX}px`,
                                    minHeight: `${TEXTAREA_HEIGHT_PX}px`,
                                  }}
                                />
                              </StackItem>
                            )}
                            <StackItem>
                              <Flex
                                gap={{ default: 'gapSm' }}
                                alignItems={{ default: 'alignItemsCenter' }}
                              >
                                <FlexItem>commit_message</FlexItem>
                                <FlexItem style={{ width: `${CONTROL_WIDTH_PX}px` }}>
                                  <TextInput
                                    aria-label="Commit message"
                                    value={registerCommitMessage}
                                    onChange={(_event, value) => setRegisterCommitMessage(value)}
                                    placeholder="initial version"
                                  />
                                </FlexItem>
                                <FlexItem>
                                  <label htmlFor="create-only-toggle">
                                    <input
                                      id="create-only-toggle"
                                      type="checkbox"
                                      checked={registerCreateOnly}
                                      onChange={(event) =>
                                        setRegisterCreateOnly(event.currentTarget.checked)
                                      }
                                    />{' '}
                                    create_only
                                  </label>
                                </FlexItem>
                              </Flex>
                            </StackItem>
                            <StackItem>
                              <Stack hasGutter>
                                <StackItem>
                                  <Title headingLevel="h4" size="md">
                                    Tags
                                  </Title>
                                </StackItem>
                                {registerTagRows.map((row) => (
                                  <StackItem key={`tag-row-${row.id}`}>
                                    <Flex
                                      gap={{ default: 'gapSm' }}
                                      alignItems={{ default: 'alignItemsCenter' }}
                                    >
                                      <FlexItem style={{ width: `${CONTROL_WIDTH_PX}px` }}>
                                        <TextInput
                                          aria-label={`Tag key ${row.id}`}
                                          value={row.key}
                                          onChange={(_event, value) =>
                                            updateTagRow(row.id, 'key', value)
                                          }
                                          placeholder="tag key"
                                        />
                                      </FlexItem>
                                      <FlexItem style={{ width: `${CONTROL_WIDTH_PX}px` }}>
                                        <TextInput
                                          aria-label={`Tag value ${row.id}`}
                                          value={row.value}
                                          onChange={(_event, value) =>
                                            updateTagRow(row.id, 'value', value)
                                          }
                                          placeholder="tag value"
                                        />
                                      </FlexItem>
                                      <FlexItem>
                                        <Button
                                          variant="secondary"
                                          isDisabled={registerTagRows.length === 1}
                                          onClick={() => removeTagRow(row.id)}
                                        >
                                          Remove
                                        </Button>
                                      </FlexItem>
                                    </Flex>
                                  </StackItem>
                                ))}
                                <StackItem>
                                  <Button variant="secondary" onClick={addTagRow}>
                                    Add tag row
                                  </Button>
                                </StackItem>
                              </Stack>
                            </StackItem>
                          </>
                        )}
                      </>
                    )}
                    <StackItem>
                      <Button
                        variant="primary"
                        onClick={() => void runPromptRequest()}
                        isDisabled={isPromptRequestRunning}
                      >
                        {isPromptRequestRunning ? 'Running...' : 'Run request'}
                      </Button>
                    </StackItem>
                    {promptRequestResult && (
                      <>
                        <StackItem>
                          <Alert
                            variant={promptRequestResult.ok ? 'success' : 'danger'}
                            isInline
                            title={promptRequestResult.ok ? 'Request succeeded' : 'Request failed'}
                          >
                            {promptRequestResult.message}
                          </Alert>
                        </StackItem>
                        {promptRequestResult.listCounts && (
                          <StackItem>
                            <Alert variant="info" isInline title="Prompt scope summary">
                              Global prompts: {promptRequestResult.listCounts.globalCount} | Project
                              prompts: {promptRequestResult.listCounts.projectCount}
                              {promptRequestResult.listCounts.failedNamespacesCount > 0
                                ? ` | Failed namespace queries: ${promptRequestResult.listCounts.failedNamespacesCount} (${promptRequestResult.listCounts.failedNamespaces.join(', ')})`
                                : ' | Failed namespace queries: 0'}
                            </Alert>
                          </StackItem>
                        )}
                        <StackItem>
                          <Flex gap={{ default: 'gapSm' }}>
                            <FlexItem>
                              <Button
                                variant={responseTabKey === 'prettified' ? 'primary' : 'secondary'}
                                onClick={() => setResponseTabKey('prettified')}
                              >
                                Prettified
                              </Button>
                            </FlexItem>
                            <FlexItem>
                              <Button
                                variant={responseTabKey === 'raw' ? 'primary' : 'secondary'}
                                onClick={() => setResponseTabKey('raw')}
                              >
                                Raw JSON
                              </Button>
                            </FlexItem>
                          </Flex>
                        </StackItem>
                        {isResponseTabKey(responseTabKey) && responseTabKey === 'prettified' ? (
                          <StackItem>{prettifiedResultContent}</StackItem>
                        ) : (
                          <StackItem>
                            <textarea
                              aria-label="Raw response body"
                              readOnly
                              value={promptRequestResult.rawBody || '(empty response body)'}
                              style={{
                                width: `${TEXTAREA_WIDTH_PX}px`,
                                minHeight: `${TEXTAREA_HEIGHT_PX}px`,
                              }}
                            />
                          </StackItem>
                        )}
                      </>
                    )}
                  </Stack>
                </CardBody>
              </Card>
            </StackItem>
          </>
        )}
      </Stack>
    </ApplicationsPage>
  );
};

export default MainPage;
