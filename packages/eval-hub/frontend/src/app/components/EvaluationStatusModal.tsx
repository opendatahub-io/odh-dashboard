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
  BanIcon,
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
  getBenchmarkName,
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
import { isPreStartFailure } from '~/app/utilities/evaluationJobPolling';
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

  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<Error | undefined>();
  const downloadAbortRef = React.useRef<AbortController>();

  const jobId = job?.resource.id;

  React.useEffect(() => {
    if (jobId) {
      setActiveTab('progress');
      setSelectedBenchmark(ALL_BENCHMARKS);
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
  // Use the most-current benchmark data (polled > list) to detect pre-start failures.
  const isPreStart = isPreStartFailure(polledJobData ?? job);

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
                  hasPolledData={!!polledJobData || !isInProgress}
                  isTerminal={!isInProgress}
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
                            <SelectOption key={bm.key} value={String(bm.benchmark_index)}>
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
