import {
  Alert,
  Button,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, TimesIcon } from '@patternfly/react-icons';
import React from 'react';
import type { PipelineStatusFilter } from '~/app/topology/tree-view/PipelineDisplayContext';
import { getStepMetadata } from '~/app/topology/tree-view/stepMetadata';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import './StepDetailsPanel.scss';

type StepDetailsPanelProps = {
  selectedNodeId?: string;
  nodeData?: TreeNodeData;
  selectedModel?: string;
  isPreparing?: boolean;
  statusFilter?: PipelineStatusFilter;
  onClose?: () => void;
};

const getStatusBarClass = (stepState: TreeNodeData['stepState']): string => {
  switch (stepState) {
    case 'completed':
      return 'automl-step-details__status-bar--completed';
    case 'active':
      return 'automl-step-details__status-bar--in-progress';
    case 'failed':
      return 'automl-step-details__status-bar--failed';
    case 'unreached':
    case 'pending':
      return 'automl-step-details__status-bar--pending';
    default:
      return 'automl-step-details__status-bar--pending';
  }
};

const getStatusText = (stepState: TreeNodeData['stepState']): string => {
  switch (stepState) {
    case 'completed':
      return 'Succeeded';
    case 'active':
      return 'In Progress';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
};

const StepDetailsPanel: React.FC<StepDetailsPanelProps> = ({
  selectedNodeId,
  nodeData,
  selectedModel,
  isPreparing,
  statusFilter,
  onClose,
}) => {
  if (!selectedNodeId || !nodeData) {
    return (
      <div className="automl-step-details" data-testid="step-details-empty">
        <div className="automl-step-details__panel-header">
          <Title headingLevel="h3" size="lg">
            Step details
          </Title>
          {onClose && (
            <Button
              variant="plain"
              aria-label="Close step details"
              icon={<TimesIcon />}
              onClick={onClose}
              data-testid="close-step-details"
            />
          )}
        </div>
        <Content component={ContentVariants.p} className="automl-step-details__placeholder">
          {isPreparing
            ? 'Pipeline steps will appear on the left once the run structure is ready. Select a completed step to view its metrics.'
            : 'Click on any node in the pipeline to view its details here.'}
        </Content>
      </div>
    );
  }

  const metadata = getStepMetadata(selectedNodeId, nodeData.label, nodeData.stepState);
  const isBestModel =
    statusFilter === 'completed' &&
    selectedModel != null &&
    nodeData.label === selectedModel &&
    (selectedNodeId.includes('__model__') || /^p\d+-model$/.test(selectedNodeId)) &&
    nodeData.stepState === 'completed';
  const panelTitle = isBestModel ? 'Best model' : nodeData.label;
  const showCloseButton = statusFilter !== 'completed';

  return (
    <div className="automl-step-details" data-testid="step-details-panel">
      <Stack hasGutter>
        <StackItem>
          <div className="automl-step-details__panel-header">
            <Title headingLevel="h3" size="lg">
              {panelTitle}
            </Title>
            {onClose && showCloseButton && (
              <Button
                variant="plain"
                aria-label="Close step details"
                icon={<TimesIcon />}
                onClick={onClose}
                data-testid="close-step-details"
              />
            )}
          </div>
        </StackItem>

        <StackItem>
          <div
            className={`automl-step-details__status-bar ${getStatusBarClass(nodeData.stepState)}`}
            data-testid="step-status-label"
          >
            {getStatusText(nodeData.stepState)}
          </div>
        </StackItem>

        {nodeData.stepState === 'failed' && (
          <StackItem>
            <Alert
              variant="danger"
              title="This step failed"
              customIcon={<ExclamationCircleIcon />}
              data-testid="step-failed-alert"
            >
              The pipeline stopped during {panelTitle}. Branch steps are reported as a single group
              — remaining steps were not run.
            </Alert>
          </StackItem>
        )}

        <StackItem>
          <Title headingLevel="h4" size="md" className="automl-step-details__section-title">
            Description
          </Title>
          <Content component={ContentVariants.p}>{metadata.description}</Content>
        </StackItem>

        {nodeData.stepState === 'active' && (
          <StackItem>
            <div
              className="automl-step-details__executing-banner"
              data-testid="step-executing-banner"
            >
              Currently executing
            </div>
          </StackItem>
        )}

        {nodeData.stepState === 'completed' && (
          <StackItem>
            <div className="automl-step-details__success-banner" data-testid="step-success-banner">
              Succeeded
            </div>
          </StackItem>
        )}

        {nodeData.stepState === 'failed' && (
          <StackItem>
            <div className="automl-step-details__failed-banner" data-testid="step-failed-banner">
              Step failed
            </div>
          </StackItem>
        )}

        <StackItem>
          <Title headingLevel="h4" size="md" className="automl-step-details__section-title">
            Details
          </Title>
          {nodeData.stepState === 'active' ? (
            <Content component={ContentVariants.p} className="automl-step-details__placeholder">
              Step metrics will appear here after this step completes.
            </Content>
          ) : (
            <DescriptionList isHorizontal isCompact className="automl-step-details__details-list">
              {metadata.details.map((detail) => (
                <DescriptionListGroup key={detail.label}>
                  <DescriptionListTerm>{detail.label}</DescriptionListTerm>
                  <DescriptionListDescription>{detail.value}</DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          )}
        </StackItem>
      </Stack>
    </div>
  );
};

export default StepDetailsPanel;
