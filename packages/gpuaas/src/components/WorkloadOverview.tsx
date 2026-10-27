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
  Skeleton,
  Spinner,
  Stack,
  Tab,
  TabContent,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  t_chart_color_blue_300 as chartBlue,
  t_chart_color_green_300 as chartGreen,
  t_chart_color_orange_300 as chartOrange,
  t_chart_color_yellow_300 as chartYellow,
  t_chart_global_danger_color_100 as chartRed,
} from '@patternfly/react-tokens';
import useWorkloadAdmissionMetrics from '../hooks/useWorkloadAdmissionMetrics';
import { ADMISSION_TIME_WINDOW_OPTIONS } from '../utils/workloadAdmissions';
import { GPUAAS_EVENTS } from '../tracking/gpuaasTrackingConstants';
import {
  calculateWorkloadOverviewPercentages,
  overviewBuckets,
  summarizeOverview,
  type OverviewBucket,
  type WorkloadOverviewRow,
} from '../utils/workloadOverview';
import './InfrastructureWorkloadsSection.scss';

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
  onViewInTableClicked?: (bucket: OverviewBucket) => void;
  onStatusOverviewSegmentClick?: (bucket: OverviewBucket) => void;
  onPopoverClosed?: (bucket: OverviewBucket, method: 'close-button') => void;
};

const WorkloadAdmissionsTab = React.lazy(() => import('./WorkloadAdmissionsTab'));

enum WorkloadOverviewTab {
  Status = 'status',
  Admissions = 'admissions',
}

const admissionMetricLabels = [
  'Admission rate',
  'Admission lead time',
  'Waiting workloads',
  'Active workloads',
];

const AdmissionMetricsLoading: React.FC = () => (
  <div
    className="gpuaas-workload-overview__admission-metrics"
    data-testid="admission-metric-charts-loading"
  >
    {admissionMetricLabels.map((label) => (
      <div className="gpuaas-workload-overview__admission-metric" key={label}>
        <div className="gpuaas-workload-overview__admission-header-loading">
          <Skeleton width="80px" height="24px" screenreaderText={`Loading ${label} value`} />
          <Skeleton width="120px" height="16px" screenreaderText={`Loading ${label} label`} />
        </div>
        <Skeleton width="100%" height="140px" screenreaderText={`Loading ${label} chart`} />
      </div>
    ))}
  </div>
);

type WorkloadStatusPopoverProps = {
  bucket: OverviewBucket;
  details: Record<string, number>;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPopoverClosed: (method: 'close-button') => void;
  onViewInTable?: () => void;
  onViewInTableClicked?: () => void;
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
  onViewInTableClicked?: (bucket: OverviewBucket) => void;
  onPopoverClosed?: (method: 'close-button') => void;
  children: React.ReactElement;
};

type WorkloadStatusCountsProps = Pick<
  WorkloadStatusControlProps,
  'visiblePopover' | 'onPopoverOpen' | 'onPopoverClose' | 'onViewInTable'
> & {
  counts: Record<OverviewBucket, number>;
  details: Record<OverviewBucket, Record<string, number>>;
  onStatusOverviewSegmentClick?: (bucket: OverviewBucket) => void;
  onViewInTableClicked?: (bucket: OverviewBucket) => void;
  onPopoverClosed?: (bucket: OverviewBucket, method: 'close-button') => void;
};

