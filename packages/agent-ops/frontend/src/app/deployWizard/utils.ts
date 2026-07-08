import type { DeployAgentEnvVar, DeployAgentServicePort } from './types';
import { DeployAgentEnvVarType } from './types';
import {
  ENV_VAR_NAME_REGEX,
  MAX_IANA_SVC_NAME_LENGTH,
  MAX_SERVICE_PORT,
  MIN_SERVICE_PORT,
  SERVICE_PORT_PROTOCOLS,
} from './constants';
import { protocolOptions } from './wizardOptions';

export const ENV_VAR_FIELD_REQUIRED_ERROR = 'Required when variable name is set';
export const ENV_VAR_NAME_REQUIRED_ERROR = 'Environment variable name is required';
export const SERVICE_PORT_NAME_REQUIRED_ERROR = 'Port name is required';
export const CONTAINER_IMAGE_REQUIRED_ERROR = 'Container image is required';
export const IMAGE_TAG_REQUIRED_ERROR = 'Image tag is required';
export const AGENT_NAME_REQUIRED_ERROR = 'Agent name is required';
export const AGENT_NAME_FORMAT_ERROR = 'Agent name must be a valid DNS-1123 label.';
export const PROJECT_REQUIRED_ERROR = 'Project is required';
export const PROTOCOL_REQUIRED_ERROR = 'Protocol is required';
export const DEPLOY_FORM_INCOMPLETE_ERROR = 'Complete all required fields before deploying.';
const SERVICE_PORT_NAME_FORMAT_ERROR = `Port name must be a valid IANA service name (lowercase letters, digits, and hyphens; max ${MAX_IANA_SVC_NAME_LENGTH} characters)`;
const PORT_NAME_LETTER_REGEX = /[a-z]/;

const K8S_STORAGE_QUANTITY_REGEX = /^\d+(\.\d+)?(Gi|Mi|Ti|G|M|T)$/;
const K8S_NAME_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
/** Matches BFF deploy_validation.go / agent_handlers.go label value rules. */
const K8S_LABEL_VALUE_REGEX = /^[a-zA-Z0-9]([-a-zA-Z0-9_.]*[a-zA-Z0-9])?$/;
const MAX_K8S_LABEL_VALUE_LENGTH = 63;
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

export const getContainerImageError = (value: string): string =>
  value.trim().length === 0 ? CONTAINER_IMAGE_REQUIRED_ERROR : '';

export const getImageTagError = (value: string): string =>
  value.trim().length === 0 ? IMAGE_TAG_REQUIRED_ERROR : '';

export const getAgentNameError = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return AGENT_NAME_REQUIRED_ERROR;
  }
  return isValidAgentName(name) ? '' : AGENT_NAME_FORMAT_ERROR;
};

export const getProjectError = (value: string): string =>
  value.trim().length === 0 ? PROJECT_REQUIRED_ERROR : '';

export const getProtocolError = (value: string): string =>
  value.trim().length === 0 ? PROTOCOL_REQUIRED_ERROR : '';

export const isValidK8sLabelValue = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return true;
  }
  return trimmed.length <= MAX_K8S_LABEL_VALUE_LENGTH && K8S_LABEL_VALUE_REGEX.test(trimmed);
};

export const isValidPullSecretName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed === '') {
    return true;
  }
  return trimmed.length <= MAX_DNS_SUBDOMAIN_LENGTH && K8S_DNS_SUBDOMAIN_REGEX.test(trimmed);
};

const VALID_SERVICE_PORT_PROTOCOLS = new Set<string>(SERVICE_PORT_PROTOCOLS);

export const isValidPortNumber = (port: number | undefined): boolean =>
  typeof port === 'number' &&
  Number.isInteger(port) &&
  port >= MIN_SERVICE_PORT &&
  port <= MAX_SERVICE_PORT;

export const getServicePortNumberError = (port: number | undefined): string =>
  isValidPortNumber(port)
    ? ''
    : `Port must be between ${MIN_SERVICE_PORT} and ${MAX_SERVICE_PORT}.`;

export const isValidServicePortName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_IANA_SVC_NAME_LENGTH) {
    return false;
  }
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return false;
  }
  if (!PORT_NAME_LETTER_REGEX.test(trimmed)) {
    return false;
  }
  if (trimmed.startsWith('-') || trimmed.endsWith('-') || trimmed.includes('--')) {
    return false;
  }
  return true;
};

export const getServicePortNameError = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return SERVICE_PORT_NAME_REQUIRED_ERROR;
  }
  return isValidServicePortName(name) ? '' : SERVICE_PORT_NAME_FORMAT_ERROR;
};

export const isValidServicePortProtocol = (protocol: string): boolean =>
  VALID_SERVICE_PORT_PROTOCOLS.has(protocol);

export const isValidEnvVarName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length > 0 && ENV_VAR_NAME_REGEX.test(trimmed);
};

export const getEnvVarNameError = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return ENV_VAR_NAME_REQUIRED_ERROR;
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

export const isEnvVarRowValid = (envVar: DeployAgentEnvVar): boolean => {
  if (!isValidEnvVarName(envVar.name)) {
    return false;
  }

  switch (envVar.type) {
    case DeployAgentEnvVarType.DIRECT:
      return envVar.value.trim().length > 0;
    case DeployAgentEnvVarType.SECRET:
      return envVar.secretName.trim().length > 0 && envVar.secretKey.trim().length > 0;
    case DeployAgentEnvVarType.CONFIG_MAP:
      return envVar.configMapName.trim().length > 0 && envVar.configMapKey.trim().length > 0;
    default:
      return false;
  }
};

/** Whether an env var row is valid and supported by the current deploy API. */
export const isSupportedDeployEnvVarRow = (envVar: DeployAgentEnvVar): boolean =>
  envVar.type === DeployAgentEnvVarType.DIRECT && isEnvVarRowValid(envVar);

export const formatServicePortsSummary = (servicePorts: DeployAgentServicePort[]): string =>
  servicePorts
    .map((port) => `${port.name} (${port.protocol}): ${port.port} → ${port.targetPort}`)
    .join('; ');

export const formatEnvVarSummaryEntry = (envVar: DeployAgentEnvVar): string | null => {
  const name = envVar.name.trim();
  if (!name) {
    return null;
  }

  switch (envVar.type) {
    case DeployAgentEnvVarType.DIRECT:
      return envVar.value.trim() ? `${name} = (direct value)` : null;
    case DeployAgentEnvVarType.SECRET: {
      const secretName = envVar.secretName.trim();
      const secretKey = envVar.secretKey.trim();
      return secretName && secretKey ? `${name} = secret/${secretName}:${secretKey}` : null;
    }
    case DeployAgentEnvVarType.CONFIG_MAP: {
      const configMapName = envVar.configMapName.trim();
      const configMapKey = envVar.configMapKey.trim();
      return configMapName && configMapKey
        ? `${name} = configMap/${configMapName}:${configMapKey}`
        : null;
    }
    default:
      return null;
  }
};

export const formatEnvVarsSummary = (envVars: DeployAgentEnvVar[]): string =>
  envVars
    .map(formatEnvVarSummaryEntry)
    .filter((entry): entry is string => entry !== null)
    .join(', ');

export const getOptionLabel = (options: { key: string; label: string }[], key: string): string =>
  options.find((option) => option.key === key)?.label ?? key;

export const formatProtocolSummary = (protocol: string): string =>
  getOptionLabel(protocolOptions, protocol);
