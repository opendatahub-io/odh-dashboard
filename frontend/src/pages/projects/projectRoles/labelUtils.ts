import { getUniqueId } from '@patternfly/react-core';
import { USER_LABEL_PREFIX } from './const';
import type { LabelEntry } from './types';

const ALPHANUMERIC = /^[a-zA-Z0-9]$/;
const LABEL_CHARS_REGEX = /^[a-zA-Z0-9._-]+$/;
const MAX_LABEL_LENGTH = 63;

export const validateLabelKey = (
  key: string,
  allKeys: string[],
  currentIndex: number,
): string | null => {
  if (!key) {
    return 'Required';
  }
  if (key.includes('/')) {
    return 'Do not include slashes (/). The system adds the required namespace prefix for you.';
  }
  if (key.length > MAX_LABEL_LENGTH) {
    return `Must be 1\u2013${MAX_LABEL_LENGTH} characters.`;
  }
  if (!LABEL_CHARS_REGEX.test(key)) {
    return 'Valid characters include letters, numbers, hyphens (-), periods (.), and underscores (_).';
  }
  if (!ALPHANUMERIC.test(key[0]) || !ALPHANUMERIC.test(key[key.length - 1])) {
    return 'Must start and end with a letter or number.';
  }
  if (allKeys.some((k, i) => i !== currentIndex && k === key)) {
    return `${key} is already in use.`;
  }
  return null;
};

export const validateLabelValue = (value: string): string | null => {
  if (!value) {
    return null;
  }
  if (value.length > MAX_LABEL_LENGTH) {
    return `Must be ${MAX_LABEL_LENGTH} characters or less.`;
  }
  if (!LABEL_CHARS_REGEX.test(value)) {
    return 'Valid characters include letters, numbers, hyphens (-), periods (.), and underscores (_).';
  }
  if (!ALPHANUMERIC.test(value[0]) || !ALPHANUMERIC.test(value[value.length - 1])) {
    return 'Must start and end with a letter or number.';
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
