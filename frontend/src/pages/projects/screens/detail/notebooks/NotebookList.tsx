import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { FAST_POLL_INTERVAL } from '~/utilities/const';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { useAccessReview } from '~/api';
import notebookImage from '~/images/UI_icon-Red_Hat-Wrench-RGB.svg';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import NotebookTable from '~/pages/projects/screens/detail/notebooks/NotebookTable';

import NotebookCardEmpty from './NotebookCardEmpty';

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
    <>
      <DetailsSection
        iconSrc={notebookImage}
        iconAlt="Notebooks"
        id={ProjectSectionID.WORKBENCHES}
        title={ProjectSectionTitles[ProjectSectionID.WORKBENCHES] || ''}
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
          !isNotebooksEmpty && (
            <Button
              key={`action-${ProjectSectionID.WORKBENCHES}`}
              onClick={() => navigate(`/projects/${projectName}/spawner`)}
              variant="secondary"
            >
              Create workbench
            </Button>
          ),
        ]}
        isLoading={!loaded}
        loadError={loadError}
        isEmpty={isNotebooksEmpty}
        emptyState={<NotebookCardEmpty allowCreate={rbacLoaded && allowCreate} />}
      >
        <NotebookTable notebookStates={notebookStates} refresh={refresh} />
      </DetailsSection>
    </>
  );
};

export default NotebookList;
