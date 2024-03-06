import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { AccessReviewResource, ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { FAST_POLL_INTERVAL } from '~/utilities/const';
import { useAccessReview } from '~/api';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '~/pages/projects/screens/detail/EmptyDetailsView';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { ProjectObjectType } from '~/pages/projects/types';
import { typedEmptyImage } from '~/pages/projects/utils';
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
  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

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
            bodyContent="Creating a workbench allows you to add a Jupyter notebook to your project."
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
          description="Creating a workbench allows you to add a Jupyter notebook to your project."
          iconImage={typedEmptyImage(ProjectObjectType.notebook)}
          imageAlt="create a workbench"
          allowCreate={rbacLoaded && allowCreate}
          createButton={
            <Button
              key={`action-${ProjectSectionID.WORKBENCHES}`}
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
