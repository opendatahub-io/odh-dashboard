import React from 'react';

import { Popover, Alert, Icon } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

export const UnavailableMetricValue: React.FC = () => (
  <Popover
    aria-label="Unavailable metric popover"
    headerContent={
      <Alert variant="warning" isInline isPlain title="Metric is unavailable for this run" />
    }
    bodyContent={
      <>
        This run does not support this metric type, and may have been generated from a different
        pipeline version. To move this run, clone it to an appropriate experiment, then archive and
        delete it from this experiment.
      </>
    }
  >
    <Icon status="warning">
      <ExclamationTriangleIcon />
    </Icon>
  </Popover>
);
