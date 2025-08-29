import React, { useMemo, useState } from 'react';
import { Alert } from '@patternfly/react-core';
import { Lineage } from '@odh-dashboard/internal/components/lineage/Lineage';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureStoreLineage from '../../../apiHooks/useFeatureStoreLineage';
import { convertFeatureStoreLineageToVisualizationData } from '../../../utils/lineageDataConverter';

const FeatureStoreLineage: React.FC = () => {
  const { currentProject } = useFeatureStoreProject();

  if (!currentProject) {
    return (
      <Alert variant="warning" isInline title="No project selected">
        Please select a feature store project to view lineage data.
      </Alert>
    );
  }

  const {
    data: lineageData,
    loaded: lineageDataLoaded,
    error,
  } = useFeatureStoreLineage(currentProject);

  const [conversionError, setConversionError] = useState<string | null>(null);

  // Convert feature store lineage data to visualization format
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
      const result = convertFeatureStoreLineageToVisualizationData(lineageData);
      return result;
    } catch (err) {
      setConversionError(`Failed to process lineage data: ${String(err)}`);
      return { nodes: [], edges: [] };
    }
  }, [lineageData, lineageDataLoaded, error]);

  return (
    <Lineage
      data={visualizationData}
      loading={!lineageDataLoaded}
      error={error ? `Failed to load lineage data: ${String(error)}` : conversionError || undefined}
      emptyStateMessage="No lineage data available for this feature store project"
      height="100%"
    />
  );
};

export default FeatureStoreLineage;
