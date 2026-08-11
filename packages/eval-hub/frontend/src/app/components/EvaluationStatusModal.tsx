import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Content,
  Tooltip,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Dropdown,
  DropdownItem,
  DropdownList,
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
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
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
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  ExclamationCircleIcon,
  FilterIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  PendingIcon,
  SyncAltIcon,
  TimesCircleIcon,
} from '@patternfly/react-icons';
import { EvaluationJob } from '~/app/types';
import {
  formatDate,
  formatDurationCompact,
  getEvaluationName,
} from '~/app/utilities/evaluationUtils';
import { useEvaluationJobLogs } from '~/app/hooks/useEvaluationJobLogs';
import {
  getEvaluationJobLogs,
  getEvaluationJobBenchmarkLogs,
  isLogApiUnavailable,
  isLogServerError,
} from '~/app/api/k8s';
import { getMessageCodeLabel } from '~/app/utilities/messageCodeLabels';
import {
  getEarliestStartTime,
  getEarliestBenchmarkStartTime,
  formatElapsedTime,
} from '~/app/utilities/evaluationJobPolling';
import EvaluationStatusLabel from './EvaluationStatusLabel';
import './EvaluationStatusModal.scss';

type EvaluationStatusModalProps = {
  job: EvaluationJob | undefined;
  namespace: string;
  polledJobData?: EvaluationJob;
  onClose: () => void;
};

const ALL_BENCHMARKS = 'all';
const LOG_VIEWER_TAIL_LINES = 1000;

type LogLevelFilter = 'all' | 'warnings' | 'errors';

const LOG_LEVEL_FILTER_LABELS: Record<LogLevelFilter, string> = {
  all: 'All messages',
  warnings: 'Warnings and errors',
  errors: 'Errors only',
};

