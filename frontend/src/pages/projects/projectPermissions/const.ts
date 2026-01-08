import { SimpleSelectOption } from '#~/components/SimpleSelect';
import type { RoleRef } from '#~/concepts/permissions/types';

export enum SubjectScopeFilter {
  all = 'all',
  user = 'user',
  group = 'group',
}

export const isSubjectScopeFilter = (value: string): value is SubjectScopeFilter =>
  value === SubjectScopeFilter.all ||
  value === SubjectScopeFilter.user ||
  value === SubjectScopeFilter.group;

export enum SubjectsFilterOptions {
  name = 'name',
  role = 'role',
}

export const subjectsScopeOptions: SimpleSelectOption[] = [
  { key: SubjectScopeFilter.all, label: 'All subjects' },
  { key: SubjectScopeFilter.user, label: 'Users' },
  { key: SubjectScopeFilter.group, label: 'Groups' },
];

export const subjectsFilterOptions = {
  [SubjectsFilterOptions.name]: 'Name',
  [SubjectsFilterOptions.role]: 'Role',
};

export type FilterDataType = Record<SubjectsFilterOptions, string | undefined>;

export const initialFilterData: FilterDataType = {
  [SubjectsFilterOptions.name]: '',
  [SubjectsFilterOptions.role]: '',
};

export const DEFAULT_ROLE_REFS: RoleRef[] = [
  { kind: 'ClusterRole', name: 'admin' },
  { kind: 'ClusterRole', name: 'edit' },
];
