import React, { useMemo, useState } from 'react';
import { EmptyStateVariant, EmptyStateBody, EmptyState, PageSection } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Lineage } from '@odh-dashboard/internal/components/lineage/Lineage';
import { createLineageComponentFactory } from '@odh-dashboard/internal/components/lineage/factories';
import FeatureStoreLineageNode from './node/FeatureStoreLineageNode';
import FeatureStoreLineageNodePopover from './node/FeatureStoreLineageNodePopover';
import { applyLineageFilters } from './utils';
import FeatureStoreLineageToolbar from '../../components/FeatureStoreLineageToolbar';
import useFeatureStoreLineage from '../../apiHooks/useFeatureStoreLineage';
import useFeatureViewLineage from '../../apiHooks/useFeatureViewLineage';
import {
  convertFeatureStoreLineageToVisualizationData,
  convertFeatureViewLineageToVisualizationData,
} from '../../utils/lineageDataConverter';
import { FeatureStoreLineageSearchFilters } from '../../types/toolbarTypes';
import { FeatureStoreLineage, FeatureViewLineage } from '../../types/lineage';

interface FeatureStoreLineageComponentProps {
  project?: string;
  featureViewName?: string;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  height?: string;
}

const FeatureStoreLineageComponent: React.FC<FeatureStoreLineageComponentProps> = ({
  project,
  featureViewName,
  emptyStateTitle = 'Select a feature store repository',
  emptyStateMessage = 'Select a feature store repository to view its lineage.',
  height = '100%',
}) => {
  if (!project) {
    return (
      <EmptyState
        headingLevel="h6"
        icon={PlusCircleIcon}
        titleText={emptyStateTitle}
        variant={EmptyStateVariant.lg}
        data-testid="empty-state-title"
      >
        <EmptyStateBody data-testid="empty-state-body">{emptyStateMessage}</EmptyStateBody>
      </EmptyState>
    );
  }

  const [hideNodesWithoutRelationships, setHideNodesWithoutRelationships] = useState(false);
  const [searchFilters, setSearchFilters] = useState<FeatureStoreLineageSearchFilters>({});
  const [conversionError, setConversionError] = useState<string | null>(null);

  const {
    data: lineageData,
    loaded: lineageDataLoaded,
    error,
  } = featureViewName
    ? useFeatureViewLineage(project, featureViewName)
    : useFeatureStoreLineage(project);

  const componentFactory = useMemo(
    () => createLineageComponentFactory(FeatureStoreLineageNode),
    [],
  );

  const visualizationData = useMemo(() => {
    setConversionError(null);

    if (!lineageDataLoaded || error) {
      // Return empty data when loading or error - let the Lineage component handle these states
      return { nodes: [], edges: [] };
    }

    if (featureViewName) {
      try {
        const baseResult = convertFeatureViewLineageToVisualizationData(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          lineageData as FeatureViewLineage,
          featureViewName,
        );

        const filteredResult = applyLineageFilters(baseResult, {
          hideNodesWithoutRelationships,
          searchFilters,
        });

        return filteredResult;
      } catch (err) {
        setConversionError(`Failed to process feature view lineage data: ${String(err)}`);
        return { nodes: [], edges: [] };
      }
    }

    if (Object.keys(lineageData).length > 0) {
      try {
        const baseResult = convertFeatureStoreLineageToVisualizationData(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          lineageData as FeatureStoreLineage,
        );

        const filteredResult = applyLineageFilters(baseResult, {
          hideNodesWithoutRelationships,
          searchFilters,
        });

        return filteredResult;
      } catch (err) {
        setConversionError(`Failed to process lineage data: ${String(err)}`);
        return { nodes: [], edges: [] };
      }
    }

    // No data available - return empty data for proper empty state
    return { nodes: [], edges: [] };
  }, [
    lineageData,
    lineageDataLoaded,
    error,
    hideNodesWithoutRelationships,
    searchFilters,
    featureViewName,
  ]);

  const ToolbarComponent = () => (
    <FeatureStoreLineageToolbar
      hideNodesWithoutRelationships={hideNodesWithoutRelationships}
      onHideNodesWithoutRelationshipsChange={setHideNodesWithoutRelationships}
      searchFilters={searchFilters}
      onSearchFiltersChange={setSearchFilters}
      lineageData={lineageData}
      lineageDataLoaded={lineageDataLoaded}
      isFeatureViewToolbar={!!featureViewName}
    />
  );

  const PopoverComponent = (props: Parameters<typeof FeatureStoreLineageNodePopover>[0]) => (
    <FeatureStoreLineageNodePopover {...props} isOnFeatureViewDetailsPage={!!featureViewName} />
  );

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      style={{ height }}
    >
      <Lineage
        data={visualizationData}
        loading={!lineageDataLoaded}
        error={
          error ? `Failed to load lineage data: ${String(error)}` : conversionError || undefined
        }
        emptyStateMessage={
          featureViewName
            ? 'No lineage data available for this feature view'
            : 'No lineage data available for this feature store repository'
        }
        height="100%"
        componentFactory={componentFactory}
        popoverComponent={PopoverComponent}
        toolbarComponent={ToolbarComponent}
        autoResetOnDataChange
      />
    </PageSection>
  );
};

export default FeatureStoreLineageComponent;
