import { getUniqueId } from '@patternfly/react-core';
import { USER_LABEL_PREFIX } from './const';
import type { LabelEntry } from './types';

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
