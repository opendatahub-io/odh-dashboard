export enum ProjectsFilterOptions {
  projectType = 'ProjectType',
  name = 'Name',
  user = 'User',
}

export const aiProjectFilterKey = 'A.I. projects';

export const projectsFilterOptions = {
  [ProjectsFilterOptions.projectType]: 'ProjectType',
  [ProjectsFilterOptions.name]: 'Name',
  [ProjectsFilterOptions.user]: 'User',
};

export type ProjectsFilterDataType = Record<ProjectsFilterOptions, string | undefined>;

export const initialProjectsFilterData: ProjectsFilterDataType = {
  [ProjectsFilterOptions.projectType]: aiProjectFilterKey,
  [ProjectsFilterOptions.name]: '',
  [ProjectsFilterOptions.user]: '',
};

export const FindAdministratorOptions = [
  'The person who gave you your username, or who helped you to log in for the first time',
  'Someone in your IT department or help desk',
  'A project manager or developer',
];
