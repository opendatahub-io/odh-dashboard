import React from 'react';

import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { TableVariant, Td, Tr } from '@patternfly/react-table';

import { Artifact } from '#~/third_party/mlmd';
import { Table } from '#~/components/table';
import { ArtifactType } from '#~/concepts/pipelines/kfTypes';
import {
  buildRocCurveConfig,
  isConfidenceMetric,
} from '#~/concepts/pipelines/content/compareRuns/metricsSection/roc/utils';
import ROCCurve from '#~/concepts/pipelines/content/artifacts/charts/ROCCurve';
import ConfusionMatrix from '#~/concepts/pipelines/content/artifacts/charts/confusionMatrix/ConfusionMatrix';
import { buildConfusionMatrixConfig } from '#~/concepts/pipelines/content/artifacts/charts/confusionMatrix/utils';
import { isConfusionMatrix } from '#~/concepts/pipelines/content/compareRuns/metricsSection/confusionMatrix/utils';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useArtifactStorage } from '#~/concepts/pipelines/apiHooks/useArtifactStorage';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { getArtifactProperties } from './utils';

interface ArtifactVisualizationProps {
  artifact: Artifact;
}

export const ArtifactVisualization: React.FC<ArtifactVisualizationProps> = ({ artifact }) => {
  const [renderUrl, setRenderUrl] = React.useState<string>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const { namespace } = usePipelinesAPI();
  const { getStorageObjectRenderUrl } = useArtifactStorage();
  const artifactType = artifact.getType();

  const memoizedArtifact = useDeepCompareMemoize(artifact);

  React.useEffect(() => {
    if (artifactType === ArtifactType.MARKDOWN || artifactType === ArtifactType.HTML) {
      const uri = memoizedArtifact.getUri();
      if (uri) {
        const renderArtifact = async () => {
          await getStorageObjectRenderUrl(memoizedArtifact)
            .then((url) => setRenderUrl(url))
            .catch(() => null);
          setLoading(false);
        };
        setLoading(true);
        setRenderUrl(undefined);
        renderArtifact();
      }
    }
  }, [memoizedArtifact, getStorageObjectRenderUrl, artifactType, namespace]);

  if (artifactType === ArtifactType.CLASSIFICATION_METRICS) {
    const confusionMatrix = artifact.getCustomPropertiesMap().get('confusionMatrix');
    const confidenceMetrics = artifact.getCustomPropertiesMap().get('confidenceMetrics');

    if (confusionMatrix) {
      const confusionMatrixValue = confusionMatrix.getStructValue()?.toJavaScript().struct;

      return isConfusionMatrix(confusionMatrixValue) ? (
        <Stack className="pf-v6-u-pt-lg pf-v6-u-pb-lg" hasGutter>
          <Title headingLevel="h3">Confusion matrix metrics</Title>

          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <ConfusionMatrix config={buildConfusionMatrixConfig(confusionMatrixValue)} />
          </Flex>
        </Stack>
      ) : null;
    }

    if (confidenceMetrics) {
      const confidenceMetricsList = confidenceMetrics.getStructValue()?.toJavaScript().list;

      return Array.isArray(confidenceMetricsList) &&
        confidenceMetricsList.every(isConfidenceMetric) ? (
        <Stack className="pf-v6-u-pt-lg pf-v6-u-pb-lg">
          <Title headingLevel="h3">ROC curve</Title>

          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <ROCCurve
              maxContainerWidth={650}
              configs={[buildRocCurveConfig(confidenceMetricsList, 0)]}
            />
          </Flex>
        </Stack>
      ) : null;
    }
  }

  if (artifactType === ArtifactType.METRICS) {
    const artifactProperties = getArtifactProperties(artifact);

    return (
      <Stack className="pf-v6-u-pt-lg pf-v6-u-pb-lg">
        <Title headingLevel="h3">Scalar metrics</Title>

        <StackItem>
          <Table
            data={artifactProperties}
            columns={[
              {
                label: 'Name',
                field: 'name',
                sortable: (a, b) => a.name.localeCompare(b.name),
              },
              {
                label: 'Value',
                field: 'value',
                sortable: (a, b) => a.value.localeCompare(b.value),
              },
            ]}
            enablePagination="compact"
            emptyTableView={
              <EmptyState
                headingLevel="h4"
                titleText="No scalar metrics"
                variant={EmptyStateVariant.sm}
                data-testid="artifact-scalar-metrics-empty-state"
              >
                <EmptyStateBody>No scalar metrics found.</EmptyStateBody>
              </EmptyState>
            }
            rowRenderer={(scalarMetric) => (
              <Tr>
                <Td dataLabel="name">{scalarMetric.name}</Td>
                <Td dataLabel="value" modifier="breakWord">
                  {scalarMetric.value}
                </Td>
              </Tr>
            )}
            variant={TableVariant.compact}
            data-testid="artifact-scalar-metrics-table"
            id="artifact-scalar-metrics-table"
          />
        </StackItem>
      </Stack>
    );
  }

  if (artifactType === ArtifactType.MARKDOWN || artifactType === ArtifactType.HTML) {
    if (loading) {
      return (
        <Bullseye className="pf-v6-u-pt-lg">
          <Spinner />
        </Bullseye>
      );
    }
    if (renderUrl) {
      return (
        <Stack className="pf-v6-u-pt-lg pf-v6-u-pb-lg" hasGutter>
          <StackItem>
            <Title headingLevel="h3">Artifact details</Title>
          </StackItem>
          <StackItem>
            <iframe src={renderUrl} data-testid="artifact-visualization" title="Artifact details" />
          </StackItem>
        </Stack>
      );
    }
  }

  return (
    <EmptyState
      headingLevel="h4"
      titleText="There are no metric artifacts available in this step."
      variant={EmptyStateVariant.xs}
    />
  );
};
