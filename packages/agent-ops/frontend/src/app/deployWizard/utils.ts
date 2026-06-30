import type { DeployAgentEnvVar, DeployAgentServicePort, DeployAgentWizardFormData } from './types';
import {
  ENV_VAR_NAME_REGEX,
  MAX_SERVICE_PORT,
  MIN_SERVICE_PORT,
  VALID_SERVICE_PORT_PROTOCOLS,
} from './constants';
import { protocolOptions, workloadTypeOptions } from './wizardOptions';

const K8S_STORAGE_QUANTITY_REGEX = /^\d+(\.\d+)?(Gi|Mi|Ti|G|M|T)$/;
const K8S_NAME_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const K8S_DNS_SUBDOMAIN_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
const MAX_DNS1123_LABEL_LENGTH = 63;
const MAX_DNS_SUBDOMAIN_LENGTH = 253;

const translateImageSegmentToK8sName = (name: string): string => {
  const translatedName = name
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-*/, '')
    .replace(/-*$/, '')
    .replace(/[-]+/g, '-');

  if (/^\d+/.test(translatedName)) {
    return `a-${translatedName}`;
  }

  return translatedName;
};

const getImageNameFromLastSegment = (segment: string): string => {
  const digestSeparatorIndex = segment.indexOf('@');
  if (digestSeparatorIndex !== -1) {
    return segment.slice(0, digestSeparatorIndex);
  }

  const tagSeparatorIndex = segment.lastIndexOf(':');
  if (tagSeparatorIndex !== -1) {
    return segment.slice(0, tagSeparatorIndex);
  }

  return segment;
};

const isDigestPinnedImage = (containerImage: string): boolean => {
  const lastSegment = containerImage.split('/').pop() ?? containerImage;
  return lastSegment.includes('@');
};

export const deriveAgentNameFromImage = (containerImage: string): string => {
  const trimmedImage = containerImage.trim();
  if (!trimmedImage) {
    return '';
  }

  const lastSegment = trimmedImage.split('/').filter(Boolean).pop() ?? trimmedImage;

  return translateImageSegmentToK8sName(getImageNameFromLastSegment(lastSegment));
};

export const stripContainerImageTag = (containerImage: string): string => {
  const trimmed = containerImage.trim();
  if (!trimmed) {
    return '';
  }

  if (isDigestPinnedImage(trimmed)) {
    return trimmed;
  }

  const parts = trimmed.split('/');
  const lastSegment = parts[parts.length - 1];
  const tagSeparatorIndex = lastSegment.lastIndexOf(':');
  if (tagSeparatorIndex === -1) {
    return trimmed;
  }

  parts[parts.length - 1] = lastSegment.slice(0, tagSeparatorIndex);
  return parts.join('/');
};

export const buildFullImageReference = (containerImage: string, imageTag: string): string => {
  const imageWithoutTag = stripContainerImageTag(containerImage);
  const trimmedTag = imageTag.trim();

  if (!imageWithoutTag) {
    return '';
  }

  if (isDigestPinnedImage(imageWithoutTag)) {
    return imageWithoutTag;
  }

  return trimmedTag ? `${imageWithoutTag}:${trimmedTag}` : imageWithoutTag;
};

export const isValidK8sStorageQuantity = (size: string): boolean =>
  K8S_STORAGE_QUANTITY_REGEX.test(size.trim());

export const isValidAgentName = (name: string): boolean => {
  const trimmed = name.trim();
  return (
    trimmed.length > 0 && trimmed.length <= MAX_DNS1123_LABEL_LENGTH && K8S_NAME_REGEX.test(trimmed)
  );
};

export const isValidPullSecretName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed === '') {
    return true;
  }
  return trimmed.length <= MAX_DNS_SUBDOMAIN_LENGTH && K8S_DNS_SUBDOMAIN_REGEX.test(trimmed);
};

export const isValidPortNumber = (port: number | undefined): boolean =>
  typeof port === 'number' &&
  Number.isInteger(port) &&
  port >= MIN_SERVICE_PORT &&
  port <= MAX_SERVICE_PORT;

export const isValidServicePortName = (name: string): boolean => isValidAgentName(name);

export const isValidServicePortProtocol = (protocol: string): boolean =>
  VALID_SERVICE_PORT_PROTOCOLS.has(protocol);

export const isValidEnvVarName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length > 0 && ENV_VAR_NAME_REGEX.test(trimmed);
};

export const getEnvVarNameError = (name: string): string => {
  if (name.trim().length === 0) {
    return '';
  }
  return isValidEnvVarName(name)
    ? ''
    : 'Environment variable name must start with a letter or underscore and contain only letters, numbers, and underscores';
};

export const isServicePortRowValid = (port: DeployAgentServicePort): boolean =>
  isValidServicePortName(port.name) &&
  isValidPortNumber(port.port) &&
  isValidPortNumber(port.targetPort) &&
  isValidServicePortProtocol(port.protocol);

export const isEnvVarRowValid = (envVar: DeployAgentEnvVar): boolean =>
  envVar.name.trim().length > 0 && envVar.value.trim().length > 0 && isValidEnvVarName(envVar.name);

export const formatServicePortsSummary = (servicePorts: DeployAgentServicePort[]): string =>
  servicePorts
    .map((port) => `${port.name} (${port.protocol}): ${port.port} -> ${port.targetPort}`)
    .join(', ');

export const formatAuthBridgeSummary = (formData: DeployAgentWizardFormData): string => {
  if (!formData.authBridgeEnabled) {
    return 'Disabled';
  }
  if (formData.useEnvoySidecar) {
    return 'Enabled (envoy-sidecar)';
  }
  return 'Enabled';
};

export const formatEnvVarsSummary = (envVars: DeployAgentEnvVar[]): string => {
  if (envVars.length === 0) {
    return 'None';
  }
  return envVars.map((envVar) => `${envVar.name}=${envVar.value}`).join(', ');
};

export const formatPersistentStorageSummary = (formData: DeployAgentWizardFormData): string =>
  formData.enablePersistentStorage ? `Enabled (${formData.persistentVolumeSize})` : 'Disabled';

export const getOptionLabel = (options: { key: string; label: string }[], key: string): string =>
  options.find((option) => option.key === key)?.label ?? key;

export const formatProtocolSummary = (protocol: string): string =>
  getOptionLabel(protocolOptions, protocol);

export const formatWorkloadTypeSummary = (workloadType: string): string =>
  getOptionLabel(workloadTypeOptions, workloadType);
