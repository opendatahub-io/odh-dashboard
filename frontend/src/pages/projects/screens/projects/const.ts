export enum ProjectsFilterOptions {
  name = 'Name',
  user = 'User',
}

export const projectsFilterOptions = {
  [ProjectsFilterOptions.name]: 'Name',
  [ProjectsFilterOptions.user]: 'User',
};

export type ProjectsFilterDataType = Record<ProjectsFilterOptions, string | undefined>;

export const initialProjectsFilterData: ProjectsFilterDataType = {
  [ProjectsFilterOptions.name]: '',
  [ProjectsFilterOptions.user]: '',
};

export const FindAdministratorOptions = [
  'The person who gave you your username, or who helped you to log in for the first time',
  'Someone in your IT department or help desk',
  'A project manager or developer',
];
