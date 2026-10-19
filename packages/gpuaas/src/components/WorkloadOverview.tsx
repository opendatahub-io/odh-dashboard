import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Content,
  ExpandableSection,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Popover,
  Spinner,
  Stack,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import {
  t_chart_color_blue_300 as chartBlue,
  t_chart_color_green_300 as chartGreen,
  t_chart_color_orange_300 as chartOrange,
  t_chart_color_yellow_300 as chartYellow,
  t_chart_global_danger_color_100 as chartRed,
} from '@patternfly/react-tokens';
import useWorkloadAdmissionMetrics from '../hooks/useWorkloadAdmissionMetrics';
import {
  overviewBuckets,
  summarizeOverview,
  type OverviewBucket,
  type WorkloadOverviewRow,
} from '../utils/workloadOverview';
import './InfrastructureWorkloadsSection.scss';

const WorkloadAdmissionsTab = React.lazy(() => import('./WorkloadAdmissionsTab'));

type WorkloadOverviewProps = {
  workloads: WorkloadOverviewRow[];
  loaded: boolean;
  kueueAvailable?: boolean;
  canAccessAdminMetrics?: boolean;
  namespace?: string;
  dataUnavailable?: boolean;
  partial?: boolean;
  error?: Error;
  refreshTrigger?: number;
  onViewInTable?: (bucket: OverviewBucket) => void;
};

type WorkloadStatusPopoverProps = {
  bucket: OverviewBucket;
  details: Record<string, number>;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  onViewInTable?: () => void;
  children: React.ReactElement;
};

type WorkloadStatusControlProps = {
  bucket: OverviewBucket;
  details: Record<string, number>;
  source: 'count' | 'chart';
  visiblePopover?: { bucket: OverviewBucket; source: 'count' | 'chart' };
  onPopoverOpen: (bucket: OverviewBucket, source: 'count' | 'chart') => void;
  onPopoverClose: () => void;
  onViewInTable?: (bucket: OverviewBucket) => void;
  children: React.ReactElement;
};

type WorkloadStatusCountsProps = Pick<
  WorkloadStatusControlProps,
  'visiblePopover' | 'onPopoverOpen' | 'onPopoverClose' | 'onViewInTable'
> & {
  counts: Record<OverviewBucket, number>;
  details: Record<OverviewBucket, Record<string, number>>;
};

type WorkloadStatusTabProps = {
  total: number;
  counts: Record<OverviewBucket, number>;
  details: Record<OverviewBucket, Record<string, number>>;
  visiblePopover?: { bucket: OverviewBucket; source: 'count' | 'chart' };
  onPopoverOpen: (bucket: OverviewBucket, source: 'count' | 'chart') => void;
  onPopoverClose: () => void;
  onViewInTable?: (bucket: OverviewBucket) => void;
};

const labels: Record<OverviewBucket, string> = {
  completed: 'Completed',
  active: 'Active',
  waiting: 'Waiting',
  blockers: 'Blockers',
  failed: 'Failed',
};

const colors: Record<OverviewBucket, string> = {
  completed: chartGreen.var,
  active: chartBlue.var,
  waiting: chartYellow.var,
  blockers: chartOrange.var,
  failed: chartRed.var,
};

const WorkloadStatusPopover: React.FC<WorkloadStatusPopoverProps> = ({
  bucket,
  details,
  visible,
  onOpen,
  onClose,
  onViewInTable,
  children,
}) => (
  <Popover
    aria-label={`${labels[bucket]} workloads`}
    headerContent={
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
        <span
          aria-hidden="true"
          style={{
            width: 'var(--pf-t--global--spacer--sm)',
            height: 'var(--pf-t--global--spacer--sm)',
            backgroundColor: colors[bucket],
          }}
        />
        <Content component="small">{labels[bucket]} workloads</Content>
      </Flex>
    }
    isVisible={visible}
    shouldOpen={onOpen}
    shouldClose={onClose}
    bodyContent={
      <>
        {onViewInTable && (
          <Button variant="link" isInline className="pf-v6-u-mb-sm" onClick={onViewInTable}>
            View in table
          </Button>
        )}
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapNone' }}>
          {Object.entries(details).map(([detail, count]) => (
            <FlexItem key={detail}>
              {count} {detail}
            </FlexItem>
          ))}
        </Flex>
      </>
    }
  >
    {children}
  </Popover>
);

