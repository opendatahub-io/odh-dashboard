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
  'The person who gave you your username',
  'Someone in your IT department or Help desk (at a company or school)',
  'The person who manages your email service or web site (in a small business or club)',
];
