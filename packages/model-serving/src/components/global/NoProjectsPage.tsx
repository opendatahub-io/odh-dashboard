import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import NewProjectButton from './NewProjectButton';
import FindProjectByName from './FindProjectByName';

const NoProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  // Set where the host could not list the caller's projects (RHAII when
  // namespace discovery is unavailable): a project can still be opened by name.
  const { findProject } = React.useContext(ProjectsContext);
  const openProject = (projectName: string) =>
    navigate(`/ai-hub/models/deployments/${projectName}`);
  return (
    <EmptyState headingLevel="h4" icon={WrenchIcon} titleText="No projects">
      <EmptyStateBody>
        {findProject
          ? 'Your projects could not be listed right now. Enter the name of a project you can use, or create one.'
          : 'To deploy a model, first create a project.'}
      </EmptyStateBody>
      <EmptyStateFooter>
        {findProject ? <FindProjectByName findProject={findProject} onFound={openProject} /> : null}
        <NewProjectButton onProjectCreated={openProject} />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default NoProjectsPage;
