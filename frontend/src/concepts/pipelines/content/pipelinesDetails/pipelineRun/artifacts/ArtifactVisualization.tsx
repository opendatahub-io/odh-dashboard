import React from 'react';

import {
  Button,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports -- ContentModal adds a constrained body height that causes double scrollbars with the iframe/markdown scroll containers
  Modal,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalBody,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalHeader,
  Spinner,
  Stack,
  StackItem,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { ExpandIcon } from '@patternfly/react-icons';
import { TableVariant, Td, Tr } from '@patternfly/react-table';

import { Table } from '@odh-dashboard/ui-core';
import { useDeepCompareMemoize } from '@odh-dashboard/ui-core/hooks';
import { Artifact } from '#~/third_party/mlmd';
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
import MarkdownComponent from '#~/components/markdown/MarkdownComponent';
import { getArtifactProperties, readBoundedText } from './utils';
import './ArtifactVisualization.scss';

interface ArtifactVisualizationProps {
  artifact: Artifact;
}

export const ArtifactVisualization: React.FC<ArtifactVisualizationProps> = ({ artifact }) => {
  const [renderUrl, setRenderUrl] = React.useState<string>();
  const [markdownContent, setMarkdownContent] = React.useState<string>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { namespace } = usePipelinesAPI();
  const { getStorageObjectRenderUrl, getStorageObjectDownloadUrl } = useArtifactStorage();
  const artifactType = artifact.getType();

  const memoizedArtifact = useDeepCompareMemoize(artifact);

  React.useEffect(() => {
    if (artifactType !== ArtifactType.MARKDOWN && artifactType !== ArtifactType.HTML) {
      return undefined;
    }
    const uri = memoizedArtifact.getUri();
    if (!uri) {
      return undefined;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    setLoading(true);
    setRenderUrl(undefined);
    setMarkdownContent(undefined);

    const renderArtifact = async () => {
      if (artifactType === ArtifactType.MARKDOWN) {
        let content: string | undefined;
        try {
          const url = await getStorageObjectDownloadUrl(memoizedArtifact);
          if (url && !signal.aborted) {
            const response = await fetch(url, { signal });
            if (response.ok) {
              content = await readBoundedText(response);
            }
          }
        } catch {
          // Fall through to render URL fallback
        }
        if (!signal.aborted) {
          if (content) {
            setMarkdownContent(content);
          } else {
            const url = await getStorageObjectRenderUrl(memoizedArtifact).catch(() => undefined);
            setRenderUrl(url);
          }
        }
      } else if (!signal.aborted) {
        await getStorageObjectRenderUrl(memoizedArtifact)
          .then((url) => {
            if (!signal.aborted) {
              setRenderUrl(url);
            }
          })
          .catch(() => null);
      }
      if (!signal.aborted) {
        setLoading(false);
      }
    };

    renderArtifact();

    return () => {
      abortController.abort();
    };
  }, [
    memoizedArtifact,
    getStorageObjectRenderUrl,
    getStorageObjectDownloadUrl,
    artifactType,
    namespace,
  ]);

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

    const hasContent = markdownContent || renderUrl;
    if (hasContent) {
      const visualizationContent = markdownContent ? (
        <MarkdownComponent data={markdownContent} dataTestId="artifact-visualization" />
      ) : (
        <iframe
          className="odh-artifact-visualization__iframe pf-v6-u-w-100"
          sandbox="allow-scripts"
          src={renderUrl}
          data-testid="artifact-visualization"
          title="Artifact details"
        />
      );

      const fullscreenContent = markdownContent ? (
        <div className="odh-artifact-visualization__markdown--fullscreen">
          <MarkdownComponent
            data={markdownContent}
            dataTestId="artifact-visualization-fullscreen"
          />
        </div>
      ) : (
        <iframe
          className="odh-artifact-visualization__iframe--fullscreen pf-v6-u-w-100"
          sandbox="allow-scripts"
          src={renderUrl}
          data-testid="artifact-visualization-fullscreen"
          title="Artifact details"
        />
      );

      return (
        <Stack className="pf-v6-u-pt-lg pf-v6-u-pb-lg" hasGutter>
          <StackItem>
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <Title headingLevel="h3">Artifact details</Title>
              </FlexItem>
              <FlexItem>
                <Tooltip content="Expand">
                  <Button
                    variant="plain"
                    aria-label="Expand visualization"
                    onClick={() => setIsFullscreen(true)}
                    data-testid="artifact-visualization-expand"
                    icon={<ExpandIcon />}
                  />
                </Tooltip>
              </FlexItem>
            </Flex>
          </StackItem>
          <StackItem>{visualizationContent}</StackItem>
          {isFullscreen && (
            <Modal
              isOpen
              onClose={() => setIsFullscreen(false)}
              variant="large"
              aria-label="Artifact visualization expanded"
            >
              <ModalHeader title="Artifact visualization" />
              <ModalBody>{fullscreenContent}</ModalBody>
            </Modal>
          )}
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
