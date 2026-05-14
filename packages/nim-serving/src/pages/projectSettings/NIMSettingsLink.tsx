import React from 'react';
import { Spinner } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { useAccessReview } from '@odh-dashboard/internal/api/useAccessReview';

type NIMSettingsLinkProps = {
  projectName: string;
};

const NIMSettingsLink: React.FC<NIMSettingsLinkProps> = ({ projectName }) => {
  const [canViewSettings, rbacLoaded] = useAccessReview(
    {
      group: 'rbac.authorization.k8s.io',
      resource: 'rolebindings',
      namespace: projectName,
      verb: 'list',
    },
    true,
  );

  if (!rbacLoaded) {
    return <Spinner size="sm" />;
  }
  if (canViewSettings) {
    return (
      <Link to={`/projects/${projectName}?section=settings`}>Configure in project settings</Link>
    );
  }
  return <>Ask your project administrator to configure NVIDIA NIM.</>;
};

export default NIMSettingsLink;
