import * as React from 'react';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Content,
  DrawerHead,
  DrawerPanelBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Spinner,
  Title,
} from '@patternfly/react-core';
import {
  CubesIcon,
  InfrastructureIcon,
  ListIcon,
  ResourcesEmptyIcon,
} from '@patternfly/react-icons';
import QuotaUsageAcceleratorTable from './QuotaUsageAcceleratorTable';
import QuotaUsageSummarySection from './QuotaUsageSummarySection';
import QuotaUsageWorkloadsCollapsible from './QuotaUsageWorkloadsCollapsible';
import useClusterQueueWorkloads from '../../hooks/useClusterQueueWorkloads';
import KueueProjectsModal from '../KueueProjectsModal';
import {
  QUOTA_UNASSIGNED_LABEL,
  QUOTA_UNASSIGNED_TOOLTIP,
  QUOTA_USAGE_BORROWING,
} from '../../const';
import { QuotaUsageDetailData } from '../../hooks/useQuotaUsageDetail';
import { QUOTA_NODE_TYPE, QuotaSelection, QuotaTreeNode } from '../../types';
import { selectionFromPath } from '../../utils/quotaUsageTreeUtils';

const scrollableBodyClassName = 'pf-v6-u-min-height-0 pf-v6-u-overflow-auto';

type QuotaUsageDetailPanelProps = {
  tree: QuotaTreeNode[];
  selection?: QuotaSelection;
  onSelectionChange: (selection: QuotaSelection) => void;
  detail?: QuotaUsageDetailData;
  detailLoaded: boolean;
  error?: Error;
};

export type DetailState =
  | { type: 'error'; error: Error }
  | { type: 'loading' }
  | { type: 'loaded'; detail: QuotaUsageDetailData; error?: Error }
  | { type: 'empty' };

export const getDetailState = (
  detailLoaded: boolean,
  detail: QuotaUsageDetailData | undefined,
  error: Error | undefined,
): DetailState => {
  if (!detailLoaded) {
    return error ? { type: 'error', error } : { type: 'loading' };
  }

  return detail ? { type: 'loaded', detail, error } : { type: 'empty' };
};

