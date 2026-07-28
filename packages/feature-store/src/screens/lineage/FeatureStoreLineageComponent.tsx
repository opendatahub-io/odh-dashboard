import React, { useMemo, useState, useEffect } from 'react';
import { EmptyStateVariant, EmptyStateBody, EmptyState, PageSection } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Lineage } from '@odh-dashboard/internal/components/lineage/Lineage';
import { createLineageComponentFactory } from '@odh-dashboard/internal/components/lineage/factories';
import { useLineageCenter } from '@odh-dashboard/internal/components/lineage/context/LineageCenterContext';
import FeatureStoreLineageNode from './node/FeatureStoreLineageNode';
import FeatureStoreLineageNodePopover from './node/FeatureStoreLineageNodePopover';
import { applyLineageFilters } from './utils';
import { LineagePageProvider } from './LineagePageContext';
import FeatureStoreLineageToolbar from '../../components/FeatureStoreLineageToolbar';
import useFeatureStoreLineage from '../../apiHooks/useFeatureStoreLineage';
import useFeatureViewLineage from '../../apiHooks/useFeatureViewLineage';
import {
  convertFeatureStoreLineageToVisualizationData,
  convertFeatureViewLineageToVisualizationData,
} from '../../utils/lineageDataConverter';
import { FeatureStoreLineageSearchFilters } from '../../types/toolbarTypes';
import { FeatureStoreLineage, FeatureViewLineage } from '../../types/lineage';
import { FeatureView } from '../../types/featureView';
import { FeatureColumns } from '../../types/features';

interface FeatureStoreLineageComponentProps {
  project?: string;
  featureViewName?: string;
  featureViewType?: FeatureView['type'];
  currentFeatureViewFeatures?: FeatureColumns[];
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  height?: string;
}

const FeatureStoreLineageComponent: React.FC<FeatureStoreLineageComponentProps> = ({
  project,
  featureViewName,
  featureViewType,
  currentFeatureViewFeatures,
  emptyStateTitle = 'Select a feature store',
  emptyStateMessage = 'Select a feature store to view its lineage.',
  height = '100%',
}) => {
  const [hideNodesWithoutRelationships, setHideNodesWithoutRelationships] = useState(false);
  const [searchFilters, setSearchFilters] = useState<FeatureStoreLineageSearchFilters>({});
  const [currentFilterType, setCurrentFilterType] =
    useState<keyof FeatureStoreLineageSearchFilters>('entity');
  const { triggerCenter, forceCenter } = useLineageCenter();
  const [lineageKey, setLineageKey] = useState(0);
  const featureViewLineageState = useFeatureViewLineage(project, featureViewName);
  const featureStoreLineageState = useFeatureStoreLineage(featureViewName ? undefined : project);

  // Force re-render when forceCenter is triggered (tab switch)
  useEffect(() => {
    if (forceCenter) {
      setLineageKey((prev) => prev + 1);
    }
  }, [forceCenter]);

  const {
    data: lineageData,
    loaded: lineageDataLoaded,
    error,
  } = featureViewName ? featureViewLineageState : featureStoreLineageState;

  const componentFactory = useMemo(
    () => createLineageComponentFactory(FeatureStoreLineageNode),
    [],
  );

  const { visualizationData, conversionError } = useMemo(() => {
    const empty = { nodes: [], edges: [] };

    if (!lineageDataLoaded || error) {
      return { visualizationData: empty, conversionError: null };
    }

    if (featureViewName) {
      try {
        const baseResult = convertFeatureViewLineageToVisualizationData(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          lineageData as FeatureViewLineage,
          featureViewName,
          featureViewType,
          currentFeatureViewFeatures,
        );

        const filteredResult = applyLineageFilters(baseResult, {
          hideNodesWithoutRelationships,
          searchFilters,
        });

        return { visualizationData: filteredResult, conversionError: null };
      } catch (err) {
        return {
          visualizationData: empty,
          conversionError: `Failed to process feature view lineage data: ${String(err)}`,
        };
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

        return { visualizationData: filteredResult, conversionError: null };
      } catch (err) {
        return {
          visualizationData: empty,
          conversionError: `Failed to process lineage data: ${String(err)}`,
        };
      }
    }

    return { visualizationData: empty, conversionError: null };
  }, [
    lineageData,
    lineageDataLoaded,
    error,
    hideNodesWithoutRelationships,
    searchFilters,
    featureViewName,
    featureViewType,
    currentFeatureViewFeatures,
  ]);

  // Trigger centering when filters change - but only after data is processed
  useEffect(() => {
    if (lineageDataLoaded && !error && visualizationData.nodes.length > 0) {
      // Add delay to ensure the filtered data is fully rendered before centering
      const centerTimeout = setTimeout(() => {
        triggerCenter();
      }, 100); // Small delay to ensure rendering is complete

      return () => clearTimeout(centerTimeout);
    }
    return undefined;
  }, [
    searchFilters,
    hideNodesWithoutRelationships,
    lineageDataLoaded,
    error,
    visualizationData,
    triggerCenter,
  ]);

  const ToolbarComponent = () => (
    <FeatureStoreLineageToolbar
      hideNodesWithoutRelationships={hideNodesWithoutRelationships}
      onHideNodesWithoutRelationshipsChange={setHideNodesWithoutRelationships}
      searchFilters={searchFilters}
      onSearchFiltersChange={setSearchFilters}
      currentFilterType={currentFilterType}
      onCurrentFilterTypeChange={setCurrentFilterType}
      lineageData={lineageData}
      lineageDataLoaded={lineageDataLoaded}
      isFeatureViewToolbar={!!featureViewName}
    />
  );

  const PopoverComponent = (props: Parameters<typeof FeatureStoreLineageNodePopover>[0]) => (
    <FeatureStoreLineageNodePopover {...props} featureViewName={featureViewName} />
  );

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

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      style={{ height, display: 'flex', flexDirection: 'column' }}
    >
      <LineagePageProvider pageType={featureViewName ? 'detail' : 'overview'}>
        <Lineage
          key={lineageKey}
          data={visualizationData}
          loading={!lineageDataLoaded}
          error={
            error ? `Failed to load lineage data: ${String(error)}` : conversionError || undefined
          }
          emptyStateMessage={
            featureViewName
              ? 'No lineage data available for this feature view'
              : 'No lineage data available for this feature store'
          }
          height="100%"
          componentFactory={componentFactory}
          popoverComponent={PopoverComponent}
          toolbarComponent={ToolbarComponent}
          autoResetOnDataChange
        />
      </LineagePageProvider>
    </PageSection>
  );
};

export default FeatureStoreLineageComponent;
