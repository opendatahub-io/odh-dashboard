import React from 'react';

import {
  Bullseye,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

import { useMlmdListContext } from '#~/concepts/pipelines/context';
import { useGetArtifactsList } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactsList';
import { ArtifactsTable } from './ArtifactsTable';

export const ArtifactsList: React.FC = () => {
  const { filterQuery } = useMlmdListContext();
  const [artifactsResponse, isArtifactsLoaded, artifactsError] = useGetArtifactsList();
  const { artifacts, nextPageToken } = artifactsResponse || {};
  const filterQueryRef = React.useRef(filterQuery);

  if (artifactsError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="There was an issue loading artifacts"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{artifactsError.message}</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!isArtifactsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!artifacts?.length && !filterQuery && filterQueryRef.current === filterQuery) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={PlusCircleIcon}
        titleText="No artifacts"
        data-testid="artifacts-list-empty-state"
        variant={EmptyStateVariant.lg}
      >
        <EmptyStateBody>
          No artifacts have been generated from experiments within this project. Select a different
          project, or execute an experiment from the <b>Experiments</b> page.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <ArtifactsTable
      artifacts={artifacts}
      nextPageToken={nextPageToken}
      isLoaded={isArtifactsLoaded}
    />
  );
};
