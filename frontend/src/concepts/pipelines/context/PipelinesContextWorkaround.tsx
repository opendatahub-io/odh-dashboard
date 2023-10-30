/**
 * This file is immediately deprecated, this is for a small fix for the next release and will
 * be fixed by https://github.com/opendatahub-io/odh-dashboard/issues/2010
 */
import * as React from 'react';
import axios from 'axios';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { DataScienceClusterKindStatus } from '~/k8sTypes';
import useFetchState from '~/utilities/useFetchState';
import { PipelineContextProvider as PipelineContextProviderActual } from './PipelinesContext';

/**
 * Should only return `null` when on v1 Operator.
 */
const fetchDscStatus = (): Promise<DataScienceClusterKindStatus | null> => {
  const url = '/api/dsc/status';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      if (e.response.status === 404) {
        // DSC is not available, assume v1 Operator
        return null;
      }
      throw new Error(e.response.data.message);
    });
};

const useFetchDscStatus = () => useFetchState(fetchDscStatus, null);

/** @deprecated - replaced by https://github.com/opendatahub-io/odh-dashboard/issues/2010 */
export const PipelineContextProviderWorkaround: React.FC<
  React.ComponentProps<typeof PipelineContextProviderActual>
> = ({ children, ...props }) => {
  const [dscStatus, loaded] = useFetchDscStatus();

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (dscStatus && !dscStatus.installedComponents?.['data-science-pipelines-operator']) {
    // eslint-disable-next-line no-console
    console.log('Not rendering DS Pipelines Context because there is no backing component.');
    return <>{children}</>;
  }

  return <PipelineContextProviderActual {...props}>{children}</PipelineContextProviderActual>;
};
