import React from 'react';
import { Skeleton } from '@patternfly/react-core';
import useClusterQueueFromLocalQueue from '../../hooks/useClusterQueueFromLocalQueue';

type TrainingJobClusterQueueProps = {
  localQueueName?: string;
  namespace: string;
};

const TrainingJobClusterQueue: React.FC<TrainingJobClusterQueueProps> = ({
  localQueueName,
  namespace,
}) => {
  const { clusterQueueName, loaded: clusterQueueLoaded } = useClusterQueueFromLocalQueue(
    localQueueName,
    namespace,
  );

  if (!clusterQueueLoaded) {
    return <Skeleton width="100px" />;
  }

  return <>{clusterQueueName || '-'}</>;
};

export default TrainingJobClusterQueue;
