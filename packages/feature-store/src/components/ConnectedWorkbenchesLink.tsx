import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import { useFeatureStoreAccessibleProjects } from '../hooks/useFeatureStoreAccessibleProjects';

const TOOLTIP_REGULAR_USER =
  'To create and connect workbenches, you must first have a project with access permission. Contact your administrator to request project authorization.';

const TOOLTIP_ADMIN =
  'To create and connect workbenches, you must first have a project with access permission. Update project permissions.';

const ConnectedWorkbenchesLink: React.FC = () => {
  const { accessibleProjects, projectsLoaded, projectsError } = useFeatureStoreAccessibleProjects();
  const [isAdmin, isAdminLoaded] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));

  const hasProjects = accessibleProjects.length > 0;
  const isDisabled = projectsLoaded && !projectsError && !hasProjects;

  const handleClick = () => {
    // TODO(RHOAIENG-62434): Open ConnectedWorkbenchesModal
  };

  const button = (
    <Button
      variant="link"
      icon={<ExternalLinkAltIcon />}
      iconPosition="start"
      isAriaDisabled={isDisabled}
      onClick={isDisabled ? undefined : handleClick}
      data-testid="connected-workbenches-link"
    >
      View connected workbenches
    </Button>
  );

  if (!isDisabled || !isAdminLoaded) {
    return button;
  }

  return <Tooltip content={isAdmin ? TOOLTIP_ADMIN : TOOLTIP_REGULAR_USER}>{button}</Tooltip>;
};

export default ConnectedWorkbenchesLink;