const WorkloadStatusControl: React.FC<WorkloadStatusControlProps> = ({
  bucket,
  details,
  source,
  visiblePopover,
  onPopoverOpen,
  onPopoverClose,
  onViewInTable,
  children,
}) => {
  if (!onViewInTable) {
    return children;
  }

  return (
    <WorkloadStatusPopover
      bucket={bucket}
      details={details}
      visible={visiblePopover?.bucket === bucket && visiblePopover.source === source}
      onOpen={() => onPopoverOpen(bucket, source)}
      onClose={onPopoverClose}
      onViewInTable={() => {
        onPopoverClose();
        onViewInTable(bucket);
      }}
    >
      {children}
    </WorkloadStatusPopover>
  );
};

const WorkloadStatusCounts: React.FC<WorkloadStatusCountsProps> = ({
  counts,
  details,
  visiblePopover,
  onPopoverOpen,
  onPopoverClose,
  onViewInTable,
}) => (
  <>
    {overviewBuckets.map((bucket) => (
      <FlexItem key={bucket} className="gpuaas-workload-overview__count">
        <WorkloadStatusControl
          bucket={bucket}
          details={details[bucket]}
          source="count"
          visiblePopover={visiblePopover}
          onPopoverOpen={onPopoverOpen}
          onPopoverClose={onPopoverClose}
          onViewInTable={counts[bucket] > 0 ? onViewInTable : undefined}
        >
          {counts[bucket] > 0 ? (
            <Button variant="plain" isInline data-testid={`workload-count-${bucket}`}>
              <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
                <Title headingLevel="h3" size="lg">
                  {counts[bucket]}
                </Title>
                <Content component="p">{labels[bucket]}</Content>
              </Flex>
            </Button>
          ) : (
            <div data-testid={`workload-count-${bucket}`}>
              <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
                <Title headingLevel="h3" size="lg">
                  {counts[bucket]}
                </Title>
                <Content component="p">{labels[bucket]}</Content>
              </Flex>
            </div>
          )}
        </WorkloadStatusControl>
      </FlexItem>
    ))}
  </>
);

const WorkloadOverviewEmptyState: React.FC = () => (
  <EmptyState titleText="No workloads" headingLevel="h3">
    <EmptyStateBody>Supported workloads in this project will appear here.</EmptyStateBody>
  </EmptyState>
);

const WorkloadStatusTab: React.FC<WorkloadStatusTabProps> = ({
  total,
  counts,
  details,
  visiblePopover,
  onPopoverOpen,
  onPopoverClose,
  onViewInTable,
}) => (
  <Stack className="gpuaas-workload-overview__status" data-testid="workload-overview-status">
    <Flex className="gpuaas-workload-overview__counts">
      <FlexItem className="gpuaas-workload-overview__total">
        <Content component="h3">{total}</Content>
        <Content component="p">
          <strong>Total workloads</strong>
        </Content>
      </FlexItem>
      <WorkloadStatusCounts
        counts={counts}
        details={details}
        visiblePopover={visiblePopover}
        onPopoverOpen={onPopoverOpen}
        onPopoverClose={onPopoverClose}
        onViewInTable={onViewInTable}
      />
    </Flex>
    <div className="gpuaas-workload-overview__bar" role="group" aria-label="Workloads by status">
      {overviewBuckets
        .filter((bucket) => counts[bucket] > 0)
        .map((bucket) => {
          const percentage = Math.round((counts[bucket] / total) * 100);
          return (
            <div
              key={bucket}
              className="gpuaas-workload-overview__bar-item"
              style={{ flexGrow: counts[bucket] }}
            >
              <WorkloadStatusControl
                bucket={bucket}
                details={details[bucket]}
                source="chart"
                visiblePopover={visiblePopover}
                onPopoverOpen={onPopoverOpen}
                onPopoverClose={onPopoverClose}
                onViewInTable={onViewInTable}
              >
                <button
                  type="button"
                  data-testid={`workload-segment-${bucket}`}
                  className="gpuaas-workload-overview__segment"
                  style={{ backgroundColor: colors[bucket] }}
                  data-status={bucket}
                  aria-label={`${labels[bucket]}: ${counts[bucket]} of ${total} workloads (${percentage}%)`}
                >
                  {percentage >= 6 ? `${percentage}%` : null}
                </button>
              </WorkloadStatusControl>
            </div>
          );
        })}
    </div>
    <Flex className="gpuaas-workload-overview__legend" spaceItems={{ default: 'spaceItemsLg' }}>
      {overviewBuckets.map((bucket) => (
        <FlexItem key={bucket}>
          <span
            className="gpuaas-workload-overview__swatch"
            style={{ backgroundColor: colors[bucket] }}
          />
          {labels[bucket]}
        </FlexItem>
      ))}
    </Flex>
  </Stack>
);

