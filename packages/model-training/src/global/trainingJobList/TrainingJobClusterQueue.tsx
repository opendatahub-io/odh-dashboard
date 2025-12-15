import React from 'react';
import { Skeleton } from '@patternfly/react-core';
import { useModelTrainingContext } from '../ModelTrainingContext';
import useClusterQueueFromLocalQueue from '../../hooks/useClusterQueueFromLocalQueue';
import { KUEUE_MANAGED_LABEL } from '../../const';

type TrainingJobClusterQueueProps = {
  localQueueName?: string;
  namespace: string;
};

const TrainingJobClusterQueue: React.FC<TrainingJobClusterQueueProps> = ({
  localQueueName,
  namespace,
}) => {
  const { project, projects } = useModelTrainingContext();

  // Use the selected project if available, otherwise find the project for this job's namespace
  const jobProject = project ?? projects?.find((p) => p.metadata.name === namespace);
  const isProjectKueueEnabled = jobProject?.metadata.labels?.[KUEUE_MANAGED_LABEL] === 'true';

  const {
    clusterQueueName,
    loaded: clusterQueueLoaded,
    error,
  } = useClusterQueueFromLocalQueue(
    isProjectKueueEnabled ? localQueueName : undefined,
    isProjectKueueEnabled ? namespace : undefined,
  );

  // Kueue not enabled for this project - skip API call entirely
  if (!isProjectKueueEnabled || !localQueueName) {
    return <>-</>;
  }

  // Error fetching local queue (doesn't exist)
  if (error) {
    return <>-</>;
  }

  if (!clusterQueueLoaded) {
    return <Skeleton width="100px" />;
  }

  return <>{clusterQueueName || '-'}</>;
};

export default TrainingJobClusterQueue;
