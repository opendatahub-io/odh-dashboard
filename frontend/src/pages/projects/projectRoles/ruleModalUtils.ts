import { ALL_VERBS_WILDCARD } from './verbCategories';

export const CORE_GROUP_ID = '__core__';
export const CORE_GROUP_LABEL = 'core';

export const normalizeVerbs = (selectedVerbs: string[]): string[] =>
  selectedVerbs.includes(ALL_VERBS_WILDCARD) ? [ALL_VERBS_WILDCARD] : [...selectedVerbs];
