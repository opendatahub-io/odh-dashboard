import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { experimentsRootPath } from '#~/routes/pipelines/experiments';
import useExperimentById from '#~/concepts/pipelines/apiHooks/useExperimentById';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';

export const useExperimentByParams = (): {
  experiment: ExperimentKF | null;
  isExperimentLoaded: boolean;
} => {
  const navigate = useNavigate();
  const { experimentId } = useParams();
  const [experiment, isExperimentLoaded, experimentError] = useExperimentById(experimentId);

  // Redirect users to the Experiments list page when failing to retrieve the experiment from route params.
  React.useEffect(() => {
    if (experimentError) {
      navigate(experimentsRootPath);
    }
  }, [experimentError, navigate]);

  return { experiment, isExperimentLoaded };
};
