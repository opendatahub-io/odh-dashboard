import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { FAST_POLL_INTERVAL } from '~/utilities/const';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import NotebookTable from './NotebookTable';

const NotebookList: React.FC = () => {
  const {
    currentProject,
    notebooks: { data: notebookStates, loaded, error: loadError, refresh: refreshNotebooks },
    refreshAllProjectData: refresh,
  } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const projectName = currentProject.metadata.name;
  const isNotebooksEmpty = notebookStates.length === 0;

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (notebookStates.some((notebookState) => notebookState.isStarting)) {
      interval = setInterval(() => refreshNotebooks(), FAST_POLL_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [notebookStates, refreshNotebooks]);

  return (
    <DetailsSection
      objectType={ProjectObjectType.notebook}
      id={ProjectSectionID.WORKBENCHES}
      title={(!isNotebooksEmpty && ProjectSectionTitles[ProjectSectionID.WORKBENCHES]) || ''}
      popover={
        !isNotebooksEmpty && (
          <Popover
            headerContent="About workbenches"
            bodyContent="A workbench is an isolated area where you can work with models in your preferred IDE, such as a Jupyter notebook. You can add accelerators and data connections, create pipelines, and add cluster storage in your workbench."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        )
      }
      actions={[
        <Button
          key={`action-${ProjectSectionID.WORKBENCHES}`}
          onClick={() => navigate(`/projects/${projectName}/spawner`)}
          data-testid="create-workbench-button"
          variant="primary"
        >
          Create workbench
        </Button>,
      ]}
      isLoading={!loaded}
      loadError={loadError}
      isEmpty={isNotebooksEmpty}
      emptyState={
        <EmptyDetailsView
          title="Start by creating a workbench"
          description="A workbench is an isolated area where you can work with models in your preferred IDE, such as a Jupyter notebook. You can add accelerators and data connections, create pipelines, and add cluster storage in your workbench."
          iconImage={typedEmptyImage(ProjectObjectType.notebook)}
          imageAlt="create a workbench"
          createButton={
            <Button
              key={`action-${ProjectSectionID.WORKBENCHES}`}
              data-testid="create-workbench-button"
              onClick={() => navigate(`/projects/${projectName}/spawner`)}
              variant="primary"
            >
              Create workbench
            </Button>
          }
        />
      }
    >
      {!isNotebooksEmpty ? (
        <NotebookTable notebookStates={notebookStates} refresh={refresh} />
      ) : null}
    </DetailsSection>
  );
};

export default NotebookList;
