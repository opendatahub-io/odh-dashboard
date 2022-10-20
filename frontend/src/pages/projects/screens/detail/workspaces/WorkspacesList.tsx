import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../EmptyDetailsList';
import { ProjectSectionID } from '../types';
import DetailsSection from '../DetailsSection';
import { ProjectSectionTitles } from '../const';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { useNavigate } from 'react-router-dom';
import useProjectNotebookStates from '../../../notebook/useProjectNotebookStates';
import WorkspaceTable from './WorkspaceTable';

const WorkspacesList: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const projectName = currentProject.metadata.name;
  const [notebookStates, loaded, loadError, refreshNotebooks] =
    useProjectNotebookStates(projectName);
  return (
    <DetailsSection
      id={ProjectSectionID.WORKSPACES}
      title={ProjectSectionTitles[ProjectSectionID.WORKSPACES]}
      actions={[
        <Button
          key={`action-${ProjectSectionID.WORKSPACES}`}
          onClick={() => navigate(`/projects/${projectName}/spawner`)}
          variant="secondary"
        >
          Create data science workspace
        </Button>,
      ]}
      isLoading={!loaded}
      loadError={loadError}
      isEmpty={notebookStates.length === 0}
      emptyState={
        <EmptyDetailsList
          title="No workspaces"
          description="To get started, create a workspace."
          includeDivider
        />
      }
    >
      <WorkspaceTable notebookStates={notebookStates} refreshNotebooks={refreshNotebooks} />
    </DetailsSection>
  );
};

export default WorkspacesList;
