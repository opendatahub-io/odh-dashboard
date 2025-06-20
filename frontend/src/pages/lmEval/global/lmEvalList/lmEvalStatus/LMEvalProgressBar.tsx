import React from 'react';
import { Progress } from '@patternfly/react-core';
import { LMEvalKind } from '#~/k8sTypes.ts';
import { getLMEvalStatusProgress } from '#~/pages/lmEval/global/lmEvalList/utils';

type LMEvalProgressBarProps = {
  status?: LMEvalKind['status'];
};

const LMEvalProgressBar: React.FC<LMEvalProgressBarProps> = ({ status }) => {
  const progress = getLMEvalStatusProgress(status);

  return <Progress value={progress} />;
};

export default LMEvalProgressBar;