const downloadString = (filename: string, data: string): void => {
  const blob = new Blob([data], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

type LogLevel = 'error' | 'warning' | 'info' | 'debug';

type LogEntry = {
  raw: string;
  timestamp?: string;
  level?: LogLevel;
  message: string;
  continuation?: string;
  isSectionHeader: boolean;
  benchmarkName?: string;
  isEmptyFilterNotice?: boolean;
};

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/;
const LOG_LINE_RE =
  /^(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}[,.\d]*)\s+-\s+(\S+)\s+-\s+(INFO|WARNING|ERROR|DEBUG)\s+-\s+([\s\S]*)/i;
const BENCHMARK_HEADER_RE = /benchmark_id=(\S+)/;

const formatLogTimestamp = (raw: string): string => {
  const normalized = raw.replace(',', '.').replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  debug: 'debug',
};

// eslint-disable-next-line no-control-regex -- intentional: strips ANSI escape sequences from log output
const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const stripAnsi = (text: string): string => text.replace(ANSI_RE, '');

const parseLogEntries = (raw: string): LogEntry[] => {
  const lines = stripAnsi(raw).replace(/\r\n?/g, '\n').split('\n');
  const entries: LogEntry[] = [];

  for (const line of lines) {
    const isNewEntry = TIMESTAMP_RE.test(line) || line.startsWith('===');
    const isContinuation = /^\s/.test(line);
    if (isNewEntry || entries.length === 0 || !isContinuation) {
      if (line.startsWith('===')) {
        const bmMatch = BENCHMARK_HEADER_RE.exec(line);
        entries.push({
          raw: line,
          message: line,
          isSectionHeader: true,
          benchmarkName: bmMatch?.[1],
        });
      } else {
        const match = LOG_LINE_RE.exec(line);
        if (match) {
          entries.push({
            raw: line,
            timestamp: match[1].trim(),
            level: LOG_LEVEL_MAP[match[3].toLowerCase()],
            message: match[4].trim(),
            isSectionHeader: false,
          });
        } else {
          entries.push({ raw: line, message: line, isSectionHeader: false });
        }
      }
    } else {
      const current = entries[entries.length - 1];
      current.raw += `\n${line}`;
      current.continuation = current.continuation ? `${current.continuation}\n${line}` : line;
    }
  }

  return entries.filter((e) => e.message.trim() || e.continuation?.trim());
};

const LOG_ERROR_ICON = (
  <Icon status="danger" isInline title="Error">
    <ExclamationCircleIcon />
  </Icon>
);

const LOG_WARNING_ICON = (
  <Icon status="warning" isInline title="Warning">
    <ExclamationTriangleIcon />
  </Icon>
);

const LogEntryRow: React.FC<{ entry: LogEntry; hideBorder?: boolean }> = ({
  entry,
  hideBorder,
}) => {
  const [copied, setCopied] = React.useState(false);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(
    () => () => {
      clearTimeout(copyTimeoutRef.current);
    },
    [],
  );

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(entry.raw).then(
      () => {
        setCopied(true);
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  }, [entry.raw]);

  const rowClass = [
    'evalhub-log-viewer__row',
    entry.isSectionHeader ? 'evalhub-log-viewer__row--section' : '',
    hideBorder ? 'evalhub-log-viewer__row--no-border' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const copyButton = (
    <div className="evalhub-log-viewer__copy">
      <Tooltip content={copied ? 'Copied' : 'Copy'}>
        <Button variant="plain" aria-label="Copy log entry" onClick={handleCopy}>
          {copied ? <CheckCircleIcon /> : <CopyIcon />}
        </Button>
      </Tooltip>
    </div>
  );

  if (entry.isSectionHeader) {
    if (entry.benchmarkName) {
      return (
        <div className={`${rowClass} evalhub-log-viewer__row--benchmark`}>
          <div className="evalhub-log-viewer__cell--full">{entry.benchmarkName}</div>
          {copyButton}
        </div>
      );
    }
    return (
      <div className={rowClass}>
        <div className="evalhub-log-viewer__cell--timestamp" />
        <div className="evalhub-log-viewer__cell--message">{entry.message}</div>
        {copyButton}
      </div>
    );
  }

  const fullMessage = entry.continuation
    ? `${entry.message}\n${entry.continuation}`
    : entry.message;

  return (
    <div className={rowClass}>
      <div className="evalhub-log-viewer__cell--timestamp" title={entry.timestamp}>
        {entry.timestamp ? formatLogTimestamp(entry.timestamp) : ''}
      </div>
      <div className="evalhub-log-viewer__cell--message">
        {entry.level === 'error' ? <>{LOG_ERROR_ICON} </> : null}
        {entry.level === 'warning' ? <>{LOG_WARNING_ICON} </> : null}
        {fullMessage}
      </div>
      {copyButton}
    </div>
  );
};

const LogSkeletonRows: React.FC = () => (
  <>
    {Array.from({ length: 32 }, (_, i) => (
      <div key={i} className="evalhub-log-viewer__row">
        <div className="evalhub-log-viewer__cell--timestamp">
          <Skeleton width="80%" height="1em" />
        </div>
        <div className="evalhub-log-viewer__cell--message">
          <Skeleton width={`${60 + ((i * 17) % 30)}%`} height="1em" />
        </div>
      </div>
    ))}
  </>
);

const BenchmarkStepIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'completed') {
    return (
      <Icon status="success" isInline>
        <CheckCircleIcon />
      </Icon>
    );
  }
  if (status === 'running') {
    return (
      <Icon status="info" isInline>
        <InProgressIcon className="ai-u-spin" />
      </Icon>
    );
  }
  if (status === 'failed') {
    return (
      <Icon status="danger" isInline>
        <TimesCircleIcon />
      </Icon>
    );
  }
  return (
    <Icon isInline>
      <PendingIcon />
    </Icon>
  );
};

type ProgressBenchmark = {
  id: string;
  status: string;
  benchmark_index?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  errorCode?: string;
  warningMessage?: string;
  warningCode?: string;
};

