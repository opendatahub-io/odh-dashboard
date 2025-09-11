import React, { useMemo, useState } from 'react';
import { EmptyStateVariant, EmptyStateBody, EmptyState, PageSection } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Lineage } from '@odh-dashboard/internal/components/lineage/Lineage';
import { createLineageComponentFactory } from '@odh-dashboard/internal/components/lineage/factories';
import FeatureStoreLineageNode from './node/FeatureStoreLineageNode';
import FeatureStoreLineageNodePopover from './node/FeatureStoreLineageNodePopover';
import { applyLineageFilters } from './utils';
import FeatureStoreLineageToolbar from '../../components/FeatureStoreLineageToolbar';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureStoreLineage from '../../apiHooks/useFeatureStoreLineage';
import { convertFeatureStoreLineageToVisualizationData } from '../../utils/lineageDataConverter';
import { FeatureStoreLineageSearchFilters } from '../../types/toolbarTypes';

const FeatureStoreLineage: React.FC = () => {
  const { currentProject } = useFeatureStoreProject();

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={PlusCircleIcon}
      titleText="Select a feature store repository"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        Select a feature store repository to view its lineage.
      </EmptyStateBody>
    </EmptyState>
  );

  if (!currentProject) {
    return emptyState;
  }

  const [hideNodesWithoutRelationships, setHideNodesWithoutRelationships] = useState(false);
  const [searchFilters, setSearchFilters] = useState<FeatureStoreLineageSearchFilters>({});

  // Create component factory with FeatureStoreLineageNode
  const componentFactory = useMemo(
    () => createLineageComponentFactory(FeatureStoreLineageNode),
    [],
  );

  const {
    data: lineageData,
    loaded: lineageDataLoaded,
    error,
  } = useFeatureStoreLineage(currentProject);

  const [conversionError, setConversionError] = useState<string | null>(null);

  // Convert feature store lineage data to visualization format with filtering
  const visualizationData = useMemo(() => {
    setConversionError(null); // Reset conversion error

    if (!lineageDataLoaded || error) {
      // Return empty data when loading or error - let the Lineage component handle these states
      return { nodes: [], edges: [] };
    }

    if (Object.keys(lineageData).length === 0) {
      // No data available - return empty data for proper empty state
      return { nodes: [], edges: [] };
    }

    try {
      const baseResult = convertFeatureStoreLineageToVisualizationData(lineageData);

      // Apply filters using utility function
      const filteredResult = applyLineageFilters(baseResult, {
        hideNodesWithoutRelationships,
        searchFilters,
      });

      return filteredResult;
    } catch (err) {
      setConversionError(`Failed to process lineage data: ${String(err)}`);
      return { nodes: [], edges: [] };
    }
  }, [lineageData, lineageDataLoaded, error, hideNodesWithoutRelationships, searchFilters]);

  const ToolbarComponent = () => (
    <FeatureStoreLineageToolbar
      hideNodesWithoutRelationships={hideNodesWithoutRelationships}
      onHideNodesWithoutRelationshipsChange={setHideNodesWithoutRelationships}
      searchFilters={searchFilters}
      onSearchFiltersChange={setSearchFilters}
      lineageData={lineageData}
      lineageDataLoaded={lineageDataLoaded}
    />
  );

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      style={{ height: '100%' }}
    >
      <Lineage
        data={visualizationData}
        loading={!lineageDataLoaded}
        error={
          error ? `Failed to load lineage data: ${String(error)}` : conversionError || undefined
        }
        emptyStateMessage="No lineage data available for this feature store repository"
        height="100%"
        componentFactory={componentFactory}
        popoverComponent={FeatureStoreLineageNodePopover}
        toolbarComponent={ToolbarComponent}
        autoResetOnDataChange // Auto-reset view when filters are applied
      />
    </PageSection>
  );
};

export default FeatureStoreLineage;
