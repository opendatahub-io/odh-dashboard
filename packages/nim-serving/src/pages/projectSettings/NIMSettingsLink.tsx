import React from 'react';
import { Spinner } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { routeProjectsNamespace } from '@odh-dashboard/internal/routes/projects';
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { useProjectPermissionsTabVisible } from '@odh-dashboard/internal/concepts/projects/accessChecks';

type NIMSettingsLinkProps = {
  projectName: string;
};

const NIMSettingsLink: React.FC<NIMSettingsLinkProps> = ({ projectName }) => {
  const [canViewSettings, rbacLoaded] = useProjectPermissionsTabVisible(projectName);

  if (!rbacLoaded) {
    return <Spinner size="sm" />;
  }
  if (canViewSettings) {
    return (
      <Link to={`${routeProjectsNamespace(projectName)}?section=${ProjectSectionID.SETTINGS}`}>
        Configure in project settings
      </Link>
    );
  }
  return <>Ask your project administrator to configure NVIDIA NIM.</>;
};

export default NIMSettingsLink;
