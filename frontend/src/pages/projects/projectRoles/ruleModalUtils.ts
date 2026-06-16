import { SelectionOptions } from '#~/components/MultiSelection';
import { ALL_VERBS_WILDCARD } from './verbCategories';

export const CORE_GROUP_ID = '__core__';
export const CORE_GROUP_LABEL = 'core';

export const extractApiGroups = (selections: SelectionOptions[]): string[] =>
  selections.map((o) => (String(o.id) === CORE_GROUP_ID ? '' : String(o.id)));

export const extractResources = (selections: SelectionOptions[]): string[] =>
  selections.map((o) => {
    const idStr = String(o.id);
    const slashIdx = idStr.indexOf('/');
    return slashIdx >= 0 ? idStr.substring(slashIdx + 1) : idStr;
  });

export const normalizeVerbs = (selectedVerbs: string[]): string[] =>
  selectedVerbs.includes(ALL_VERBS_WILDCARD) ? [ALL_VERBS_WILDCARD] : [...selectedVerbs];
