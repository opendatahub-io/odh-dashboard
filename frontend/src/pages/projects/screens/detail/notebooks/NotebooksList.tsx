import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../EmptyDetailsList';
import { ProjectSectionID } from '../types';
import DetailsSection from '../DetailsSection';
import { ProjectSectionTitles } from '../const';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { useNavigate } from 'react-router-dom';
import NotebookTable from './NotebookTable';

const NotebooksList: React.FC = () => {
  const {
    currentProject,
    notebooks: { data: notebookStates, loaded, error: loadError, refresh: refreshNotebooks },
  } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const projectName = currentProject.metadata.name;

  return (
    <DetailsSection
      id={ProjectSectionID.WORKBENCHES}
      title={ProjectSectionTitles[ProjectSectionID.WORKBENCHES] || ''}
      actions={[
        <Button
          key={`action-${ProjectSectionID.WORKBENCHES}`}
          onClick={() => navigate(`/projects/${projectName}/spawner`)}
          variant="secondary"
        >
          Create workbench
        </Button>,
      ]}
      isLoading={!loaded}
      loadError={loadError}
      isEmpty={notebookStates.length === 0}
      emptyState={
        <EmptyDetailsList
          title="No workbenches"
          description="To get started, create a workbench."
          includeDivider
        />
      }
    >
      <NotebookTable notebookStates={notebookStates} refreshNotebooks={refreshNotebooks} />
    </DetailsSection>
  );
};

export default NotebooksList;
