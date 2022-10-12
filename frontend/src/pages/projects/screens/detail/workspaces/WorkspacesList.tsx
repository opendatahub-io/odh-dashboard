import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../EmptyDetailsList';
import { ProjectSectionID } from '../types';
import DetailsSection from '../DetailsSection';
import { ProjectSectionTitles } from '../const';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { useNavigate } from 'react-router-dom';
import useProjectNotebooks from '../../../notebook/useProjectNotebooks';
import WorkspaceTable from './WorkspaceTable';

const WorkspacesList: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectName = currentProject.metadata.name;
  const [notebookStates, loaded, loadError] = useProjectNotebooks(projectName);
  return (
    <DetailsSection
      id={ProjectSectionID.WORKSPACE}
      title={ProjectSectionTitles[ProjectSectionID.WORKSPACE]}
      actions={[
        <Button
          key={`action-${ProjectSectionID.WORKSPACE}`}
          variant="secondary"
          onClick={() => navigate(`/projects/${projectName}/spawner`)}
        >
          Create data science workspace
        </Button>,
      ]}
      isLoading={!loaded}
      loadError={loadError}
      isEmpty={notebookStates.length === 0}
      emptyState={
        <EmptyDetailsList
          title="No data science workspaces"
          description="To get started, create a data science workspace."
        />
      }
    >
      <WorkspaceTable notebookStates={notebookStates} />
    </DetailsSection>
  );
};

export default WorkspacesList;
