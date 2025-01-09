import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ProjectSelector from '~/concepts/projects/ProjectSelector';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import NotebookList from '~/pages/projects/screens/detail/notebooks/NotebookList';

const GlobalNotebooksPage: React.FC = () => {
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const navigate = useNavigate();
  return (
    <PageSection hasBodyWrapper={false}>
      <NotebookList
        globalView
        subHeaderComponent={
          <ProjectSelector
            showTitle
            selectAllProjects
            invalidDropdownPlaceholder="All projects"
            onSelection={(projectName) => {
              const project = projects.find((p) => p.metadata.name === projectName);
              updatePreferredProject(project || null);
              navigate('/workbenches');
            }}
            namespace={preferredProject?.metadata.name ?? 'all-projects'}
          />
        }
      />
    </PageSection>
  );
};

export default GlobalNotebooksPage;
