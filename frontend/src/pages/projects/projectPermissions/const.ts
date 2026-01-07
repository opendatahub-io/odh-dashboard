import { SimpleSelectOption } from '#~/components/SimpleSelect';

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
