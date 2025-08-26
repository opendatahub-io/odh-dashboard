import React from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@patternfly/react-core';
import useExperimentById from '#~/concepts/modelRegistry/apiHooks/useExperimentById';
import { experimentsRunsRoute } from '#~/routes/experiments/registryBase';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';

type ExperimentCellProps = {
  experimentId: string;
  modelRegistry?: string;
};

const ExperimentCell: React.FC<ExperimentCellProps> = ({ experimentId, modelRegistry }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const [experiment, loaded, error] = useExperimentById(experimentId);

  const registry = modelRegistry || preferredModelRegistry?.metadata.name;

  if (error) {
    return <span>Error loading experiment</span>;
  }

  if (!loaded) {
    return <Skeleton width="120px" height="20px" />;
  }

  if (!experiment) {
    return <span>Unknown experiment</span>;
  }

  return (
    <Link
      to={experimentsRunsRoute(registry, experimentId)}
      style={{ textDecoration: 'none', color: 'var(--pf-v5-global--link--Color)' }}
    >
      {experiment.name || `Experiment ${experimentId.slice(-8)}`}
    </Link>
  );
};

export default ExperimentCell;