const QuotaUsageDetailPanel: React.FC<QuotaUsageDetailPanelProps> = ({
  tree,
  selection,
  onSelectionChange,
  detail,
  detailLoaded,
  error,
}) => {
  const [kueueModalOpen, setKueueModalOpen] = React.useState(false);
  const selectedClusterQueueName =
    selection?.type === QUOTA_NODE_TYPE.clusterQueue ? selection.clusterQueueName : undefined;
  const clusterQueueWorkloads = useClusterQueueWorkloads(selectedClusterQueueName);

  const handleBreadcrumbClick = React.useCallback(
    (index: number) => {
      if (!selection) {
        return;
      }
      const pathPrefix = selection.path.slice(0, index + 1);
      const nextSelection = selectionFromPath(tree, pathPrefix);
      if (nextSelection) {
        onSelectionChange(nextSelection);
      }
    },
    [onSelectionChange, selection, tree],
  );

  const handleSelectClusterQueue = React.useCallback(
    (path: string[]) => {
      const nextSelection = selectionFromPath(tree, path);
      if (nextSelection) {
        onSelectionChange(nextSelection);
      }
    },
    [onSelectionChange, tree],
  );

  if (!selection) {
    return (
      <DrawerPanelBody className={scrollableBodyClassName}>
        <Content component="p" data-testid="quota-usage-detail-empty">
          Select a cohort or cluster queue to view quota usage details.
        </Content>
      </DrawerPanelBody>
    );
  }

  let displayName: string;
  let typeLabel: string;
  let typeIcon: React.ReactNode;
  let labelColor: 'green' | 'blue' | undefined;

  switch (selection.type) {
    case QUOTA_NODE_TYPE.unassigned:
      displayName = QUOTA_UNASSIGNED_LABEL;
      typeLabel = 'Unassigned';
      typeIcon = <ResourcesEmptyIcon aria-hidden />;
      labelColor = undefined;
      break;
    case QUOTA_NODE_TYPE.cohort:
      displayName = selection.cohortName;
      typeLabel = 'Cohort';
      typeIcon = <InfrastructureIcon aria-hidden />;
      labelColor = 'green';
      break;
    case QUOTA_NODE_TYPE.clusterQueue:
      displayName = selection.clusterQueueName;
      typeLabel = 'Cluster queue';
      typeIcon = <ListIcon aria-hidden />;
      labelColor = 'blue';
      break;
  }

  const showBreadcrumb = selection.path.length > 1 && selection.path[0] !== QUOTA_UNASSIGNED_LABEL;
  const showWorkloadsSection = selection.type === QUOTA_NODE_TYPE.clusterQueue;
  const showBorrowingEnabledBadge =
    selection.type === QUOTA_NODE_TYPE.cohort && detail?.summary.borrowingEnabled === true;

  const detailState = getDetailState(detailLoaded, detail, error);

  const renderDetailContent = (): React.ReactNode => {
    switch (detailState.type) {
      case 'error':
        return (
          <StackItem>
            <EmptyState
              headingLevel="h4"
              icon={CubesIcon}
              titleText="Error loading quota usage details"
              variant={EmptyStateVariant.sm}
              data-testid="quota-usage-detail-error"
            >
              <EmptyStateBody>{detailState.error.message}</EmptyStateBody>
            </EmptyState>
          </StackItem>
        );
      case 'loading':
        return (
          <StackItem>
            <Flex
              justifyContent={{ default: 'justifyContentCenter' }}
              className="pf-v6-u-py-3xl"
              data-testid="quota-usage-detail-loading"
            >
              <Spinner size="lg" aria-label="Loading quota usage details" />
            </Flex>
          </StackItem>
        );
      case 'empty':
        return (
          <StackItem>
            <Content component="p" data-testid="quota-usage-detail-no-data">
              {selection.type === QUOTA_NODE_TYPE.unassigned
                ? QUOTA_UNASSIGNED_TOOLTIP
                : 'No accelerator usage data available.'}
            </Content>
          </StackItem>
        );
      case 'loaded':
        return (
          <>
            {error && (
              <StackItem>
                <Alert
                  isInline
                  variant="warning"
                  title="Some usage telemetry is unavailable"
                  data-testid="quota-usage-detail-partial-error"
                />
              </StackItem>
            )}
            <StackItem>
              <QuotaUsageSummarySection
                summary={detailState.detail.summary}
                perModelRows={detailState.detail.acceleratorRows}
                selectionType={selection.type}
                cohortName={
                  selection.type === QUOTA_NODE_TYPE.cohort ? selection.cohortName : undefined
                }
                showKueueProjectsLink={detailState.detail.showKueueProjectsLink}
                onViewKueueProjects={() => setKueueModalOpen(true)}
                onSelectClusterQueue={handleSelectClusterQueue}
                clusterQueueName={detailState.detail.clusterQueueName}
                nominalQuota={detailState.detail.summary.totalNominal}
                workloads={selectedClusterQueueName ? clusterQueueWorkloads.workloads : undefined}
                workloadsLoaded={
                  selectedClusterQueueName ? clusterQueueWorkloads.loaded : undefined
                }
                workloadsError={selectedClusterQueueName ? clusterQueueWorkloads.error : undefined}
              />
            </StackItem>
            <StackItem>
              <QuotaUsageAcceleratorTable
                rows={detailState.detail.acceleratorRows}
                summary={detailState.detail.summary}
              />
            </StackItem>
          </>
        );
    }
  };

  return (
    <>
      <DrawerHead data-testid="quota-usage-detail-panel">
        <Stack hasGutter>
          {showBreadcrumb && (
            <Breadcrumb data-testid="quota-usage-breadcrumb">
              {selection.path.map((segment, index) => {
                const isActive = index === selection.path.length - 1;
                if (isActive) {
                  return (
                    <BreadcrumbItem key={`${segment}-${index}`} isActive>
                      {segment}
                    </BreadcrumbItem>
                  );
                }
                return (
                  <BreadcrumbItem
                    key={`${segment}-${index}`}
                    component="button"
                    onClick={() => handleBreadcrumbClick(index)}
                    data-testid={`quota-usage-breadcrumb-${segment}`}
                  >
                    {segment}
                  </BreadcrumbItem>
                );
              })}
            </Breadcrumb>
          )}
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
            <FlexItem>
              <Title headingLevel="h2" size="lg" data-testid="quota-usage-detail-title">
                {displayName}
              </Title>
            </FlexItem>
            <FlexItem>
              <Label color={labelColor} variant="filled" isCompact icon={typeIcon}>
                {typeLabel}
              </Label>
            </FlexItem>
            {showBorrowingEnabledBadge && (
              <FlexItem>
                <Label
                  color="orange"
                  variant="outline"
                  isCompact
                  data-testid="quota-usage-borrowing-enabled-badge"
                >
                  {QUOTA_USAGE_BORROWING.enabledLabel}
                </Label>
              </FlexItem>
            )}
          </Flex>
        </Stack>
      </DrawerHead>
      <DrawerPanelBody className={`${scrollableBodyClassName} pf-v6-u-pt-lg`}>
        <Stack hasGutter className="pf-v6-u-p-md">
          {renderDetailContent()}
          {showWorkloadsSection && (
            <StackItem>
              <QuotaUsageWorkloadsCollapsible
                clusterQueueName={selection.clusterQueueName}
                workloads={clusterQueueWorkloads.workloads}
                loaded={clusterQueueWorkloads.loaded}
                error={clusterQueueWorkloads.error}
              />
            </StackItem>
          )}
        </Stack>
      </DrawerPanelBody>
      {kueueModalOpen && detail?.clusterQueueName && (
        <KueueProjectsModal
          clusterQueueName={detail.clusterQueueName}
          onClose={() => setKueueModalOpen(false)}
        />
      )}
    </>
  );
};

export default QuotaUsageDetailPanel;
