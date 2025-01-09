import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import StorageList from '~/pages/projects/screens/detail/storage/StorageList';

const GlobalClusterStoragePage: React.FC = () => {
  const { getPreferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const preferredProject = getPreferredProject('cluster-storage');
  const navigate = useNavigate();
  return (
    <PageSection hasBodyWrapper={false}>
      <StorageList
        subHeaderComponent={
          <ProjectSelector
            showTitle
            selectAllProjects
            invalidDropdownPlaceholder="All projects"
            onSelection={(projectName) => {
              updatePreferredProject('cluster-storage', projectName);
              navigate('/clusterStorage');
            }}
            namespace={preferredProject?.metadata.name ?? 'all-projects'}
          />
        }
        globalView
      />
    </PageSection>
  );
};

export default GlobalClusterStoragePage;