type WorkloadStatusTabProps = {
  total: number;
  counts: Record<OverviewBucket, number>;
  details: Record<OverviewBucket, Record<string, number>>;
  visiblePopover?: { bucket: OverviewBucket; source: 'count' | 'chart' };
  onPopoverOpen: (bucket: OverviewBucket, source: 'count' | 'chart') => void;
  onPopoverClose: () => void;
  onViewInTable?: (bucket: OverviewBucket) => void;
  onStatusOverviewSegmentClick?: (bucket: OverviewBucket) => void;
  onViewInTableClicked?: (bucket: OverviewBucket) => void;
  onPopoverClosed?: (bucket: OverviewBucket, method: 'close-button') => void;
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
  onPopoverClosed,
  onViewInTable,
  onViewInTableClicked,
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
    showClose
    closeBtnAriaLabel="Close workload status overview"
    shouldOpen={onOpen}
    shouldClose={(event) => {
      const isCloseButton = Boolean(
        event.target instanceof HTMLElement &&
          event.target.closest('[aria-label="Close workload status overview"]'),
      );

      if (isCloseButton) {
        onPopoverClosed('close-button');
      }
      onClose();
    }}
    bodyContent={
      <>
        {onViewInTable && (
          <Button
            variant="link"
            isInline
            className="pf-v6-u-mb-sm"
            onClick={() => {
              onViewInTableClicked?.();
              onViewInTable();
            }}
          >
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
  onViewInTableClicked,
  onPopoverClosed,
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
      onPopoverClosed={onPopoverClosed ?? (() => undefined)}
      onViewInTable={() => {
        onPopoverClose();
        onViewInTableClicked?.(bucket);
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
  onStatusOverviewSegmentClick,
  onViewInTableClicked,
  onPopoverClosed,
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
          onViewInTableClicked={onViewInTableClicked}
          onPopoverClosed={(method) => onPopoverClosed?.(bucket, method)}
        >
          {counts[bucket] > 0 ? (
            <Button
              variant="plain"
              isInline
              data-testid={`workload-count-${bucket}`}
              onClick={() => onStatusOverviewSegmentClick?.(bucket)}
            >
              <Flex
                className="pf-v6-u-w-100"
                direction={{ default: 'column' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <Title headingLevel="h3" size="2xl">
                  {counts[bucket]}
                </Title>
                <Content component="p">{labels[bucket]}</Content>
              </Flex>
            </Button>
          ) : (
            <div data-testid={`workload-count-${bucket}`}>
              <Flex
                className="pf-v6-u-w-100"
                direction={{ default: 'column' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <Title headingLevel="h3" size="2xl">
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
  onStatusOverviewSegmentClick,
  onViewInTableClicked,
  onPopoverClosed,
}) => {
  const workloadOverviewPercentages = calculateWorkloadOverviewPercentages(counts, total);

  return (
    <Stack className="gpuaas-workload-overview__status" data-testid="workload-overview-status">
      <Flex className="gpuaas-workload-overview__counts">
        <FlexItem className="gpuaas-workload-overview__total">
          <Flex
            className="gpuaas-workload-overview__count-content"
            direction={{ default: 'column' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <Title headingLevel="h3" size="2xl">
              {total}
            </Title>
            <Content component="p" className="gpuaas-workload-overview__total-label">
              <strong>Total workloads</strong>
            </Content>
          </Flex>
        </FlexItem>
        <WorkloadStatusCounts
          counts={counts}
          details={details}
          visiblePopover={visiblePopover}
          onPopoverOpen={onPopoverOpen}
          onPopoverClose={onPopoverClose}
          onViewInTable={onViewInTable}
          onPopoverClosed={onPopoverClosed}
          onStatusOverviewSegmentClick={onStatusOverviewSegmentClick}
          onViewInTableClicked={onViewInTableClicked}
        />
      </Flex>
      <div className="gpuaas-workload-overview__bar" role="group" aria-label="Workloads by status">
        {overviewBuckets
          .filter((bucket) => counts[bucket] > 0)
          .map((bucket) => {
            const bucketPercentage = workloadOverviewPercentages[bucket];
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
                  onViewInTableClicked={onViewInTableClicked}
                  onPopoverClosed={
                    onPopoverClosed ? (method) => onPopoverClosed(bucket, method) : undefined
                  }
                >
                  <button
                    type="button"
                    data-testid={`workload-segment-${bucket}`}
                    className="gpuaas-workload-overview__segment"
                    style={{ backgroundColor: colors[bucket] }}
                    data-status={bucket}
                    aria-label={`${labels[bucket]}: ${counts[bucket]} of ${total} workloads (${bucketPercentage}%)`}
                    onClick={() => onStatusOverviewSegmentClick?.(bucket)}
                  >
                    {bucketPercentage >= 6 ? `${bucketPercentage}%` : null}
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
};

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
  onStatusOverviewSegmentClick,
  onViewInTableClicked,
  onPopoverClosed,
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<string | number>(WorkloadOverviewTab.Status);
  const [timeWindow, setTimeWindow] = React.useState('24h');
  const admissionMetrics = useWorkloadAdmissionMetrics(
    namespace,
    timeWindow,
    kueueAvailable && activeTab === WorkloadOverviewTab.Admissions,
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
          onToggle={(_event, nextExpanded) => {
            setExpanded(nextExpanded);
            fireMiscTrackingEvent(GPUAAS_EVENTS.WORKLOADS_TAB_SECTION_TOGGLED, {
              sectionName: 'workload-overview',
              action: nextExpanded ? 'expand' : 'collapse',
            });
          }}
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
              <div>
                <Flex
                  className="gpuaas-workload-overview__tabs-row"
                  alignItems={{ default: 'alignItemsCenter' }}
                  gap={{ default: 'gapMd' }}
                >
                  <FlexItem flex={{ default: 'flex_1' }}>
                    <Tabs
                      activeKey={activeTab}
                      onSelect={(_, key) => {
                        const tab =
                          key === WorkloadOverviewTab.Admissions
                            ? WorkloadOverviewTab.Admissions
                            : WorkloadOverviewTab.Status;
                        setActiveTab(tab);
                        fireMiscTrackingEvent(GPUAAS_EVENTS.WORKLOADS_TAB_OVERVIEW_TAB_SELECTED, {
                          tabName: tab === WorkloadOverviewTab.Admissions ? 'admission' : 'status',
                        });
                      }}
                      aria-label="Workload overview tabs"
                    >
                      <Tab
                        eventKey={WorkloadOverviewTab.Status}
                        title={<TabTitleText>Status</TabTitleText>}
                        tabContentId="workload-status-panel"
                      />
                      {kueueAvailable && canAccessAdminMetrics && (
                        <Tab
                          eventKey={WorkloadOverviewTab.Admissions}
                          tabContentId="workload-admissions-panel"
                          title={
                            <TabTitleText>
                              <span data-testid="workload-overview-tab-admissions">Admissions</span>
                            </TabTitleText>
                          }
                        />
                      )}
                    </Tabs>
                  </FlexItem>
                  {activeTab === WorkloadOverviewTab.Admissions && (
                    <FlexItem>
                      <SimpleSelect
                        options={ADMISSION_TIME_WINDOW_OPTIONS}
                        value={timeWindow}
                        onChange={(timeRange) => {
                          setTimeWindow(timeRange);
                          fireMiscTrackingEvent(
                            GPUAAS_EVENTS.WORKLOADS_TAB_ADMISSION_TIME_RANGE_CHANGED,
                            { timeRange },
                          );
                        }}
                        ariaLabel="Admission time window"
                        dataTestId="admission-time-window"
                        toggleProps={{
                          className: 'gpuaas-workload-overview__admission-time-window-toggle',
                        }}
                        popperProps={{ maxWidth: undefined }}
                      />
                    </FlexItem>
                  )}
                </Flex>
                <TabContent
                  id="workload-status-panel"
                  eventKey={WorkloadOverviewTab.Status}
                  activeKey={activeTab}
                  hidden={activeTab !== WorkloadOverviewTab.Status}
                >
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
                      onStatusOverviewSegmentClick={onStatusOverviewSegmentClick}
                      onViewInTableClicked={onViewInTableClicked}
                      onPopoverClosed={onPopoverClosed}
                    />
                  )}
                </TabContent>
                {kueueAvailable && canAccessAdminMetrics && (
                  <TabContent
                    id="workload-admissions-panel"
                    eventKey={WorkloadOverviewTab.Admissions}
                    activeKey={activeTab}
                    hidden={activeTab !== WorkloadOverviewTab.Admissions}
                  >
                    <React.Suspense fallback={<AdmissionMetricsLoading />}>
                      <WorkloadAdmissionsTab
                        metrics={admissionMetrics}
                        timeWindow={timeWindow}
                        canAccessAdminMetrics={canAccessAdminMetrics}
                        isActive={activeTab === WorkloadOverviewTab.Admissions}
                      />
                    </React.Suspense>
                  </TabContent>
                )}
              </div>
            </>
          )}
        </ExpandableSection>
      </CardBody>
    </Card>
  );
};

export default WorkloadOverview;
