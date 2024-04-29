import React from 'react';

import {
  Bullseye,
  EmptyState,
  EmptyStateVariant,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateBody,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

import { useMlmdListContext } from '~/concepts/pipelines/context';
import { useGetArtifactsList } from './useGetArtifactsList';
import { ArtifactsTable } from './ArtifactsTable';

export const ArtifactsList: React.FC = () => {
  const { filterQuery } = useMlmdListContext();
  const [artifactsResponse, isArtifactsLoaded, artifactsError] = useGetArtifactsList();
  const { artifacts, nextPageToken } = artifactsResponse || {};
  const filterQueryRef = React.useRef(filterQuery);

  if (artifactsError) {
    return (
      <Bullseye>
        <EmptyState variant={EmptyStateVariant.lg}>
          <EmptyStateHeader
            titleText="There was an issue loading artifacts"
            icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
            headingLevel="h2"
          />
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
      <EmptyState data-testid="artifacts-list-empty-state" variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText="No artifacts"
          icon={<EmptyStateIcon icon={PlusCircleIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>
          No artifacts have been generated from experiments within this project. Select a different
          project, or execute an experiment from the <b>Experiments and runs</b> page.
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
