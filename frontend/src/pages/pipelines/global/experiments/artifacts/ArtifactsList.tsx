import React from 'react';

import {
  Bullseye,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
  Button,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

import UnauthorizedError from '@odh-dashboard/ui-core/components/UnauthorizedError';
import useFilters, { FilterValue } from '#~/utilities/useFilters';
import { useGetArtifactsList } from '#~/concepts/pipelines/apiHooks/useGetArtifactsList';
import { FilterOptions, initialFilterData } from './constants';
import { getArtifactsFilter, isArtifactAccessDenied } from './artifactResourceUtils';
import { ArtifactsTable } from './ArtifactsTable';

export const ArtifactsList: React.FC = () => {
  const { filterData, onFilterUpdate, onClearFilters } = useFilters(initialFilterData);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [pageTokens, setPageTokens] = React.useState<Record<number, string>>({});
  const hasLoadedArtifacts = React.useRef(false);
  const filter = getArtifactsFilter(filterData);
  const [artifactsResponse, isArtifactsLoaded, artifactsError] = useGetArtifactsList(
    pageTokens[page],
    pageSize,
    filter,
  );
  const { artifacts = [], next_page_token: nextPageToken } = artifactsResponse ?? {};
  if (isArtifactsLoaded) {
    hasLoadedArtifacts.current = true;
  }

  const resetPage = () => {
    setPage(1);
    setPageTokens({});
  };
  const updateFilter = (key: FilterOptions, value: FilterValue) => {
    onFilterUpdate(key, value);
    resetPage();
  };
  const clearFilters = () => {
    onClearFilters();
    resetPage();
  };

  if (artifactsError) {
    if (isArtifactAccessDenied(artifactsError)) {
      return <UnauthorizedError accessDomain="artifacts" />;
    }
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="There was an issue loading artifacts"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{artifactsError.message}</EmptyStateBody>
          {filter && (
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" onClick={clearFilters}>
                  Clear filters
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          )}
        </EmptyState>
      </Bullseye>
    );
  }

  if (!isArtifactsLoaded && !hasLoadedArtifacts.current) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (isArtifactsLoaded && !artifacts.length && !filter) {
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
      page={page}
      pageSize={pageSize}
      filterData={filterData}
      onFilterUpdate={updateFilter}
      onClearFilters={clearFilters}
      onNextPage={(nextPage) => {
        if (nextPageToken) {
          setPageTokens((tokens) => ({ ...tokens, [nextPage]: nextPageToken }));
          setPage(nextPage);
        }
      }}
      onPreviousPage={setPage}
      onPageSizeChange={(newSize) => {
        setPageSize(newSize);
        resetPage();
      }}
    />
  );
};
