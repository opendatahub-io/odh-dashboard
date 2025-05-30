import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { RunDateTime } from '#~/concepts/pipelines/content/createRun/types';
import { isStartBeforeEnd } from '#~/concepts/pipelines/content/createRun/utils';

type EndDateBeforeStartDateErrorProps = {
  start?: RunDateTime;
  end?: RunDateTime;
};

const EndDateBeforeStartDateError: React.FC<EndDateBeforeStartDateErrorProps> = ({
  start,
  end,
}) => {
  const isValid = isStartBeforeEnd(start, end);

  if (isValid) {
    return null;
  }

  return <Alert isInline isPlain variant="danger" title="End date must be after start date." />;
};

export default EndDateBeforeStartDateError;
