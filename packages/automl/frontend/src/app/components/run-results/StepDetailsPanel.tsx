import {
  Alert,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  Label,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { useAutomlResultsContext } from '~/app/context/AutomlResultsContext';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import type { PipelineStatusFilter } from '~/app/topology/tree-view/types';
import { getStepMetadata } from '~/app/topology/tree-view/stepMetadata';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import {
  getPipelineDetailsEmptyContent,
  getPipelineStatusFilterLabel,
  getPipelineTreeLoadingContent,
  getStepStateLabel,
  type PipelineStatusLabel,
  type PipelineTreeLoadingMode,
} from './pipelineStatusLabels';
import { getPipelineSummaryDetails } from './pipelineSummaryMetadata';
import './StepDetailsPanel.scss';

type StepDetailsPanelProps = {
  selectedNodeId?: string;
  nodeData?: TreeNodeData;
  selectedModel?: string;
  statusFilter?: PipelineStatusFilter;
  treeLoadingMode?: PipelineTreeLoadingMode;
  componentStageMap?: ComponentStageMap;
  pipelineRun?: PipelineRun;
  onClose?: () => void;
};

type StepDetailsPanelHeaderProps = {
  title: string;
  statusLabel?: PipelineStatusLabel;
  onClose?: () => void;
};

const StepDetailsPanelHeader: React.FC<StepDetailsPanelHeaderProps> = ({
  title,
  statusLabel,
  onClose,
}) => (
  <DrawerHead>
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3" size="lg">
          {title}
        </Title>
      </StackItem>
      {statusLabel && (
        <StackItem>
          <Label variant="outline" color={statusLabel.color} data-testid="step-status-label">
            {statusLabel.text}
          </Label>
        </StackItem>
      )}
    </Stack>
    {onClose && (
      <DrawerActions>
        <DrawerCloseButton onClick={onClose} data-testid="close-step-details" />
      </DrawerActions>
    )}
  </DrawerHead>
);

type StepDetailsLoadingBodyProps = {
  primaryText: string;
  secondaryText: string;
};

const StepDetailsLoadingBody: React.FC<StepDetailsLoadingBodyProps> = ({
  primaryText,
  secondaryText,
}) => (
  <div className="automl-step-details__empty-state">
    <div className="automl-step-details__empty-state-content">
      <Spinner size="xl" className="automl-step-details__empty-state-spinner" />
      <Title headingLevel="h3" size="xl" className="automl-step-details__empty-state-title">
        {primaryText}
      </Title>
      <Content component={ContentVariants.p} className="automl-step-details__empty-state-subtitle">
        {secondaryText}
      </Content>
    </div>
  </div>
);

const StepDetailsPanel: React.FC<StepDetailsPanelProps> = ({
  selectedNodeId,
  nodeData,
  selectedModel,
  statusFilter,
  treeLoadingMode,
  componentStageMap,
  pipelineRun,
  onClose,
}) => {
  const { models, parameters } = useAutomlResultsContext();
  const pipelineSummaryDetails = React.useMemo(
    () => getPipelineSummaryDetails(pipelineRun, componentStageMap, models, parameters),
    [pipelineRun, componentStageMap, models, parameters],
  );

  if (!selectedNodeId || !nodeData) {
    const resolvedStatusFilter = statusFilter ?? 'loading';
    const pipelineStatusLabel = getPipelineStatusFilterLabel(resolvedStatusFilter);
    const emptyContent =
      treeLoadingMode === 'hydrating'
        ? {
            ...getPipelineTreeLoadingContent('hydrating'),
            variant: 'loading' as const,
          }
        : getPipelineDetailsEmptyContent(resolvedStatusFilter);
    const showPipelineSummary = resolvedStatusFilter === 'completed';

    return (
      <>
        <StepDetailsPanelHeader
          title={emptyContent.title}
          statusLabel={pipelineStatusLabel}
          onClose={onClose}
        />
        <DrawerPanelBody className="automl-step-details" data-testid="step-details-empty">
          {emptyContent.variant === 'loading' ? (
            <StepDetailsLoadingBody
              primaryText={emptyContent.primaryText ?? emptyContent.title}
              secondaryText={emptyContent.secondaryText ?? ''}
            />
          ) : (
            <Stack hasGutter>
              <StackItem>
                <Content component={ContentVariants.p} className="automl-step-details__description">
                  {emptyContent.secondaryText}
                </Content>
              </StackItem>
              {showPipelineSummary && (
                <>
                  <StackItem>
                    <Title headingLevel="h4" size="md">
                      Details
                    </Title>
                  </StackItem>
                  <StackItem>
                    <DescriptionList isCompact data-testid="pipeline-summary-details">
                      {pipelineSummaryDetails.map((detail) => (
                        <DescriptionListGroup key={detail.label}>
                          <DescriptionListTerm>{detail.label}:</DescriptionListTerm>
                          <DescriptionListDescription>{detail.value}</DescriptionListDescription>
                        </DescriptionListGroup>
                      ))}
                    </DescriptionList>
                  </StackItem>
                </>
              )}
            </Stack>
          )}
        </DrawerPanelBody>
      </>
    );
  }

  const metadata = getStepMetadata(selectedNodeId, nodeData.label ?? '', nodeData.stepState, {
    componentStageMap,
    pipelineRun,
  });
  const isBestModel =
    statusFilter === 'completed' &&
    selectedModel != null &&
    nodeData.label === selectedModel &&
    selectedNodeId.includes('__model__') &&
    nodeData.stepState === 'completed';
  const panelTitle = isBestModel ? 'Best model' : (nodeData.label ?? 'Step details');
  const statusLabel = getStepStateLabel(nodeData.stepState);
  const inProgressLoadingContent = getPipelineDetailsEmptyContent('in-progress');
  const isStepLoading = nodeData.stepState === 'active';

  return (
    <>
      <StepDetailsPanelHeader title={panelTitle} statusLabel={statusLabel} onClose={onClose} />
      <DrawerPanelBody className="automl-step-details" data-testid="step-details-panel">
        <Stack hasGutter>
          {nodeData.stepState === 'failed' && (
            <StackItem>
              <Alert
                variant="danger"
                title="This step failed"
                customIcon={<ExclamationCircleIcon />}
                data-testid="step-failed-alert"
              >
                The pipeline stopped during {panelTitle}. Branch steps are reported as a single
                group — remaining steps were not run.
              </Alert>
            </StackItem>
          )}

          <StackItem>
            <Content component={ContentVariants.p} className="automl-step-details__description">
              {metadata.description}
            </Content>
          </StackItem>

          {isStepLoading ? (
            <StackItem>
              <StepDetailsLoadingBody
                primaryText={inProgressLoadingContent.primaryText ?? inProgressLoadingContent.title}
                secondaryText={inProgressLoadingContent.secondaryText ?? ''}
              />
            </StackItem>
          ) : (
            <>
              <StackItem>
                <Title headingLevel="h4" size="md">
                  Details
                </Title>
              </StackItem>

              <StackItem>
                <DescriptionList isCompact>
                  {metadata.details.map((detail) => (
                    <DescriptionListGroup key={detail.label}>
                      <DescriptionListTerm>{detail.label}:</DescriptionListTerm>
                      <DescriptionListDescription>{detail.value}</DescriptionListDescription>
                    </DescriptionListGroup>
                  ))}
                </DescriptionList>
              </StackItem>
            </>
          )}
        </Stack>
      </DrawerPanelBody>
    </>
  );
};

export default StepDetailsPanel;
