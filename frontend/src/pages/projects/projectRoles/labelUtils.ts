import { getUniqueId } from '@patternfly/react-core';
import { USER_LABEL_PREFIX } from './const';
import type { LabelEntry } from './types';

const LABEL_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;
const LABEL_VALUE_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?)?$/;
const MAX_LABEL_NAME_LENGTH = 63;

export const validateLabelKey = (
  key: string,
  allKeys: string[],
  currentIndex: number,
): string | null => {
  if (!key) {
    return 'Key is required.';
  }
  if (key.includes('/')) {
    return 'Slashes (/) are not permitted. The system automatically applies the required prefix namespace.';
  }
  if (key.length > MAX_LABEL_NAME_LENGTH) {
    return `Key must be 1-${MAX_LABEL_NAME_LENGTH} characters, start/end with an alphanumeric character, and contain only alphanumeric, '-', '_', or '.'.`;
  }
  if (!LABEL_NAME_REGEX.test(key)) {
    return `Key must be 1-${MAX_LABEL_NAME_LENGTH} characters, start/end with an alphanumeric character, and contain only alphanumeric, '-', '_', or '.'.`;
  }
  if (allKeys.some((k, i) => i !== currentIndex && k === key)) {
    return 'Duplicate keys are not allowed.';
  }
  return null;
};

export const validateLabelValue = (value: string): string | null => {
  if (!value) {
    return 'Value is required.';
  }
  if (value.length > MAX_LABEL_NAME_LENGTH || !LABEL_VALUE_REGEX.test(value)) {
    return `Value must be 1-${MAX_LABEL_NAME_LENGTH} characters, start/end with an alphanumeric character, and contain only alphanumeric, '-', '_', or '.'.`;
  }
  return null;
};

export const toK8sLabels = (entries: LabelEntry[]): Record<string, string> =>
  Object.fromEntries(
    entries
      .filter((l) => l.key.trim())
      .map((l) => [`${USER_LABEL_PREFIX}${l.key.trim()}`, l.value]),
  );

export const fromK8sLabels = (labels?: Record<string, string> | null): LabelEntry[] =>
  Object.entries(labels ?? {})
    .filter(([key]) => key.startsWith(USER_LABEL_PREFIX) && key.length > USER_LABEL_PREFIX.length)
    .map(([key, value]) => ({
      id: getUniqueId('label'),
      key: key.slice(USER_LABEL_PREFIX.length),
      value,
    }));

export const getUserLabels = (labels?: Record<string, string> | null): Record<string, string> =>
  Object.fromEntries(
    Object.entries(labels ?? {})
      .filter(([key]) => key.startsWith(USER_LABEL_PREFIX) && key.length > USER_LABEL_PREFIX.length)
      .map(([key, value]) => [key.slice(USER_LABEL_PREFIX.length), value]),
  );