const WorkloadOverview: React.FC<WorkloadOverviewProps> = ({
  workloads,
  loaded,
  kueueAvailable = false,
  canAccessAdminMetrics = false,
  namespace,
  dataUnavailable = false,
  partial = false,
  error,
  refreshTrigger = 0,
  onViewInTable,
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<string | number>('status');
  const [timeWindow, setTimeWindow] = React.useState('24h');
  const admissionMetrics = useWorkloadAdmissionMetrics(
    namespace,
    timeWindow,
    kueueAvailable && activeTab === 'admissions',
    canAccessAdminMetrics,
    refreshTrigger,
  );
  const [visiblePopover, setVisiblePopover] = React.useState<
    { bucket: OverviewBucket; source: 'count' | 'chart' } | undefined
  >();
  const { counts, details, total } = React.useMemo(() => summarizeOverview(workloads), [workloads]);

  return (
    <Card data-testid="workload-overview">
      <CardBody>
        <ExpandableSection
          className="gpuaas-workload-overview"
          isExpanded={expanded}
          onToggle={(_event, nextExpanded) => setExpanded(nextExpanded)}
          toggleContent={
            <Title headingLevel="h4" size="md">
              Workload overview
            </Title>
          }
          toggleWrapper="h4"
        >
          {dataUnavailable ? (
            <EmptyState titleText="Workload data not connected" headingLevel="h3">
              <EmptyStateBody>Workload data is not available for the overview.</EmptyStateBody>
            </EmptyState>
          ) : error ? (
            <Alert variant="danger" title="Unable to load workload overview">
              {error.message}
            </Alert>
          ) : !loaded ? (
            <Spinner aria-label="Loading workload overview" />
          ) : (
            <>
              {partial && (
                <Alert variant="warning" isInline title="Some workloads could not be loaded">
                  Counts include only workload types and resources that loaded successfully.
                </Alert>
              )}
              <Tabs
                activeKey={activeTab}
                onSelect={(_event, eventKey) => setActiveTab(eventKey)}
                aria-label="Workload overview tabs"
              >
                <Tab eventKey="status" title={<TabTitleText>Status</TabTitleText>}>
                  {total === 0 ? (
                    <WorkloadOverviewEmptyState />
                  ) : (
                    <WorkloadStatusTab
                      total={total}
                      counts={counts}
                      details={details}
                      visiblePopover={visiblePopover}
                      onPopoverOpen={(bucket, source) => setVisiblePopover({ bucket, source })}
                      onPopoverClose={() => setVisiblePopover(undefined)}
                      onViewInTable={onViewInTable}
                    />
                  )}
                </Tab>
                {kueueAvailable && canAccessAdminMetrics && (
                  <Tab
                    eventKey="admissions"
                    title={
                      <TabTitleText>
                        <span data-testid="workload-overview-tab-admissions">Admissions</span>
                      </TabTitleText>
                    }
                  >
                    {activeTab === 'admissions' && (
                      <React.Suspense fallback={<Spinner aria-label="Loading admission metrics" />}>
                        <WorkloadAdmissionsTab
                          metrics={admissionMetrics}
                          timeWindow={timeWindow}
                          onTimeWindowChange={setTimeWindow}
                          canAccessAdminMetrics={canAccessAdminMetrics}
                        />
                      </React.Suspense>
                    )}
                  </Tab>
                )}
              </Tabs>
            </>
          )}
        </ExpandableSection>
      </CardBody>
    </Card>
  );
};

export default WorkloadOverview;
