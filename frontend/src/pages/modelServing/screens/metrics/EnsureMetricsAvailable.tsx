import React from 'react';
import { Bullseye, PageSectionVariants, Spinner } from '@patternfly/react-core';
import { AxiosError } from 'axios';
import UnauthorizedError from '#~/pages/UnauthorizedError';
import UnknownError from '#~/pages/UnknownError';
import {
  ModelMetricType,
  ModelServingMetricsContext,
  ServerMetricType,
} from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';

const DEFAULT_ACCESS_DOMAIN = 'metrics';

type EnsureMetricsAvailableProps = {
  children: React.ReactElement;
  metrics: ModelMetricType[] | ServerMetricType[];
  accessDomain?: React.ReactNode;
};

const EnsureMetricsAvailable: React.FC<EnsureMetricsAvailableProps> = ({
  children,
  metrics,
  /** Resource name to be displayed if access denied, e.g. 'server metrics', 'bias metrics', etc. */
  accessDomain = DEFAULT_ACCESS_DOMAIN,
}) => {
  const { data } = React.useContext(ModelServingMetricsContext);
  let error: AxiosError | undefined;
  let readyCount = 0;

  metrics.forEach((metric) => {
    const axiosError = data[metric].error;
    if (axiosError && axiosError instanceof AxiosError) {
      error = axiosError;
    }
    if (data[metric].loaded) {
      readyCount++;
    }
  });

  // Check for errors first as `loaded` prop will always be false when there is an error. If you check
  // for loaded first, you'll get an infinite spinner.
  if (error) {
    if (error.response?.status === 403) {
      return (
        <UnauthorizedError variant={PageSectionVariants.secondary} accessDomain={accessDomain} />
      );
    }
    return (
      <UnknownError
        titleText="Error retrieving metrics"
        error={error}
        variant={PageSectionVariants.secondary}
        data-testid="metrics-error"
      />
    );
  }

  if (readyCount !== metrics.length) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return children;
};

export default EnsureMetricsAvailable;
