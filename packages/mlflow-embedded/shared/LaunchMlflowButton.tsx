import React from 'react';
import { Button } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fireLinkTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { mlflowLaunchRoute } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { MlflowTrackingEvents } from '@odh-dashboard/internal/concepts/mlflow/const';

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
        fireLinkTrackingEvent(MlflowTrackingEvents.LAUNCH_CLICKED, {
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
