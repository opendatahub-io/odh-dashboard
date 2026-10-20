import * as React from 'react';
import { Route, useLocation } from 'react-router-dom';
import ProjectsRoutes from '@odh-dashboard/ui-core/components/ProjectsRoutes';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import MlflowSkillRegistryPage from './MlflowSkillRegistryPage';
import { SKILL_REGISTRY_PAGE_TITLE, SKILL_REGISTRY_NO_PROJECTS_MESSAGE } from '../shared/const';
import WorkspaceRouteLoader from '../shared/WorkspaceRouteLoader';
import { setWorkspaceParam, skillRegistryBaseRoute } from '../shared/routes';

const GlobalMLflowSkillRegistryRoutes: React.FC = () => {
  const { pathname, search } = useLocation();
  const getRedirectPath = React.useCallback(
    (namespace: string) => setWorkspaceParam(pathname, search, namespace),
    [pathname, search],
  );

  return (
    <ProjectsRoutes>
      <Route
        path="/*"
        element={
          <WorkspaceRouteLoader
            title={
              <TitleWithIcon
                title={SKILL_REGISTRY_PAGE_TITLE}
                objectType={ProjectObjectType.skillRegistry}
              />
            }
            getRedirectPath={getRedirectPath}
            getNoProjectsRedirectPath={skillRegistryBaseRoute}
            noProjectsMessage={SKILL_REGISTRY_NO_PROJECTS_MESSAGE}
            noProjectsTestId="skill-registry-no-projects-empty-state"
            PageComponent={MlflowSkillRegistryPage}
          />
        }
      />
    </ProjectsRoutes>
  );
};

export default GlobalMLflowSkillRegistryRoutes;
