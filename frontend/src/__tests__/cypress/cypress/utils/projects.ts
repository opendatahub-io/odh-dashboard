import { projectListPage } from '~/__tests__/cypress/cypress/pages/projects';

/**
 * Filter Project by name using the Project filter from the Data Science Projects view
 * @param projectName Project Name
 */
export const filterProjectByName = (projectName: string) => {
    projectListPage.findProjectsDropdownFilter().click();
    projectListPage.findProjectsDropdownFilterButtonByText("Name").click();
    projectListPage.findProjectsFilterInput().type(projectName);
};