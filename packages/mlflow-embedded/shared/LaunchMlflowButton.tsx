import React from 'react';
import { Button } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireLinkTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { mlflowLaunchRoute } from '@odh-dashboard/internal/routes/pipelines/mlflow';

const LaunchMlflowButton: React.FC<{
  testId: string;
  section: string;
  workspace?: string;
}> = ({ testId, section, workspace }) => {
  const href = mlflowLaunchRoute(workspace);
  return (
    <Button
      component="a"
      isInline
      data-testid={testId}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="link"
      icon={<ExternalLinkAltIcon />}
      iconPosition="end"
      aria-label="Launch MLflow"
      onClick={() =>
        fireLinkTrackingEvent('Launch MLflow clicked', {
          from: window.location.pathname,
          href,
          section,
        })
      }
    >
      Launch MLflow
    </Button>
  );
};

export default LaunchMlflowButton;
