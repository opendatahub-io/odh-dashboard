import { AgentRuntime, AgentRuntimeDetail, AgentServiceEndpoint } from '~/app/types/agentRuntimes';

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readTrimmedString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isAgentServiceEndpoint = (value: unknown): value is AgentServiceEndpoint => {
  if (!isUnknownRecord(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.url === 'string' &&
    typeof value.port === 'number'
  );
};

const readEndpointList = (record: Record<string, unknown>, key: string): AgentServiceEndpoint[] => {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAgentServiceEndpoint);
};

export const readSparseRuntimeOverviewFields = (
  detail: AgentRuntimeDetail,
): {
  displayName: string | undefined;
  framework: string | undefined;
  resourceType: string | undefined;
  workloadStatus: string | undefined;
  serviceFqdn: string | undefined;
  endpoints: AgentServiceEndpoint[];
} => {
  const raw: unknown = detail;
  const runtimeRecord =
    isUnknownRecord(raw) && isUnknownRecord(raw.runtime) ? raw.runtime : undefined;

  const serviceEndpoints = isUnknownRecord(raw) ? readEndpointList(raw, 'serviceEndpoints') : [];
  const runtimePorts = runtimeRecord ? readEndpointList(runtimeRecord, 'ports') : [];

  return {
    displayName:
      (isUnknownRecord(raw) ? readTrimmedString(raw, 'displayName') : undefined) ??
      (runtimeRecord ? readTrimmedString(runtimeRecord, 'displayName') : undefined),
    framework:
      (isUnknownRecord(raw) ? readTrimmedString(raw, 'framework') : undefined) ??
      (runtimeRecord ? readTrimmedString(runtimeRecord, 'framework') : undefined),
    resourceType: runtimeRecord ? readTrimmedString(runtimeRecord, 'type') : undefined,
    workloadStatus: isUnknownRecord(raw) ? readTrimmedString(raw, 'workloadStatus') : undefined,
    serviceFqdn:
      (isUnknownRecord(raw) ? readTrimmedString(raw, 'serviceFqdn') : undefined) ??
      (runtimeRecord ? readTrimmedString(runtimeRecord, 'serviceFqdn') : undefined),
    endpoints: serviceEndpoints.length > 0 ? serviceEndpoints : runtimePorts,
  };
};

export const readSparseRuntimeDetailTitle = (detail: AgentRuntimeDetail): string => {
  const raw: unknown = detail;
  const runtimeRecord =
    isUnknownRecord(raw) && isUnknownRecord(raw.runtime) ? raw.runtime : undefined;

  const rawName = isUnknownRecord(raw) ? readTrimmedString(raw, 'name') : undefined;

  return (
    (isUnknownRecord(raw) ? readTrimmedString(raw, 'displayName') : undefined) ??
    (runtimeRecord ? readTrimmedString(runtimeRecord, 'displayName') : undefined) ??
    rawName ??
    'Unknown'
  );
};

export const resolveSparseServiceEndpoints = (
  detail?: AgentRuntimeDetail,
  runtime?: AgentRuntime,
): AgentServiceEndpoint[] => {
  if (!detail) {
    return runtime?.ports ?? [];
  }

  const raw: unknown = detail;
  const serviceEndpoints = isUnknownRecord(raw) ? readEndpointList(raw, 'serviceEndpoints') : [];
  if (serviceEndpoints.length > 0) {
    return serviceEndpoints;
  }

  const runtimeRecord =
    isUnknownRecord(raw) && isUnknownRecord(raw.runtime) ? raw.runtime : undefined;
  const detailPorts = runtimeRecord ? readEndpointList(runtimeRecord, 'ports') : [];
  if (detailPorts.length > 0) {
    return detailPorts;
  }

  return runtime?.ports ?? [];
};

export const readSparseRuntimeStatus = (
  runtime?: AgentRuntime,
  detail?: AgentRuntimeDetail,
): string => {
  const raw: unknown = detail;
  const workloadStatus = isUnknownRecord(raw)
    ? readTrimmedString(raw, 'workloadStatus')
    : undefined;
  const runtimeRecord =
    isUnknownRecord(raw) && isUnknownRecord(raw.runtime) ? raw.runtime : undefined;
  const detailRuntimeStatus = runtimeRecord
    ? readTrimmedString(runtimeRecord, 'status')
    : undefined;
  const listStatus = typeof runtime?.status === 'string' ? runtime.status.trim() : undefined;

  return (workloadStatus ?? detailRuntimeStatus ?? listStatus ?? '').toLowerCase();
};
