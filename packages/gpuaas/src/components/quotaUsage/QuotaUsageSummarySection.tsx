import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  Popover,
  Stack,
  StackItem,
  Skeleton,
} from '@patternfly/react-core';
import * as React from 'react';
import QuotaUsageAccordionSection from './QuotaUsageAccordionSection';
import QuotaUsageMeter from './QuotaUsageMeter';
import { QUOTA_USAGE_BORROWING, QUOTA_USAGE_SUMMARY } from '../../const';
import { useClusterQueueBorrowingSince } from '../../hooks/useBorrowingLendingMetrics';
import {
  QUOTA_NODE_TYPE,
  QUOTA_USAGE_METER_VARIANT,
  QuotaSelection,
  QuotaUsageBorrowingClusterQueue,
  QuotaUsageSummary,
  ClusterQueueWorkloadRow,
} from '../../types';
import { ModelGpuCount } from '../../utils/hardwareModels';
import { formatBorrowingSinceDate } from '../../utils/borrowingLending';
import { summarizeQuotaUsageWorkloads } from '../../utils/quotaUsageAggregation';

type QuotaUsageSummarySectionProps = {
  summary: QuotaUsageSummary;
  perModelRows: ModelGpuCount[];
  selectionType?: QuotaSelection['type'];
  cohortName?: string;
  showKueueProjectsLink?: boolean;
  onViewKueueProjects?: () => void;
  onSelectClusterQueue?: (path: string[]) => void;
  clusterQueueName?: string;
  nominalQuota?: number;
  error?: Error;
  workloads?: ClusterQueueWorkloadRow[];
  workloadsLoaded?: boolean;
  workloadsError?: Error;
};

const MetricTitle: React.FC<{ label: string }> = ({ label }) => (
  <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
    <FlexItem>
      <Content component="p" className="pf-v6-u-mb-xs">
        {label}
      </Content>
    </FlexItem>
  </Flex>
);

const BorrowingClusterQueueList: React.FC<{
  cohortName: string;
  borrowingClusterQueues: QuotaUsageBorrowingClusterQueue[];
  onSelectClusterQueue: (path: string[]) => void;
}> = ({ cohortName, borrowingClusterQueues, onSelectClusterQueue }) => (
  <Stack hasGutter data-testid="quota-usage-borrowing-cluster-queue-list">
    {borrowingClusterQueues.map(({ clusterQueueName, path }) => (
      <StackItem key={clusterQueueName}>
        <Content component="small">
          <Button
            variant="link"
            isInline
            onClick={() => onSelectClusterQueue(path)}
            data-testid={`quota-usage-borrowing-cluster-queue-link-${clusterQueueName}`}
          >
            <strong>{clusterQueueName}</strong>
          </Button>
          {QUOTA_USAGE_BORROWING.cohortCalloutSuffix(cohortName)}
        </Content>
      </StackItem>
    ))}
  </Stack>
);

const BorrowingPopoverLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Content component="small">
    <strong>{label}</strong> {value}
  </Content>
);

const BorrowingInfo: React.FC<{
  borrowedCount: number;
  cohortName: string;
  clusterQueueName?: string;
  nominalQuota: number;
  perModelRows: ModelGpuCount[];
}> = ({ borrowedCount, cohortName, clusterQueueName, nominalQuota, perModelRows }) => {
  const borrowedModels = perModelRows.filter(
    (row): row is ModelGpuCount & { borrowed: number } => (row.borrowed ?? 0) > 0,
  );
  const { borrowingSinceMs } = useClusterQueueBorrowingSince(
    clusterQueueName,
    nominalQuota,
    Boolean(clusterQueueName) && nominalQuota > 0 && borrowedCount > 0,
  );

  const borrowingValue =
    borrowedModels.length > 0
      ? borrowedModels
          .map((row) => QUOTA_USAGE_BORROWING.popoverModelLine(row.borrowed, row.model))
          .join(', ')
      : `${borrowedCount} x ${cohortName}`;

  const popoverBody = (
    <Stack hasGutter data-testid="quota-usage-borrowing-popover-body">
      <StackItem>
        <BorrowingPopoverLine
          label={QUOTA_USAGE_BORROWING.popoverBorrowingLabel}
          value={borrowingValue}
        />
      </StackItem>
      {borrowingSinceMs !== undefined && (
        <StackItem>
          <BorrowingPopoverLine
            label={QUOTA_USAGE_BORROWING.popoverSinceLabel}
            value={formatBorrowingSinceDate(borrowingSinceMs)}
          />
        </StackItem>
      )}
    </Stack>
  );

  return (
    <Popover bodyContent={popoverBody}>
      <Button variant="link" isInline data-testid="quota-usage-borrowing-link">
        {QUOTA_USAGE_BORROWING.label(borrowedCount, cohortName)}
      </Button>
    </Popover>
  );
};

