import {
  Alert,
  Button,
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
  Flex,
  FlexItem,
  Label,
  Popover,
  Spinner,
  type SpinnerProps,
  Stack,
  StackItem,
  Title,
  type TitleProps,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import React from 'react';
import { ExecutorLogsTearsheet } from '@odh-dashboard/autox-core/ui/components/feature';
import { useTaskExecutorError } from '@odh-dashboard/autox-core/ui/hooks';
import { useAutomlResultsContext } from '~/app/context/AutomlResultsContext';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import { useAutomlOutputDir } from '~/app/hooks/useAutomlOutputDir';
import type { PipelineRun } from '~/app/types';
import { getSelectedModels, BRANCHING_STAGE_ID } from '~/app/topology/stageMapStatus';
import type { PipelineStatusFilter } from '~/app/topology/tree-view/types';
import { getStepMetadata, type StepDetail } from '~/app/topology/tree-view/stepMetadata';
import {
  parseStageMapNodeId,
  type ParsedStageMapNode,
} from '~/app/topology/tree-view/stageMapStepMetadata';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import { resolveBestModelKey } from '~/app/utilities/utils';
import {
  getPipelineDetailsEmptyContent,
  getPipelineStatusFilterLabel,
  getPipelineStatusLabelProps,
  getPipelineTreeLoadingContent,
  getStepDetailsLoadingContent,
  getStepStateLabel,
  STAGE_MAP_UNAVAILABLE_NOTICE,
  type PipelineStatusLabel,
  type PipelineTreeLoadingMode,
} from './pipelineStatusLabels';
import { getPipelineSummaryDetails } from './pipelineSummaryMetadata';
import './StepDetailsPanel.scss';

type StepDetailsPanelProps = {
  selectedNodeId?: string;
  nodeData?: TreeNodeData;
  /** Validated models-record key for the pipeline best model. */
  selectedModel?: string;
  statusFilter?: PipelineStatusFilter;
  treeLoadingMode?: PipelineTreeLoadingMode;
  componentStageMap?: ComponentStageMap;
  pipelineRun?: PipelineRun;
  showStageMapUnavailableNotice?: boolean;
  /** Namespace of the run — used to fetch executor logs for failed steps. */
  namespace?: string;
  onClose?: () => void;
};

const resolveBranchModelKey = (
  parsedNodeId: ParsedStageMapNode | undefined,
  componentStageMap: ComponentStageMap | undefined,
  models: Record<string, { name?: string } | null | undefined>,
  topN?: number,
): string | undefined => {
  if (parsedNodeId?.type !== 'branch_model' || !componentStageMap) {
    return undefined;
  }
  const component = componentStageMap.components.find((c) => c.id === parsedNodeId.componentId);
  if (!component) {
    return undefined;
  }
  const { models: branchModels, isPlaceholder } = getSelectedModels(
    component.stages,
    topN,
    Object.keys(models),
  );
  if (isPlaceholder) {
    return undefined;
  }
  return resolveBestModelKey(models, branchModels[parsedNodeId.branchIndex]);
};

type StepDetailTermProps = {
  detail: StepDetail;
};

const StepDetailTerm: React.FC<StepDetailTermProps> = ({ detail }) => {
  if (!detail.help) {
    return <DescriptionListTerm>{detail.label}</DescriptionListTerm>;
  }

  return (
    <DescriptionListTerm>
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapXs' }}>
        <FlexItem>{detail.label}</FlexItem>
        <FlexItem>
          <Popover
            aria-label={`${detail.help.header} help`}
            headerContent={detail.help.header}
            bodyContent={detail.help.body}
          >
            <DashboardPopupIconButton
              aria-label={`More info for ${detail.label.toLowerCase()}`}
              icon={<OutlinedQuestionCircleIcon />}
              hasNoPadding
              data-testid={`step-detail-help-${detail.label.toLowerCase().replace(/\s+/g, '-')}`}
            />
          </Popover>
        </FlexItem>
      </Flex>
    </DescriptionListTerm>
  );
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
          <Label
            variant="outline"
            {...getPipelineStatusLabelProps(statusLabel)}
            data-testid="step-status-label"
          >
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
  spinnerSize?: SpinnerProps['size'];
  titleSize?: TitleProps['size'];
};

const StepDetailsLoadingBody: React.FC<StepDetailsLoadingBodyProps> = ({
  primaryText,
  secondaryText,
  spinnerSize = 'xl',
  titleSize = 'xl',
}) => (
  <div className="automl-step-details__empty-state">
    <div className="automl-step-details__empty-state-content">
      <Spinner size={spinnerSize} className="automl-step-details__empty-state-spinner" />
      <Title headingLevel="h3" size={titleSize} className="automl-step-details__empty-state-title">
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
  showStageMapUnavailableNotice = false,
  namespace,
  onClose,
}) => {
  const { models, parameters } = useAutomlResultsContext();
  const pipelineSummaryDetails = React.useMemo(
    () => getPipelineSummaryDetails(pipelineRun, componentStageMap, models, parameters),
    [pipelineRun, componentStageMap, models, parameters],
  );

  // Hooks must run unconditionally, above the early return below.
  const parsedNodeId = selectedNodeId ? parseStageMapNodeId(selectedNodeId) : undefined;
  const { rootDir } = useAutomlOutputDir(pipelineRun);
  // Stage-map nodes resolve to their component; fallback-topology node ids are
  // the KFP task names themselves.
  const taskKey = selectedNodeId ? (parsedNodeId?.componentId ?? selectedNodeId) : undefined;
  const executorError = useTaskExecutorError({
    namespace,
    runId: pipelineRun?.run_id,
    pipelineRun,
    taskKey,
    rootDir,
    enabled: nodeData?.stepState === 'failed',
  });
  const [isLogsTearsheetOpen, setIsLogsTearsheetOpen] = React.useState(false);

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
              {showStageMapUnavailableNotice && (
                <StackItem>
                  <Alert
                    variant="danger"
                    isInline
                    title={STAGE_MAP_UNAVAILABLE_NOTICE.title}
                    data-testid="stage-map-unavailable-alert"
                  >
                    {STAGE_MAP_UNAVAILABLE_NOTICE.description}
                  </Alert>
                </StackItem>
              )}
              <StackItem>
                <Content component={ContentVariants.p} className="automl-step-details__description">
                  {emptyContent.secondaryText}
                </Content>
              </StackItem>
              {showPipelineSummary && (
                <StackItem>
                  <DescriptionList isCompact data-testid="pipeline-summary-details">
                    {pipelineSummaryDetails.map((detail, index) => (
                      <DescriptionListGroup key={`${detail.label}-${index}`}>
                        <StepDetailTerm detail={detail} />
                        <DescriptionListDescription>{detail.value}</DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                </StackItem>
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
  const branchModelKey = resolveBranchModelKey(
    parsedNodeId,
    componentStageMap,
    models,
    parameters?.top_n,
  );
  const isBestModel =
    statusFilter === 'completed' &&
    selectedModel != null &&
    branchModelKey === selectedModel &&
    parsedNodeId?.type === 'branch_model' &&
    nodeData.stepState === 'completed';
  const panelTitle = isBestModel ? 'Best model' : (nodeData.label ?? 'Step details');
  const statusLabel = getStepStateLabel(nodeData.stepState);
  const inProgressLoadingContent = getStepDetailsLoadingContent();
  const isStepLoading = nodeData.stepState === 'active';
  const isBranchingStage =
    parsedNodeId?.type === 'stage' && parsedNodeId.stageId === BRANCHING_STAGE_ID;

  return (
    <>
      <StepDetailsPanelHeader title={panelTitle} statusLabel={statusLabel} onClose={onClose} />
      <DrawerPanelBody className="automl-step-details" data-testid="step-details-panel">
        <Stack hasGutter>
          {nodeData.stepState === 'failed' && (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title="This step failed"
                customIcon={<ExclamationCircleIcon />}
                data-testid="step-failed-alert"
              >
                The pipeline stopped during {panelTitle}.
                {isBranchingStage
                  ? ' Branch steps are reported as a single group — remaining steps were not run.'
                  : null}
                {executorError.isLoading ? (
                  <div
                    className="automl-step-details__error-status"
                    data-testid="step-failed-error-loading"
                  >
                    <Spinner size="sm" /> Retrieving failure details…
                  </div>
                ) : executorError.logText ? (
                  <div className="automl-step-details__logs-action">
                    <Button
                      variant="link"
                      isInline
                      onClick={() => setIsLogsTearsheetOpen(true)}
                      data-testid="step-failed-view-logs"
                    >
                      View logs
                    </Button>
                  </div>
                ) : null}
              </Alert>
            </StackItem>
          )}
          {nodeData.stepState === 'unreached' && (
            <StackItem>
              <Alert
                variant="warning"
                isInline
                title="Step not attempted"
                data-testid="step-not-attempted-alert"
              >
                {statusFilter === 'error'
                  ? 'This step was not attempted because the pipeline failed at an earlier step.'
                  : 'This step was skipped and was not attempted.'}
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
                spinnerSize="lg"
                titleSize="lg"
              />
            </StackItem>
          ) : (
            <StackItem>
              <DescriptionList isCompact>
                {metadata.details.map((detail, index) => (
                  <DescriptionListGroup key={`${detail.label}-${index}`}>
                    <StepDetailTerm detail={detail} />
                    <DescriptionListDescription>{detail.value}</DescriptionListDescription>
                  </DescriptionListGroup>
                ))}
              </DescriptionList>
            </StackItem>
          )}
        </Stack>
      </DrawerPanelBody>
      {executorError.logText ? (
        <ExecutorLogsTearsheet
          logText={executorError.logText}
          isOpen={isLogsTearsheetOpen}
          onClose={() => setIsLogsTearsheetOpen(false)}
          stepLabel={panelTitle}
        />
      ) : null}
    </>
  );
};

export default StepDetailsPanel;