const ProgressTabContent: React.FC<{
  benchmarks: ProgressBenchmark[];
  completedCount: number;
  hasPolledData: boolean;
  onViewLogs: (benchmarkIndex: number) => void;
}> = ({ benchmarks, completedCount, hasPolledData, onViewLogs }) => {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () =>
      new Set(benchmarks.length > 0 && benchmarks.length <= 5 ? benchmarks.map((b) => b.id) : []),
  );

  // Auto-expand when benchmarks first arrive (pending → running transition)
  const initializedRef = React.useRef(benchmarks.length > 0);
  React.useEffect(() => {
    if (!initializedRef.current && benchmarks.length > 0) {
      initializedRef.current = true;
      if (benchmarks.length <= 5) {
        setExpandedIds(new Set(benchmarks.map((b) => b.id)));
      }
    }
  }, [benchmarks]);

  const toggleExpanded = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
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
          <Content component="p" data-testid="benchmark-complete-count">
            <strong>
              {completedCount}/{benchmarks.length}
            </strong>{' '}
            {benchmarks.length === 1 ? 'benchmark' : 'benchmarks'} complete
          </Content>
        </StackItem>
      ) : null}
      {benchmarks.length > 0 ? (
        <StackItem>
          <Stack data-testid="benchmark-steps">
            {benchmarks.map((bm) => {
              const isExpanded = expandedIds.has(bm.id);
              return (
                <StackItem key={bm.id} data-testid={`benchmark-step-${bm.id}`}>
                  <Stack>
                    <StackItem>
                      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                        <FlexItem>
                          <Button
                            variant="plain"
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${bm.id}`}
                            onClick={() => toggleExpanded(bm.id)}
                            data-testid={`benchmark-toggle-${bm.id}`}
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
                    {isExpanded ? (
                      <StackItem className="pf-v6-u-ml-xl pf-v6-u-pt-sm pf-v6-u-mb-sm">
                        <Stack>
                          <StackItem className="pf-v6-u-mb-xs">
                            <DescriptionList isHorizontal isCompact>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Status</DescriptionListTerm>
                                <DescriptionListDescription
                                  data-testid={`benchmark-detail-status-${bm.id}`}
                                >
                                  {bm.status.charAt(0).toUpperCase() + bm.status.slice(1)}
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                              {bm.startedAt ? (
                                <DescriptionListGroup>
                                  <DescriptionListTerm>Started</DescriptionListTerm>
                                  <DescriptionListDescription>
                                    {formatDate(bm.startedAt)}
                                  </DescriptionListDescription>
                                </DescriptionListGroup>
                              ) : null}
                              {bm.completedAt ? (
                                <DescriptionListGroup>
                                  <DescriptionListTerm>Completed</DescriptionListTerm>
                                  <DescriptionListDescription>
                                    {formatDate(bm.completedAt)}
                                  </DescriptionListDescription>
                                </DescriptionListGroup>
                              ) : null}
                            </DescriptionList>
                          </StackItem>
                          {bm.errorMessage ? (
                            <StackItem className="pf-v6-u-mb-xs">
                              <Content
                                component="p"
                                data-testid={`benchmark-error-message-${bm.id}`}
                              >
                                {bm.errorMessage}
                              </Content>
                            </StackItem>
                          ) : null}
                          {bm.warningMessage ? (
                            <StackItem className="pf-v6-u-mb-xs">
                              <Alert
                                variant="warning"
                                isInline
                                isPlain
                                title={bm.warningCode ?? 'Warning'}
                                data-testid={`benchmark-warning-${bm.id}`}
                              >
                                {bm.warningMessage}
                              </Alert>
                            </StackItem>
                          ) : null}
                          {bm.benchmark_index != null && bm.status !== 'pending' ? (
                            <StackItem>
                              <Button
                                variant="link"
                                isInline
                                onClick={() => onViewLogs(bm.benchmark_index!)}
                                data-testid={`progress-view-logs-${bm.id}`}
                              >
                                View logs
                              </Button>
                            </StackItem>
                          ) : null}
                        </Stack>
                      </StackItem>
                    ) : null}
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
            icon={InProgressIcon}
            headingLevel="h4"
            titleText="Waiting for benchmarks to start"
            data-testid="progress-empty-state"
          >
            <EmptyStateBody>
              Benchmarks will appear here once the evaluation job begins processing.
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
}) => {
  const [activeTab, setActiveTab] = React.useState<string>('progress');
  const [selectedBenchmark, setSelectedBenchmark] = React.useState<string>(ALL_BENCHMARKS);
  const [isBenchmarkSelectOpen, setIsBenchmarkSelectOpen] = React.useState(false);
  const [logLevelFilter, setLogLevelFilter] = React.useState<LogLevelFilter>('all');
  const [isLogLevelFilterOpen, setIsLogLevelFilterOpen] = React.useState(false);
  const [isFailureSummaryExpanded, setIsFailureSummaryExpanded] = React.useState(false);
  const [failureSummaryEl, setFailureSummaryEl] = React.useState<HTMLParagraphElement | null>(null);
  const failureSummaryRef = React.useCallback((node: HTMLParagraphElement | null) => {
    setFailureSummaryEl(node);
  }, []);
  const [isFailureSummaryTruncated, setIsFailureSummaryTruncated] = React.useState(false);
  const logContainerRef = React.useRef<HTMLDivElement>(null);
  const benchmarkIndex = React.useMemo(() => {
    if (selectedBenchmark === ALL_BENCHMARKS) {
      return undefined;
    }
    const parsed = parseInt(selectedBenchmark, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [selectedBenchmark]);

  const {
    logs,
    loaded: logsLoaded,
    error: logsError,
    refresh,
  } = useEvaluationJobLogs(
    activeTab === 'events-log' ? namespace : undefined,
    activeTab === 'events-log' ? job?.resource.id : undefined,
    benchmarkIndex,
    LOG_VIEWER_TAIL_LINES,
  );

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
        .map((bm) => ({
          id: bm.id,
          status: bm.status,
          // eslint-disable-next-line camelcase
          benchmark_index: bm.benchmark_index,
          startedAt: bm.started_at,
          completedAt: bm.completed_at,
          errorMessage: bm.error_message?.message,
          errorCode: bm.error_message?.message_code,
          warningMessage: bm.warning_message?.message,
          warningCode: bm.warning_message?.message_code,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [polledJobData?.status.benchmarks, job?.status.benchmarks],
  );

  const progressCompletedCount = React.useMemo(
    () => progressBenchmarks.filter((b) => b.status === 'completed').length,
    [progressBenchmarks],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const progressElapsed = React.useMemo(() => {
    if (!polledJobData) {
      return undefined;
    }
    const startTime = getEarliestStartTime(polledJobData);
    return startTime ? formatElapsedTime(startTime) : undefined;
  }, [polledJobData]);

  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<Error | undefined>();
  const downloadAbortRef = React.useRef<AbortController>();

  const jobId = job?.resource.id;
  const jobState = job?.status.state;

  React.useEffect(() => {
    if (jobId && jobState) {
      setActiveTab('progress');
      setSelectedBenchmark(ALL_BENCHMARKS);
      setIsFailureSummaryExpanded(false);
    }
  }, [jobId, jobState]);

  const failedBenchmarks = progressBenchmarks.filter((bm) => bm.status === 'failed');
  const failureSummary =
    (jobState === 'failed' || jobState === 'partially_failed') && progressBenchmarks.length > 1
      ? failedBenchmarks.map((bm) => `${bm.id}: ${bm.errorMessage ?? 'Unknown error'}`).join('. ')
      : job?.status.message?.message;

  React.useEffect(() => {
    if (failureSummaryEl) {
      const truncated = failureSummaryEl.scrollHeight > failureSummaryEl.clientHeight;
      setIsFailureSummaryTruncated((prev) => (prev !== truncated ? truncated : prev));
    }
  }, [failureSummaryEl, isFailureSummaryExpanded]);

  const evaluationName = job ? getEvaluationName(job) : '';

  const handleDownload = React.useCallback(async () => {
    if (!namespace || !job?.resource.id) {
      return;
    }
    downloadAbortRef.current?.abort();
    const controller = new AbortController();
    downloadAbortRef.current = controller;
    setDownloading(true);
    setDownloadError(undefined);
    try {
      const fetcher =
        benchmarkIndex != null
          ? getEvaluationJobBenchmarkLogs('', namespace, job.resource.id, benchmarkIndex)
          : getEvaluationJobLogs('', namespace, job.resource.id);
      const fullLogs = await fetcher(controller.signal);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const bmSuffix = benchmarkIndex != null ? `-benchmark-${benchmarkIndex}` : '';
      downloadString(`${evaluationName}${bmSuffix}-logs-${timestamp}.log`, fullLogs);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setDownloadError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setDownloading(false);
    }
  }, [namespace, job?.resource.id, evaluationName, benchmarkIndex]);

  React.useEffect(() => () => downloadAbortRef.current?.abort(), []);

  React.useEffect(() => {
    if (typeof logContainerRef.current?.scrollTo === 'function') {
      logContainerRef.current.scrollTo(0, 0);
    }
  }, [selectedBenchmark]);

  const logEntries = React.useMemo(() => (logs ? parseLogEntries(logs) : []), [logs]);

  const filteredLogEntries = React.useMemo(() => {
    if (logLevelFilter === 'all') {
      return logEntries;
    }

    const filtered = logEntries.filter((entry) => {
      if (entry.isSectionHeader) {
        return true;
      }
      if (logLevelFilter === 'warnings') {
        return entry.level === 'warning' || entry.level === 'error';
      }
      return entry.level === 'error';
    });

    const emptyNotice: LogEntry = {
      raw: '',
      message: `No ${logLevelFilter === 'errors' ? 'error' : 'warning or error'} logs in this section.`,
      isSectionHeader: false,
      isEmptyFilterNotice: true,
    };

    const result: LogEntry[] = [];
    for (let i = 0; i < filtered.length; i++) {
      result.push(filtered[i]);
      if (
        filtered[i].isSectionHeader &&
        (i + 1 >= filtered.length || filtered[i + 1].isSectionHeader)
      ) {
        result.push(emptyNotice);
      }
    }

    if (result.length === 0 && logEntries.length > 0) {
      result.push(emptyNotice);
    }

    return result;
  }, [logEntries, logLevelFilter]);

  const hasLogContent =
    logEntries.length > 0 && !logEntries.every((e) => e.isSectionHeader || !e.message.trim());

  if (!job) {
    return null;
  }

  // Prefer polled state so the badge updates on the 10s cycle rather than waiting for the 30s list refresh
  const state = polledJobData?.status.state ?? job.status.state;
  // Prefer polled message so text reflects the latest server state, not the stale list snapshot
  const { message_code: messageCode, message_origin: messageOrigin } =
    polledJobData?.status.message ?? job.status.message ?? {};
  const isInProgress = state === 'running' || state === 'pending' || state === 'stopping';
  const elapsed = formatDurationCompact(
    job.resource.created_at,
    isInProgress ? new Date().toISOString() : job.resource.updated_at,
  );
  const isFailed = state === 'failed' || state === 'partially_failed';
  // Use the most-current benchmark data (polled > list) to detect pre-start failures.
  // A failed job where no benchmark ever received a started_at means the failure occurred
  // before any evaluation work began (e.g. admission error, resource constraint).
  const isPreStartFailure =
    state === 'failed' && !getEarliestBenchmarkStartTime(polledJobData ?? job);

  const headerIconStatus: 'success' | 'danger' | 'warning' | undefined =
    state === 'completed'
      ? 'success'
      : state === 'failed'
        ? 'danger'
        : state === 'partially_failed'
          ? 'warning'
          : undefined;

  const headerIcon =
    state === 'completed' ? (
      <CheckCircleIcon />
    ) : state === 'failed' ? (
      <ExclamationCircleIcon />
    ) : state === 'partially_failed' ? (
      <ExclamationTriangleIcon />
    ) : (
      <InProgressIcon />
    );

  const handleViewBenchmarkLogs = (bmIndex: number) => {
    setSelectedBenchmark(String(bmIndex));
    setActiveTab('events-log');
  };

  let logViewerClassName = 'evalhub-log-viewer';
  if (state === 'completed') {
    logViewerClassName += ' evalhub-log-viewer--completed';
  } else if (isInProgress) {
    logViewerClassName += ' evalhub-log-viewer--running';
  }

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
      <ModalHeader
        title={
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
            <FlexItem>Evaluation run status</FlexItem>
            <FlexItem>
              <EvaluationStatusLabel state={state} isPreStartFailure={isPreStartFailure} />
            </FlexItem>
          </Flex>
        }
      />
      <ModalBody>
        <div className="evalhub-status-modal__header" data-testid="status-detail-header">
          <Stack hasGutter>
            <StackItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  <Icon isInline status={headerIconStatus}>
                    {headerIcon}
                  </Icon>
                </FlexItem>
                <FlexItem>
                  <Content
                    component="p"
                    className="evalhub-status-modal__evaluation-name"
                    data-testid="evaluation-header"
                  >
                    {isInProgress
                      ? `${state === 'stopping' ? 'Canceling' : state === 'pending' ? 'Pending' : 'Running'} `
                      : ''}
                    {evaluationName}
                  </Content>
                </FlexItem>
              </Flex>
            </StackItem>
            {descriptionText ? (
              <StackItem>
                <Content
                  component="p"
                  className="evalhub-status-modal__description"
                  data-testid="status-description"
                >
                  {descriptionText}
                </Content>
              </StackItem>
            ) : null}
            {isInProgress && progressBenchmarks.length > 0 ? (
              <StackItem>
                <Content component="p" data-testid="benchmark-progress">
                  <strong>
                    {progressCompletedCount}/{progressBenchmarks.length} benchmarks complete
                  </strong>
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
          </Stack>
          <Tabs
            activeKey={activeTab}
            onSelect={(_e, key) => setActiveTab(String(key))}
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
                  completedCount={progressCompletedCount}
                  hasPolledData={!!polledJobData || !isInProgress}
                  onViewLogs={handleViewBenchmarkLogs}
                />
              </StackItem>
            </Stack>
          ) : activeTab === 'events-log' ? (
            <Stack hasGutter>
              <StackItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
                  <FlexItem>
                    <Select
                      isOpen={isBenchmarkSelectOpen}
                      onOpenChange={setIsBenchmarkSelectOpen}
                      onSelect={(_e, value) => {
                        setSelectedBenchmark(String(value));
                        setIsBenchmarkSelectOpen(false);
                      }}
                      selected={selectedBenchmark}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setIsBenchmarkSelectOpen((prev) => !prev)}
                          isExpanded={isBenchmarkSelectOpen}
                          data-testid="benchmark-log-selector"
                        >
                          {selectedBenchmark === ALL_BENCHMARKS
                            ? 'All benchmarks'
                            : (progressBenchmarks.find(
                                (b) => b.benchmark_index === parseInt(selectedBenchmark, 10),
                              )?.id ?? `Benchmark ${selectedBenchmark}`)}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        <SelectOption value={ALL_BENCHMARKS}>All benchmarks</SelectOption>
                        {progressBenchmarks.map((bm) =>
                          bm.benchmark_index != null ? (
                            <SelectOption key={bm.id} value={String(bm.benchmark_index)}>
                              {bm.id}
                            </SelectOption>
                          ) : null,
                        )}
                      </SelectList>
                    </Select>
                  </FlexItem>
                  <FlexItem>
                    <Tooltip content={`Filter: ${LOG_LEVEL_FILTER_LABELS[logLevelFilter]}`}>
                      <Dropdown
                        isOpen={isLogLevelFilterOpen}
                        onOpenChange={setIsLogLevelFilterOpen}
                        onSelect={(_e, value) => {
                          if (value === 'all' || value === 'warnings' || value === 'errors') {
                            setLogLevelFilter(value);
                          }
                          setIsLogLevelFilterOpen(false);
                        }}
                        toggle={(toggleRef) => (
                          <MenuToggle
                            ref={toggleRef}
                            variant="plain"
                            onClick={() => setIsLogLevelFilterOpen((prev) => !prev)}
                            isExpanded={isLogLevelFilterOpen}
                            aria-label="Filter log level"
                            data-testid="log-level-filter"
                          >
                            <FilterIcon />
                          </MenuToggle>
                        )}
                      >
                        <DropdownList>
                          {(['all', 'warnings', 'errors'] as const).map((value) => (
                            <DropdownItem
                              key={value}
                              value={value}
                              isSelected={logLevelFilter === value}
                            >
                              {LOG_LEVEL_FILTER_LABELS[value]}
                            </DropdownItem>
                          ))}
                        </DropdownList>
                      </Dropdown>
                    </Tooltip>
                  </FlexItem>
                  <FlexItem>
                    <Tooltip content="Refresh logs">
                      <Button
                        variant="plain"
                        aria-label="Refresh logs"
                        onClick={refresh}
                        data-testid="refresh-logs-button"
                      >
                        <SyncAltIcon />
                      </Button>
                    </Tooltip>
                  </FlexItem>
                  <FlexItem align={{ default: 'alignRight' }}>
                    <Button
                      variant="link"
                      aria-label="Download log"
                      onClick={handleDownload}
                      isDisabled={!logsLoaded || !hasLogContent || downloading}
                      isLoading={downloading}
                      data-testid="download-logs-button"
                      icon={<DownloadIcon />}
                    >
                      Download log
                    </Button>
                  </FlexItem>
                </Flex>
              </StackItem>
              {downloadError ? (
                <StackItem>
                  <Alert
                    variant="warning"
                    isInline
                    title="Failed to download logs"
                    data-testid="download-error-alert"
                    actionClose={
                      <AlertActionCloseButton onClose={() => setDownloadError(undefined)} />
                    }
                  >
                    {downloadError.message}
                  </Alert>
                </StackItem>
              ) : null}
              <StackItem>
                <div
                  ref={logContainerRef}
                  className={logViewerClassName}
                  data-testid="log-content"
                  role="log"
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                  tabIndex={0}
                  aria-label="Evaluation log output"
                >
                  {!logsLoaded ? (
                    <LogSkeletonRows />
                  ) : logsError && isLogApiUnavailable(logsError) ? (
                    <Alert
                      className="evalhub-log-viewer__alert"
                      variant="info"
                      isInline
                      title="Logs not available"
                      data-testid="logs-unavailable-alert"
                    >
                      Detailed logs are not available on this server version.
                    </Alert>
                  ) : logsError && isInProgress && isLogServerError(logsError) ? (
                    <Alert
                      className="evalhub-log-viewer__alert"
                      variant="info"
                      isInline
                      title="Logs not yet available"
                      data-testid="logs-pending-alert"
                      actionLinks={
                        <Button variant="link" onClick={refresh}>
                          Retry
                        </Button>
                      }
                    >
                      The evaluation pod may still be starting. Try again in a moment.
                    </Alert>
                  ) : logsError ? (
                    <Alert
                      className="evalhub-log-viewer__alert"
                      variant="danger"
                      isInline
                      title="Failed to load logs"
                      data-testid="logs-error-alert"
                      actionLinks={
                        <Button variant="link" onClick={refresh}>
                          Retry
                        </Button>
                      }
                    >
                      {logsError.message}
                    </Alert>
                  ) : !hasLogContent ? (
                    <Alert
                      className="evalhub-log-viewer__alert"
                      variant="info"
                      isInline
                      title="No log content available"
                      data-testid="logs-empty-alert"
                    >
                      Logs may have expired after pod cleanup.
                    </Alert>
                  ) : (
                    filteredLogEntries.map((entry, i, arr) => {
                      if (entry.isEmptyFilterNotice) {
                        return (
                          <div
                            key={i}
                            className="evalhub-log-viewer__row evalhub-log-viewer__row--empty-filter"
                            data-testid="log-filter-empty-notice"
                          >
                            <div className="evalhub-log-viewer__cell--full">{entry.message}</div>
                          </div>
                        );
                      }
                      const hideBorder =
                        i + 1 < arr.length && !arr[i + 1].timestamp && !arr[i + 1].isSectionHeader;
                      return <LogEntryRow key={i} entry={entry} hideBorder={hideBorder} />;
                    })
                  )}
                </div>
              </StackItem>
            </Stack>
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose} data-testid="status-modal-close-button">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EvaluationStatusModal;
