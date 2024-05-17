import React from 'react';

import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateVariant,
  Flex,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { TableVariant, Td, Tr } from '@patternfly/react-table';

import { Artifact } from '~/third_party/mlmd';
import { Table } from '~/components/table';
import { ArtifactType } from '~/concepts/pipelines/kfTypes';
import {
  buildRocCurveConfig,
  isConfidenceMetric,
} from '~/concepts/pipelines/content/compareRuns/metricsSection/roc/utils';
import ROCCurve from '~/concepts/pipelines/content/artifacts/charts/ROCCurve';
import ConfusionMatrix from '~/concepts/pipelines/content/artifacts/charts/confusionMatrix/ConfusionMatrix';
import { buildConfusionMatrixConfig } from '~/concepts/pipelines/content/artifacts/charts/confusionMatrix/utils';
import { isConfusionMatrix } from '~/concepts/pipelines/content/compareRuns/metricsSection/confusionMatrix/utils';

interface ArtifactVisualizationProps {
  artifact: Artifact;
}

export const ArtifactVisualization: React.FC<ArtifactVisualizationProps> = ({ artifact }) => {
  const artifactType = artifact.getType();

  if (artifactType === ArtifactType.CLASSIFICATION_METRICS) {
    const confusionMatrix = artifact.getCustomPropertiesMap().get('confusionMatrix');
    const confidenceMetrics = artifact.getCustomPropertiesMap().get('confidenceMetrics');

    if (confusionMatrix) {
      const confusionMatrixValue = confusionMatrix.getStructValue()?.toJavaScript().struct;

      return isConfusionMatrix(confusionMatrixValue) ? (
        <Stack className="pf-v5-u-pt-lg pf-v5-u-pb-lg" hasGutter>
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
        <Stack className="pf-v5-u-pt-lg pf-v5-u-pb-lg">
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
    const scalarMetrics = artifact
      .toObject()
      .customPropertiesMap.reduce(
        (
          acc: { name: string; value: string }[],
          [customPropKey, { stringValue, intValue, doubleValue, boolValue }],
        ) => {
          if (customPropKey !== 'display_name') {
            acc.push({
              name: customPropKey,
              value: stringValue || (intValue || doubleValue || boolValue).toString(),
            });
          }

          return acc;
        },
        [],
      );

    return (
      <Stack className="pf-v5-u-pt-lg pf-v5-u-pb-lg">
        <Title headingLevel="h3">Scalar metrics</Title>

        <StackItem>
          <Table
            data={scalarMetrics}
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
                variant={EmptyStateVariant.sm}
                data-testid="artifact-scalar-metrics-empty-state"
              >
                <EmptyStateHeader titleText="No scalar metrics" headingLevel="h4" />
                <EmptyStateBody>No scalar metrics found.</EmptyStateBody>
              </EmptyState>
            }
            rowRenderer={(scalarMetric) => (
              <Tr>
                <Td dataLabel="name">{scalarMetric.name}</Td>
                <Td dataLabel="value">{scalarMetric.value}</Td>
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

  if (artifactType === ArtifactType.HTML || artifactType === ArtifactType.MARKDOWN) {
    return (
      <EmptyState variant={EmptyStateVariant.xs}>
        <EmptyStateHeader titleText="Content is not available yet." headingLevel="h4" />
      </EmptyState>
    );
  }

  return null;
};
