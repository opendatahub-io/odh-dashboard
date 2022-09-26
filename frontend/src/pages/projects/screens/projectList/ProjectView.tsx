import * as React from 'react';
import { List, ListItem, Stack, StackItem } from '@patternfly/react-core';
import ApplicationsPage from '../../../ApplicationsPage';
import EmptyProjects from '../../EmptyProjects';
import useUserProjects from './useUserProjects';
import ProjectLink from './ProjectLink';
import NewProjectButton from './NewProjectButton';

const ProjectView: React.FC = () => {
  const [projects, loaded, loadError] = useUserProjects();

  return (
    <ApplicationsPage
      title="Data science projects"
      description="View your existing projects or create new projects."
      loaded={loaded}
      empty={projects.length === 0}
      loadError={loadError}
      emptyStatePage={<EmptyProjects />}
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <NewProjectButton />
        </StackItem>
        <StackItem>
          Created Projects:
          <List>
            {projects.map((project) => (
              <ListItem key={project.metadata.uid}>
                <ProjectLink project={project} />
              </ListItem>
            ))}
          </List>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default ProjectView;
