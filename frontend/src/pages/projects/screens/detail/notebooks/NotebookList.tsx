import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../EmptyDetailsList';
import { ProjectSectionID } from '../types';
import DetailsSection from '../DetailsSection';
import { ProjectSectionTitles } from '../const';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { useNavigate } from 'react-router-dom';
import NotebookTable from './NotebookTable';
import { FAST_POLL_INTERVAL } from '../../../../../utilities/const';

const NotebookList: React.FC = () => {
  const {
    currentProject,
    notebooks: { data: notebookStates, loaded, error: loadError, refresh: refreshNotebooks },
    refreshAllProjectData: refresh,
  } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const projectName = currentProject.metadata.name;

  React.useEffect(() => {
    let interval;
    if (notebookStates.some((notebookState) => notebookState.isStarting)) {
      interval = setInterval(() => refreshNotebooks(), FAST_POLL_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [notebookStates, refreshNotebooks]);

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
      <NotebookTable notebookStates={notebookStates} refresh={refresh} />
    </DetailsSection>
  );
};

export default NotebookList;
