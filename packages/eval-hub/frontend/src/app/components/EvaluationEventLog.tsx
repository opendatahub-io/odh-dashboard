import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Icon,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  FilterIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { useEvaluationJobLogs } from '~/app/hooks/useEvaluationJobLogs';
import {
  getEvaluationJobLogs,
  getEvaluationJobBenchmarkLogs,
  isLogApiUnavailable,
  isLogServerError,
} from '~/app/api/k8s';
import './EvaluationEventLog.scss';

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
    try {
      navigator.clipboard.writeText(entry.raw).then(
        () => {
          setCopied(true);
          clearTimeout(copyTimeoutRef.current);
          copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
        },
        () => undefined,
      );
    } catch {
      // clipboard API unavailable (e.g. non-HTTPS context)
    }
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

export type EventLogBenchmark = {
  key: string;
  id: string;
  benchmark_index?: number;
};

type EvaluationEventLogProps = {
  namespace: string;
  jobId: string;
  evaluationName: string;
  benchmarks: EventLogBenchmark[];
  isInProgress: boolean;
  state: string;
  activeBenchmarkIndex?: number;
};

const EvaluationEventLog: React.FC<EvaluationEventLogProps> = ({
  namespace,
  jobId,
  evaluationName,
  benchmarks,
  isInProgress,
  state,
  activeBenchmarkIndex,
}) => {
  const [selectedBenchmark, setSelectedBenchmark] = React.useState<string>(
    activeBenchmarkIndex != null ? String(activeBenchmarkIndex) : ALL_BENCHMARKS,
  );
  const [isBenchmarkSelectOpen, setIsBenchmarkSelectOpen] = React.useState(false);
  const [logLevelFilter, setLogLevelFilter] = React.useState<LogLevelFilter>('all');
  const [isLogLevelFilterOpen, setIsLogLevelFilterOpen] = React.useState(false);
  const logContainerRef = React.useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<Error | undefined>();
  const downloadAbortRef = React.useRef<AbortController>();

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
  } = useEvaluationJobLogs(namespace, jobId, benchmarkIndex, LOG_VIEWER_TAIL_LINES);

  const handleDownload = React.useCallback(async () => {
    downloadAbortRef.current?.abort();
    const controller = new AbortController();
    downloadAbortRef.current = controller;
    setDownloading(true);
    setDownloadError(undefined);
    try {
      const fetcher =
        benchmarkIndex != null
          ? getEvaluationJobBenchmarkLogs('', namespace, jobId, benchmarkIndex)
          : getEvaluationJobLogs('', namespace, jobId);
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
  }, [namespace, jobId, evaluationName, benchmarkIndex]);

  React.useEffect(() => () => downloadAbortRef.current?.abort(), []);

  React.useEffect(() => {
    if (typeof logContainerRef.current?.scrollTo === 'function') {
      logContainerRef.current.scrollTo(0, 0);
    }
  }, [selectedBenchmark]);

  const logEntries = React.useMemo(() => (logs ? parseLogEntries(logs) : []), [logs]);

  const isSingleBenchmark = benchmarks.length <= 1;

  const filteredLogEntries = React.useMemo(() => {
    if (logLevelFilter === 'all') {
      return isSingleBenchmark ? logEntries.filter((e) => !e.isSectionHeader) : logEntries;
    }

    const filtered = logEntries.filter((entry) => {
      if (entry.isSectionHeader) {
        return !isSingleBenchmark;
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
  }, [logEntries, logLevelFilter, isSingleBenchmark]);

  const hasLogContent =
    logEntries.length > 0 && !logEntries.every((e) => e.isSectionHeader || !e.message.trim());

  let logViewerClassName = 'evalhub-log-viewer';
  if (state === 'completed') {
    logViewerClassName += ' evalhub-log-viewer--completed';
  } else if (isInProgress) {
    logViewerClassName += ' evalhub-log-viewer--running';
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          {benchmarks.length > 1 ? (
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
                      : (benchmarks.find(
                          (b) => b.benchmark_index === parseInt(selectedBenchmark, 10),
                        )?.id ?? `Benchmark ${selectedBenchmark}`)}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value={ALL_BENCHMARKS}>All benchmarks</SelectOption>
                  {benchmarks.map((bm) =>
                    bm.benchmark_index != null ? (
                      <SelectOption key={bm.key} value={String(bm.benchmark_index)}>
                        {bm.id}
                      </SelectOption>
                    ) : null,
                  )}
                </SelectList>
              </Select>
            </FlexItem>
          ) : null}
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
                    <DropdownItem key={value} value={value} isSelected={logLevelFilter === value}>
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
            actionClose={<AlertActionCloseButton onClose={() => setDownloadError(undefined)} />}
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
  );
};

export default EvaluationEventLog;
