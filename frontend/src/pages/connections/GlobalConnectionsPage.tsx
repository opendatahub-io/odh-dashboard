import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import ConnectionsList from '~/pages/projects/screens/detail/connections/ConnectionsList';

const GlobalConnectionsPage: React.FC = () => {
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const navigate = useNavigate();
  return (
    <PageSection hasBodyWrapper={false}>
      <ConnectionsList
        subHeaderComponent={
          <ProjectSelector
            showTitle
            selectAllProjects
            invalidDropdownPlaceholder="All projects"
            onSelection={(projectName) => {
              const project = projects.find((p) => p.metadata.name === projectName);
              updatePreferredProject(project || null);
              navigate('/connections');
            }}
            namespace={preferredProject?.metadata.name ?? 'all-projects'}
          />
        }
        globalView
      />
    </PageSection>
  );
};

export default GlobalConnectionsPage;
