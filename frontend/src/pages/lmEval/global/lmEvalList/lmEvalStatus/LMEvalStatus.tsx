import React from 'react';
import { Flex, FlexItem, Skeleton } from '@patternfly/react-core';
import { useLMEvalJobStatus } from '#~/api/k8s/lmEval.ts';
import UnderlinedTruncateButton from '#~/components/UnderlinedTruncateButton.tsx';
import { LMEvalState } from '#~/pages/lmEval/types.ts';
import { getLMEvalState, getLMEvalStatusColor } from '#~/pages/lmEval/global/lmEvalList/utils';
import LMEvalStatusLabel from './LMEvalStatusLabel';
import LMEvalProgressBar from './LMEvalProgressBar';

type LMEvalStatusProps = {
  name: string;
  namespace: string;
};

const LMEvalStatus: React.FC<LMEvalStatusProps> = ({ name, namespace }) => {
  const [lmEvalJob, loaded] = useLMEvalJobStatus(name, namespace);

  if (!loaded) {
    return <Skeleton width="50%" />;
  }

  const currentState = getLMEvalState(lmEvalJob.status);

  const isStarting = currentState === LMEvalState.PENDING;
  const isRunning =
    currentState === LMEvalState.IN_PROGRESS &&
    lmEvalJob.status?.progressBars?.some((bar) => bar.message === 'Requesting API');
  const isRunningInitializing = currentState === LMEvalState.IN_PROGRESS && !isRunning;
  const isFailed = currentState === LMEvalState.FAILED;

  const showUnderlinedTruncateButton = isStarting || isRunningInitializing || isFailed;

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
      <FlexItem>
        <LMEvalStatusLabel status={lmEvalJob.status} />
      </FlexItem>
      {showUnderlinedTruncateButton ? (
        <UnderlinedTruncateButton
          content={lmEvalJob.status?.message || 'Waiting for server request to start...'}
          color={getLMEvalStatusColor(currentState)}
        />
      ) : null}
      {isRunning ? <LMEvalProgressBar status={lmEvalJob.status} /> : null}
    </Flex>
  );
};

export default LMEvalStatus;
