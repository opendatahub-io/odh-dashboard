import * as React from 'react';
import { Alert, Button } from '@patternfly/react-core';

type ModelTrainingAllProjectsBannerProps = {
  onExit: () => void;
};

const ModelTrainingAllProjectsBanner: React.FC<ModelTrainingAllProjectsBannerProps> = ({
  onExit,
}) => (
  <Alert
    variant="info"
    title="You're viewing jobs across every project you have access to."
    isInline
    data-testid="training-jobs-all-projects-banner"
  >
    <Button variant="link" isInline onClick={onExit} data-testid="training-jobs-exit-all-projects">
      Exit all projects view
    </Button>
  </Alert>
);

export default ModelTrainingAllProjectsBanner;
