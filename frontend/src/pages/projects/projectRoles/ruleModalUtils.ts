import { ALL_VERBS_WILDCARD } from './verbCategories';

export const CORE_GROUP_ID = '__builtin_core_group__';
export const CORE_GROUP_LABEL = 'core';

export const normalizeVerbs = (selectedVerbs: string[]): string[] =>
  selectedVerbs.includes(ALL_VERBS_WILDCARD) ? [ALL_VERBS_WILDCARD] : [...selectedVerbs];
