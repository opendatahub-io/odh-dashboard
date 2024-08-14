import React from 'react';

import {
  Alert,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateVariant,
  Flex,
  Spinner,
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
import { MAX_STORAGE_OBJECT_SIZE } from '~/services/storageService';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { extractS3UriComponents } from '~/concepts/pipelines/content/artifacts/utils';
import MarkdownView from '~/components/MarkdownView';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { bytesAsRoundedGiB } from '~/utilities/number';
import { useArtifactStorage } from '~/concepts/pipelines/apiHooks/useArtifactStorage';
import { getArtifactProperties } from './utils';

interface ArtifactVisualizationProps {
  artifact: Artifact;
}

export const ArtifactVisualization: React.FC<ArtifactVisualizationProps> = ({ artifact }) => {
  const [downloadedArtifact, setDownloadedArtifact] = React.useState<string | null>(null);
  const [downloadedArtifactSize, setDownloadedArtifactSize] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const { namespace } = usePipelinesAPI();
  const isArtifactApiAvailable = useIsAreaAvailable(SupportedArea.ARTIFACT_API).status;
  const artifactStorage = useArtifactStorage();
  const artifactType = artifact.getType();

  React.useEffect(() => {
    if (!artifactStorage.enabled) {
      return;
    }

    if (artifactType === ArtifactType.MARKDOWN || artifactType === ArtifactType.HTML) {
      const uri = artifact.getUri();
      if (uri) {
        const uriComponents = extractS3UriComponents(uri);
        if (uriComponents) {
          const downloadArtifact = async (currentArtifact: Artifact) => {
            await artifactStorage
              .getStorageObjectSize(currentArtifact)
              .then((size) => setDownloadedArtifactSize(size))
              .catch(() => null);
            await artifactStorage
              .getStorageObject(artifact)
              .then((text) => setDownloadedArtifact(text))
              .catch(() => null);
            setLoading(false);
          };
          setLoading(true);
          setDownloadedArtifact(null);
          setDownloadedArtifactSize(null);
          downloadArtifact(artifact);
        }
      }
    }
  }, [artifact, artifactStorage, artifactType, namespace]);

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
    const artifactProperties = getArtifactProperties(artifact);

    return (
      <Stack className="pf-v5-u-pt-lg pf-v5-u-pb-lg">
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

  if (artifactType === ArtifactType.MARKDOWN || artifactType === ArtifactType.HTML) {
    if (loading) {
      return (
        <Bullseye>
          <Spinner />
        </Bullseye>
      );
    }
    if (downloadedArtifact) {
      return (
        <Stack className="pf-v5-u-pt-lg pf-v5-u-pb-lg" hasGutter>
          {downloadedArtifactSize && downloadedArtifactSize > MAX_STORAGE_OBJECT_SIZE && (
            <StackItem>
              <Alert isInline variant="warning" title="Oversized file">
                {`This file is ${bytesAsRoundedGiB(
                  downloadedArtifactSize,
                )} GB in size but we do not fetch files over 100MB. To view the full file, please download it from your S3 bucket.`}
              </Alert>
            </StackItem>
          )}
          <StackItem>
            <Title headingLevel="h3">Artifact details</Title>
          </StackItem>
          <StackItem>
            {isArtifactApiAvailable ? (
              <iframe src={downloadedArtifact} title="Artifact details" />
            ) : (
              <MarkdownView markdown={downloadedArtifact} />
            )}
          </StackItem>
        </Stack>
      );
    }
  }

  return (
    <EmptyState variant={EmptyStateVariant.xs}>
      <EmptyStateHeader
        titleText="There are no metric artifacts available in this step."
        headingLevel="h4"
      />
    </EmptyState>
  );
};
