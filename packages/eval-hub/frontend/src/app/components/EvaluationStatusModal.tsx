import * as React from 'react';
import {
  Alert,
  Button,
  Content,
  Tooltip,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Icon,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Skeleton,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import {
  AngleDownIcon,
  AngleRightIcon,
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  SyncAltIcon,
  TimesCircleIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { EvaluationJob } from '~/app/types';
import { evaluationResultsRoute } from '~/app/routes';
import {
  formatDate,
  formatDurationCompact,
  getBenchmarkName,
  getEvaluationName,
} from '~/app/utilities/evaluationUtils';
import { getMessageCodeLabel } from '~/app/utilities/messageCodeLabels';
import { isPreStartFailure } from '~/app/utilities/evaluationJobPolling';
import EvaluationStatusLabel from './EvaluationStatusLabel';
import EvaluationEventLog from './EvaluationEventLog';
import './EvaluationStatusModal.scss';

type EvaluationStatusModalProps = {
  job: EvaluationJob | undefined;
  namespace: string;
  polledJobData?: EvaluationJob;
  onClose: () => void;
  onRequestStop?: (job: EvaluationJob) => void;
  onRequestReconfigure?: (job: EvaluationJob) => void;
};

type BenchmarkStatusConfig = {
  icon: React.ReactNode;
  iconStatus?: 'success' | 'danger' | 'info';
};

const BENCHMARK_STATUS_CONFIG: Partial<Record<string, BenchmarkStatusConfig>> = {
  completed: { icon: <CheckCircleIcon />, iconStatus: 'success' },
  running: { icon: <InProgressIcon className="ai-u-spin" />, iconStatus: 'info' },
  failed: { icon: <TimesCircleIcon />, iconStatus: 'danger' },
};

const DEFAULT_BENCHMARK_STATUS: BenchmarkStatusConfig = { icon: <PendingIcon /> };

const BenchmarkStepIcon: React.FC<{ status: string }> = ({ status }) => {
  const config = BENCHMARK_STATUS_CONFIG[status] ?? DEFAULT_BENCHMARK_STATUS;
  return (
    <Icon status={config.iconStatus} isInline>
      {config.icon}
    </Icon>
  );
};

const getBenchmarkDetailLabel = (bm: {
  status: string;
  completedAt?: string;
  errorMessage?: string;
}): string => {
  switch (bm.status) {
    case 'running':
      return 'In progress';
    case 'completed':
      return `Completed${bm.completedAt ? `: ${formatDate(bm.completedAt)}` : ''}`;
    case 'failed':
      return `Failed${bm.completedAt ? `: ${formatDate(bm.completedAt)}` : ''}${bm.errorMessage ? ` – ${bm.errorMessage}` : ''}`;
    default:
      return bm.status.charAt(0).toUpperCase() + bm.status.slice(1);
  }
};

type ProgressBenchmark = {
  key: string;
  id: string;
  status: string;
  benchmark_index?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  errorCode?: string;
};

const ViewLogsButton: React.FC<{
  bm: ProgressBenchmark;
  onViewLogs: (index: number) => void;
  className?: string;
}> = ({ bm, onViewLogs, className }) =>
  bm.benchmark_index != null ? (
    <Button
      variant="link"
      isInline
      className={className}
      onClick={() => onViewLogs(bm.benchmark_index!)}
      data-testid={`progress-view-logs-${bm.key}`}
    >
      View logs
    </Button>
  ) : null;

const BenchmarkDetailRow: React.FC<{
  bm: ProgressBenchmark;
  onViewLogs: (benchmarkIndex: number) => void;
}> = ({ bm, onViewLogs }) => {
  const config = BENCHMARK_STATUS_CONFIG[bm.status];

  if (!config) {
    return (
      <StackItem className="pf-v6-u-ml-xl pf-v6-u-pt-sm pf-v6-u-mb-sm">
        <DescriptionList isHorizontal isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription data-testid={`benchmark-detail-status-${bm.key}`}>
              {getBenchmarkDetailLabel(bm)}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
    );
  }

  const isFailed = bm.status === 'failed';
  const label = getBenchmarkDetailLabel(bm);
  const testId = isFailed
    ? `benchmark-error-message-${bm.key}`
    : `benchmark-detail-status-${bm.key}`;

  return (
    <StackItem className="pf-v6-u-pt-sm pf-v6-u-mb-sm">
      <Flex
        alignItems={{ default: isFailed ? 'alignItemsCenter' : 'alignItemsFlexStart' }}
        gap={{ default: 'gapSm' }}
        flexWrap={bm.status === 'completed' ? { default: 'wrap' } : undefined}
      >
        <FlexItem alignSelf={isFailed ? { default: 'alignSelfStretch' } : undefined}>
          <div
            className={`evalhub-benchmark-connector${isFailed ? ' evalhub-benchmark-connector--centered' : ''}`}
            aria-hidden="true"
          />
        </FlexItem>
        <FlexItem alignSelf={isFailed ? { default: 'alignSelfFlexStart' } : undefined}>
          <Icon status={config.iconStatus} isInline>
            {config.icon}
          </Icon>
        </FlexItem>
        {isFailed ? (
          <FlexItem flex={{ default: 'flex_1' }}>
            <span data-testid={testId}>
              {label}
              <ViewLogsButton bm={bm} onViewLogs={onViewLogs} className="pf-v6-u-ml-sm" />
            </span>
          </FlexItem>
        ) : (
          <>
            <FlexItem>
              <span data-testid={testId}>{label}</span>
            </FlexItem>
            <FlexItem>
              <ViewLogsButton bm={bm} onViewLogs={onViewLogs} />
            </FlexItem>
          </>
        )}
      </Flex>
    </StackItem>
  );
};

const ProgressTabContent: React.FC<{
  benchmarks: ProgressBenchmark[];
  hasPolledData: boolean;
  isTerminal: boolean;
  onViewLogs: (benchmarkIndex: number) => void;
}> = ({ benchmarks, hasPolledData, isTerminal, onViewLogs }) => {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () =>
      new Set(benchmarks.length > 0 && benchmarks.length <= 5 ? benchmarks.map((b) => b.key) : []),
  );

  // Auto-expand when benchmarks first arrive (pending → running transition)
  const initializedRef = React.useRef(benchmarks.length > 0);
  React.useEffect(() => {
    if (!initializedRef.current && benchmarks.length > 0) {
      initializedRef.current = true;
      if (benchmarks.length <= 5) {
        setExpandedIds(new Set(benchmarks.map((b) => b.key)));
      }
    }
  }, [benchmarks]);

  const toggleExpanded = React.useCallback((key: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (!hasPolledData) {
    return (
      <Stack hasGutter>
        {Array.from({ length: 3 }, (_, i) => (
          <StackItem key={i}>
            <Skeleton width={`${45 + i * 15}%`} height="1em" />
          </StackItem>
        ))}
      </Stack>
    );
  }

  return (
    <Stack hasGutter data-testid="progress-tab-content">
      {benchmarks.length > 0 ? (
        <StackItem>
          <Stack hasGutter data-testid="benchmark-steps">
            {benchmarks.map((bm) => {
              const isExpanded = expandedIds.has(bm.key);
              return (
                <StackItem key={bm.key} data-testid={`benchmark-step-${bm.key}`}>
                  <Stack>
                    <StackItem>
                      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                        <FlexItem>
                          <Button
                            variant="plain"
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${bm.id}`}
                            onClick={() => toggleExpanded(bm.key)}
                            data-testid={`benchmark-toggle-${bm.key}`}
                          >
                            <Icon isInline>
                              {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                            </Icon>
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <BenchmarkStepIcon status={bm.status} />
                        </FlexItem>
                        <FlexItem>
                          <strong>{bm.id}</strong>
                        </FlexItem>
                      </Flex>
                    </StackItem>
                    {isExpanded ? <BenchmarkDetailRow bm={bm} onViewLogs={onViewLogs} /> : null}
                  </Stack>
                </StackItem>
              );
            })}
          </Stack>
        </StackItem>
      ) : (
        <StackItem className="evalhub-status-modal__empty-progress">
          <EmptyState
            variant={EmptyStateVariant.sm}
            icon={isTerminal ? BanIcon : InProgressIcon}
            headingLevel="h4"
            titleText={
              isTerminal ? 'No benchmarks were started' : 'Waiting for benchmarks to start'
            }
            data-testid="progress-empty-state"
          >
            <EmptyStateBody>
              {isTerminal
                ? 'The evaluation was stopped before any benchmarks began processing.'
                : 'Benchmarks will appear here once the evaluation job begins processing.'}
            </EmptyStateBody>
          </EmptyState>
        </StackItem>
      )}
    </Stack>
  );
};

const EvaluationStatusModal: React.FC<EvaluationStatusModalProps> = ({
  job,
  namespace,
  polledJobData,
  onClose,
  onRequestStop,
  onRequestReconfigure,
}) => {
  const [activeTab, setActiveTab] = React.useState<string>('progress');
  const [logBenchmarkIndex, setLogBenchmarkIndex] = React.useState<number | undefined>();
  const [isFailureSummaryExpanded, setIsFailureSummaryExpanded] = React.useState(false);
  const [failureSummaryEl, setFailureSummaryEl] = React.useState<HTMLParagraphElement | null>(null);
  const failureSummaryRef = React.useCallback((node: HTMLParagraphElement | null) => {
    setFailureSummaryEl(node);
  }, []);
  const [isFailureSummaryTruncated, setIsFailureSummaryTruncated] = React.useState(false);

  const progressBenchmarks = React.useMemo(
    () =>
      // For in-progress jobs use polled data (has timing); for terminal jobs fall back to list data
      (polledJobData?.status.benchmarks ?? job?.status.benchmarks ?? [])
        .toSorted((a, b) => {
          if (a.benchmark_index != null && b.benchmark_index != null) {
            return a.benchmark_index - b.benchmark_index;
          }
          return a.id.localeCompare(b.id);
        })
        .map((bm, i) => ({
          key: bm.benchmark_index != null ? String(bm.benchmark_index) : `${bm.id}-${i}`,
          id: bm.id,
          status: bm.status,
          // eslint-disable-next-line camelcase
          benchmark_index: bm.benchmark_index,
          startedAt: bm.started_at,
          completedAt: bm.completed_at,
          errorMessage: bm.error_message?.message,
          errorCode: bm.error_message?.message_code,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [polledJobData?.status.benchmarks, job?.status.benchmarks],
  );

  const progressCompletedCount = React.useMemo(
    () => progressBenchmarks.filter((b) => b.status === 'completed').length,
    [progressBenchmarks],
  );

  const jobId = job?.resource.id;

  React.useEffect(() => {
    if (jobId) {
      setActiveTab('progress');
      setLogBenchmarkIndex(undefined);
      setIsFailureSummaryExpanded(false);
    }
  }, [jobId]);

  const failedBenchmarks = progressBenchmarks.filter((bm) => bm.status === 'failed');
  // Use polled state so the summary appears as soon as polling detects the failure,
  // not 30s later when the list refreshes.
  const effectiveState = polledJobData?.status.state ?? job?.status.state;
  const effectiveMessage = polledJobData?.status.message ?? job?.status.message;
  const failureSummary =
    (effectiveState === 'failed' || effectiveState === 'partially_failed') &&
    progressBenchmarks.length > 1
      ? failedBenchmarks.map((bm) => `${bm.id}: ${bm.errorMessage ?? 'Unknown error'}`).join('. ')
      : effectiveMessage?.message;

  React.useEffect(() => {
    if (failureSummaryEl) {
      const truncated = failureSummaryEl.scrollHeight > failureSummaryEl.clientHeight;
      setIsFailureSummaryTruncated((prev) => (prev !== truncated ? truncated : prev));
    }
  }, [failureSummaryEl, isFailureSummaryExpanded]);

  const evaluationName = job ? getEvaluationName(job) : '';
  const benchmarkName = job ? getBenchmarkName(job) : '';

  const titleRef = React.useRef<HTMLSpanElement>(null);
  const [isTitleTruncated, setIsTitleTruncated] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = titleRef.current;
    if (el) {
      setIsTitleTruncated(el.scrollWidth > el.clientWidth);
    }
  }, [evaluationName]);

  // Prefer polled state so the badge updates on the 10s cycle rather than waiting for the 30s list refresh
  const state = polledJobData?.status.state ?? job?.status.state ?? 'pending';
  const isInProgress = state === 'running' || state === 'pending' || state === 'stopping';

  const [now, setNow] = React.useState(() => new Date().toISOString());
  React.useEffect(() => {
    if (!isInProgress) {
      return undefined;
    }
    const id = window.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => window.clearInterval(id);
  }, [isInProgress]);

  if (!job) {
    return null;
  }

  // Prefer polled message so text reflects the latest server state, not the stale list snapshot
  const { message_code: messageCode, message_origin: messageOrigin } =
    polledJobData?.status.message ?? job.status.message ?? {};

  const elapsed = formatDurationCompact(
    job.resource.created_at,
    isInProgress ? now : (polledJobData?.resource.updated_at ?? job.resource.updated_at),
  );
  const isFailed = state === 'failed' || state === 'partially_failed';
  const isReconfigurable = !isInProgress;
  // Use the most-current benchmark data (polled > list) to detect pre-start failures.
  const isPreStart = isPreStartFailure(polledJobData ?? job);

  const handleViewBenchmarkLogs = (bmIndex: number) => {
    setLogBenchmarkIndex(bmIndex);
    setActiveTab('events-log');
  };

  const descriptionText =
    state === 'completed'
      ? `Evaluation completed successfully.${elapsed ? ` Total time: ${elapsed}` : ''}`
      : isInProgress
        ? `Evaluation job is ${state === 'stopping' ? 'being canceled' : state === 'pending' ? 'pending' : 'running'}.${elapsed ? ` Elapsed time: ${elapsed}` : ''}`
        : elapsed
          ? `Elapsed time: ${elapsed}`
          : undefined;

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="medium"
      aria-label="Evaluation run status"
      data-testid="evaluation-status-modal"
      className="evalhub-status-modal"
    >
      <ModalHeader>
        <div className="evalhub-status-modal__title">
          <Tooltip
            content={evaluationName}
            trigger={isTitleTruncated ? 'mouseenter focus' : 'manual'}
          >
            <span
              ref={titleRef}
              className="evalhub-status-modal__title-name"
              data-testid="modal-title-name"
            >
              {evaluationName}
            </span>
          </Tooltip>
          <EvaluationStatusLabel state={state} isPreStartFailure={isPreStart} />
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="evalhub-status-modal__header" data-testid="status-detail-header">
          <Stack className="evalhub-status-modal__header-stack">
            <StackItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  {isFailed ? (
                    <Icon status="danger" isInline>
                      <ExclamationCircleIcon />
                    </Icon>
                  ) : state === 'completed' ? (
                    <Icon status="success" isInline>
                      <CheckCircleIcon />
                    </Icon>
                  ) : state === 'cancelled' || state === 'stopped' ? (
                    <Icon isInline>
                      <BanIcon />
                    </Icon>
                  ) : (
                    <Icon status="info" isInline>
                      <SyncAltIcon className="ai-u-spin" />
                    </Icon>
                  )}
                </FlexItem>
                <FlexItem>
                  <Content component="p" data-testid="benchmark-name-header">
                    <strong>{benchmarkName}</strong>
                  </Content>
                </FlexItem>
              </Flex>
            </StackItem>
            {descriptionText ? (
              <StackItem
                className={progressBenchmarks.length > 1 || isFailed ? 'pf-v6-u-mb-md' : undefined}
              >
                <Content
                  component="p"
                  className="evalhub-status-modal__description"
                  data-testid="status-description"
                >
                  {descriptionText}
                </Content>
              </StackItem>
            ) : null}
            {isFailed ? (
              <StackItem>
                <Alert
                  variant="danger"
                  isInline
                  title={
                    progressBenchmarks.length > 1
                      ? `${failedBenchmarks.length} of ${progressBenchmarks.length} benchmarks failed`
                      : 'Evaluation failed'
                  }
                  data-testid="failure-summary-alert"
                >
                  {failureSummary ? (
                    <>
                      <p
                        ref={failureSummaryRef}
                        className={
                          isFailureSummaryExpanded
                            ? undefined
                            : 'evalhub-status-modal__failure-summary--clamped'
                        }
                      >
                        {failureSummary}
                      </p>
                      {isFailureSummaryTruncated || isFailureSummaryExpanded ? (
                        <Button
                          variant="link"
                          isInline
                          onClick={() => setIsFailureSummaryExpanded((prev) => !prev)}
                          data-testid="failure-summary-toggle"
                        >
                          {isFailureSummaryExpanded ? 'Show less' : 'Show more'}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </Alert>
              </StackItem>
            ) : null}
            {progressBenchmarks.length > 1 && !isFailed ? (
              <StackItem>
                <Content component="p" data-testid="benchmark-complete-count">
                  <strong>
                    {progressCompletedCount}/{progressBenchmarks.length} benchmarks complete
                  </strong>
                </Content>
              </StackItem>
            ) : null}
          </Stack>
          <Tabs
            activeKey={activeTab}
            onSelect={(_e, key) => {
              setActiveTab(String(key));
              setLogBenchmarkIndex(undefined);
            }}
            data-testid="status-modal-tabs"
            className="evalhub-status-modal__tabs"
          >
            <Tab
              eventKey="progress"
              title={<TabTitleText>Progress</TabTitleText>}
              data-testid="progress-tab"
            />
            <Tab
              eventKey="events-log"
              title={<TabTitleText>Events log</TabTitleText>}
              data-testid="events-log-tab"
            />
          </Tabs>
        </div>

        {/* Tab content */}
        <div className="pf-v6-u-pt-md">
          {activeTab === 'progress' ? (
            <Stack hasGutter>
              {isFailed && (messageOrigin || messageCode) ? (
                <StackItem>
                  <DescriptionList isHorizontal isCompact>
                    {messageOrigin ? (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Error origin</DescriptionListTerm>
                        <DescriptionListDescription data-testid="failure-detail-origin">
                          <Label isCompact>{messageOrigin}</Label>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : null}
                    {messageCode ? (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Error code</DescriptionListTerm>
                        <DescriptionListDescription data-testid="failure-detail-code">
                          <Label isCompact>{getMessageCodeLabel(messageCode)}</Label>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : null}
                  </DescriptionList>
                </StackItem>
              ) : null}
              <StackItem>
                <ProgressTabContent
                  benchmarks={progressBenchmarks}
                  hasPolledData={!!polledJobData || !isInProgress}
                  isTerminal={!isInProgress}
                  onViewLogs={handleViewBenchmarkLogs}
                />
              </StackItem>
            </Stack>
          ) : activeTab === 'events-log' ? (
            <EvaluationEventLog
              namespace={namespace}
              jobId={job.resource.id}
              evaluationName={evaluationName}
              benchmarks={progressBenchmarks}
              isInProgress={isInProgress}
              state={state}
              activeBenchmarkIndex={logBenchmarkIndex}
            />
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        {onRequestStop && (state === 'running' || state === 'pending') && (
          <Button
            variant="primary"
            onClick={() => onRequestStop(job)}
            data-testid="status-modal-stop-button"
          >
            Stop evaluation
          </Button>
        )}
        {isReconfigurable && state === 'completed' && (
          <Button
            variant="primary"
            component={(props) => (
              <Link {...props} to={evaluationResultsRoute(namespace, job.resource.id)} />
            )}
            onClick={onClose}
            data-testid="status-modal-view-results-button"
          >
            View results
          </Button>
        )}
        {onRequestReconfigure && isReconfigurable && state !== 'completed' && (
          <Button
            variant="primary"
            onClick={() => onRequestReconfigure(job)}
            data-testid="status-modal-reconfigure-button"
          >
            Reconfigure evaluation
          </Button>
        )}
        <Button variant="link" onClick={onClose} data-testid="status-modal-close-button">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EvaluationStatusModal;