const QuotaUsageSummarySection: React.FC<QuotaUsageSummarySectionProps> = ({
  summary,
  perModelRows,
  selectionType,
  cohortName,
  showKueueProjectsLink,
  onViewKueueProjects,
  onSelectClusterQueue,
  clusterQueueName,
  nominalQuota,
  error,
  workloads,
  workloadsLoaded = true,
  workloadsError,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const workloadSummary =
    workloads && workloads.length > 0 && workloadsLoaded && !workloadsError
      ? summarizeQuotaUsageWorkloads(workloads)
      : summary;

  const handleViewKueueProjects = () => {
    onViewKueueProjects?.();
  };

  const body = error ? (
    <Alert
      isInline
      variant="danger"
      title="Error loading quota usage summary"
      data-testid="quota-usage-summary-error"
    >
      {error.message}
    </Alert>
  ) : (
    <Stack hasGutter>
      <StackItem data-testid="quota-usage-summary-workloads-wrap">
        <Content component="p" className="pf-v6-u-mb-xs">
          <strong>{QUOTA_USAGE_SUMMARY.workloads}</strong>
        </Content>
        <Content
          component="p"
          className="pf-v6-u-mb-sm"
          data-testid="quota-usage-summary-workloads"
        >
          {workloads && !workloadsLoaded && !workloadsError ? (
            <Skeleton
              data-testid="quota-usage-summary-workloads-loading"
              width="140px"
              height="1em"
              screenreaderText="Loading workload summary"
            />
          ) : (
            workloadSummary.workloadSummaryLine
          )}
        </Content>
      </StackItem>
      <StackItem data-testid="quota-usage-summary-metrics-wrap">
        <Content component="p" className="pf-v6-u-mb-md">
          <strong>{QUOTA_USAGE_SUMMARY.acceleratorTableTitle}</strong>
        </Content>
        <Flex
          className="pf-v6-u-w-100"
          gap={{ default: 'gapMd' }}
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'wrap' }}
        >
          <FlexItem flex={{ default: 'flex_1' }}>
            <MetricTitle label={QUOTA_USAGE_SUMMARY.capacity} />
            <QuotaUsageMeter
              variant={QUOTA_USAGE_METER_VARIANT.capacity}
              used={summary.totalUsed}
              capacity={summary.capacityDisplayNominal}
              ariaLabel={QUOTA_USAGE_SUMMARY.capacity}
              showAcceleratorsLabel
              compact
              data-testid="quota-usage-summary-capacity"
            />
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <MetricTitle label={QUOTA_USAGE_SUMMARY.compute} />
            <QuotaUsageMeter
              variant={QUOTA_USAGE_METER_VARIANT.utilization}
              used={summary.totalUsed}
              capacity={summary.capacityDisplayNominal}
              percentage={summary.computeUtilization}
              showOverQuotaVisual={summary.isOverQuota}
              ariaLabel={QUOTA_USAGE_SUMMARY.compute}
              compact
              data-testid="quota-usage-summary-compute"
            />
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <MetricTitle label={QUOTA_USAGE_SUMMARY.memory} />
            <QuotaUsageMeter
              variant={QUOTA_USAGE_METER_VARIANT.utilization}
              used={summary.totalUsed}
              capacity={summary.capacityDisplayNominal}
              percentage={summary.memoryUtilization}
              showOverQuotaVisual={summary.isOverQuota}
              ariaLabel={QUOTA_USAGE_SUMMARY.memory}
              compact
              data-testid="quota-usage-summary-memory"
            />
          </FlexItem>
        </Flex>
      </StackItem>
      {selectionType === QUOTA_NODE_TYPE.clusterQueue &&
        summary.showBorrowingInfo &&
        summary.borrowSourceCohortName && (
          <StackItem>
            <BorrowingInfo
              borrowedCount={summary.totalBorrowed}
              cohortName={summary.borrowSourceCohortName}
              clusterQueueName={clusterQueueName}
              nominalQuota={nominalQuota ?? summary.totalNominal}
              perModelRows={perModelRows}
            />
          </StackItem>
        )}
      {selectionType === QUOTA_NODE_TYPE.cohort &&
        cohortName &&
        summary.borrowingClusterQueues.length > 0 &&
        onSelectClusterQueue && (
          <StackItem>
            <BorrowingClusterQueueList
              cohortName={cohortName}
              borrowingClusterQueues={summary.borrowingClusterQueues}
              onSelectClusterQueue={onSelectClusterQueue}
            />
          </StackItem>
        )}
    </Stack>
  );

  return (
    <QuotaUsageAccordionSection
      isSummary
      id="quota-usage-summary"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((expanded) => !expanded)}
      data-testid="quota-usage-summary-section"
      title={QUOTA_USAGE_SUMMARY.title}
      headerActions={
        showKueueProjectsLink && onViewKueueProjects ? (
          <Button
            variant="link"
            isInline
            aria-label="View Kueue projects using this cluster queue"
            onClick={handleViewKueueProjects}
            data-testid="quota-usage-view-kueue-projects"
          >
            {QUOTA_USAGE_SUMMARY.viewKueueProjects}
          </Button>
        ) : undefined
      }
    >
      {body}
    </QuotaUsageAccordionSection>
  );
};

export default QuotaUsageSummarySection;
