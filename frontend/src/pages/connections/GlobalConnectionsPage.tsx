import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import ConnectionsList from '~/pages/projects/screens/detail/connections/ConnectionsList';

const GlobalConnectionsPage: React.FC = () => {
  const { getPreferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const preferredProject = getPreferredProject('connections');
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
              updatePreferredProject('connections', projectName);
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
