import React from 'react';
import { Button, Skeleton, Tooltip } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import ConnectedWorkbenchesModal from './ConnectedWorkbenchesModal';
import { useFeatureStoreProject } from '../FeatureStoreContext';
import { useFeatureStoreAccessibleProjects } from '../hooks/useFeatureStoreAccessibleProjects';

const TOOLTIP_REGULAR_USER =
  'To connect a workbench, you need a project that can access this feature store. Contact your administrator to request project permissions.';

const TOOLTIP_ADMIN =
  'To connect a workbench, you need a project that can access this feature store. Update project permissions in OpenShift.';

const ConnectedWorkbenchesLink: React.FC = () => {
  const { accessibleProjects, projectsLoaded, projectsError } = useFeatureStoreAccessibleProjects();
  const [canCreateFeatureStore, canCreateLoaded] = useAccessAllowed(
    verbModelAccess('create', FeatureStoreModel),
  );
  const { currentProject } = useFeatureStoreProject();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const hasProjects = accessibleProjects.length > 0;
  const hasNoProjects = projectsLoaded && !projectsError && !hasProjects;

  const button = (
    <Button
      variant="link"
      icon={<WrenchIcon />}
      iconPosition="start"
      isDisabled={!!projectsError}
      isAriaDisabled={hasNoProjects}
      onClick={() => setIsModalOpen(true)}
      className="pf-v6-u-font-weight-bold"
      data-testid="connected-workbenches-link"
    >
      View connected workbenches
    </Button>
  );

  const content =
    !hasNoProjects || !canCreateLoaded ? (
      button
    ) : (
      <Tooltip content={canCreateFeatureStore ? TOOLTIP_ADMIN : TOOLTIP_REGULAR_USER}>
        {button}
      </Tooltip>
    );

  return (
    <>
      {!projectsLoaded ? <Skeleton data-testid="skeleton-loader" width="200px" /> : content}
      {isModalOpen && (
        <ConnectedWorkbenchesModal
          onClose={() => setIsModalOpen(false)}
          initialFeastProjectName={currentProject}
        />
      )}
    </>
  );
};

export default ConnectedWorkbenchesLink;
