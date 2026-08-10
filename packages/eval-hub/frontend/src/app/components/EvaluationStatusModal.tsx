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
  CheckCircleIcon,
  CopyIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  InProgressIcon,
  SyncAltIcon,
  TimesCircleIcon,
} from '@patternfly/react-icons';
import { EvaluationJob } from '~/app/types';
import { formatDuration } from '~/app/utilities/evaluationUtils';
import { useEvaluationJobLogs } from '~/app/hooks/useEvaluationJobLogs';
import EvaluationStatusLabel from './EvaluationStatusLabel';
import './EvaluationStatusModal.scss';

type EvaluationStatusModalProps = {
  job: EvaluationJob | undefined;
  namespace: string;
  onClose: () => void;
};

const ALL_BENCHMARKS = 'all';
const MESSAGE_LINE_LIMIT = 3;

const TruncatedMessage: React.FC<{ text: string }> = ({ text }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const lines = text.split('\n').filter(Boolean);
  const needsTruncation = lines.length > MESSAGE_LINE_LIMIT;

  const displayText =
    needsTruncation && !isExpanded ? lines.slice(0, MESSAGE_LINE_LIMIT).join('\n') : text;

  return (
    <Content component="p" data-testid="failure-detail-reason">
      <span className="evalhub-status-modal__truncated-message">{displayText}</span>
      {needsTruncation ? (
        <div>
          <Button
            variant="link"
            isInline
            onClick={() => setIsExpanded((prev) => !prev)}
            data-testid="failure-message-toggle"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Button>
        </div>
      ) : null}
    </Content>
  );
};

const StatusIcon: React.FC<{ state: string }> = ({ state }) => {
  if (state === 'failed' || state === 'partially_failed') {
    return (
      <Icon status="danger" isInline>
        <ExclamationCircleIcon />
      </Icon>
    );
  }
  if (state === 'completed') {
    return (
      <Icon status="success" isInline>
        <CheckCircleIcon />
      </Icon>
    );
  }
  if (state === 'running' || state === 'pending' || state === 'stopping') {
    return (
      <Icon isInline>
        <InProgressIcon />
      </Icon>
    );
  }
  return null;
};

type LogLevel = 'error' | 'warning' | 'info' | 'debug';

type LogEntry = {
  raw: string;
  timestamp?: string;
  thread?: string;
  level?: LogLevel;
  message: string;
  continuation?: string;
  isSectionHeader: boolean;
};

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/;
const LOG_LINE_RE =
  /^(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}[,.\d]*)\s+-\s+(\S+)\s+-\s+(INFO|WARNING|ERROR|DEBUG)\s+-\s+([\s\S]*)/i;

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

const parseLogEntries = (raw: string): LogEntry[] => {
  const lines = raw.split('\n');
  const entries: LogEntry[] = [];

  for (const line of lines) {
    const isNewEntry = TIMESTAMP_RE.test(line) || line.startsWith('===');
    if (isNewEntry || entries.length === 0) {
      if (line.startsWith('===')) {
        entries.push({ raw: line, message: line, isSectionHeader: true });
      } else {
        const match = LOG_LINE_RE.exec(line);
        if (match) {
          entries.push({
            raw: line,
            timestamp: match[1].trim(),
            thread: match[2].trim(),
            level: LOG_LEVEL_MAP[match[3].toLowerCase()],
            message: match[4].trim(),
            isSectionHeader: false,
          });
        } else {
          entries.push({ raw: line, message: line, isSectionHeader: false });
        }
      }
    } else if (entries.length > 0) {
      const current = entries[entries.length - 1];
      current.raw += `\n${line}`;
      current.continuation = current.continuation ? `${current.continuation}\n${line}` : line;
    }
  }

  return entries.filter((e) => e.message.trim() || e.continuation?.trim());
};

const LOG_LEVEL_ICON: Record<LogLevel, React.ReactNode> = {
  error: (
    <Icon status="danger" isInline>
      <ExclamationCircleIcon />
    </Icon>
  ),
  warning: (
    <Icon status="warning" isInline>
      <ExclamationTriangleIcon />
    </Icon>
  ),
  info: (
    <Icon status="info" isInline>
      <InfoCircleIcon />
    </Icon>
  ),
  debug: (
    <Icon isInline>
      <InfoCircleIcon />
    </Icon>
  ),
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  error: 'ERROR',
  warning: 'WARNING',
  info: 'INFO',
  debug: 'DEBUG',
};

const STATUS_HEADINGS: Record<string, string> = {
  pending: 'Pending',
  running: 'Running tests',
  completed: 'Completed',
  failed: 'Failed',
  // eslint-disable-next-line camelcase
  partially_failed: 'Partially failed',
  cancelled: 'Canceled',
  stopping: 'Canceling',
  stopped: 'Stopped',
};

const LogHeader: React.FC = () => (
  <div className="evalhub-log-viewer__row evalhub-log-viewer__row--header">
    <div className="evalhub-log-viewer__cell--level-header">
      <span className="evalhub-log-viewer__icon-spacer" />
      <span>Level</span>
    </div>
    <div className="evalhub-log-viewer__cell--timestamp-header">Timestamp</div>
    <div className="evalhub-log-viewer__cell--thread-header">Thread</div>
    <div className="evalhub-log-viewer__cell--message">Message</div>
  </div>
);

const LogEntryRow: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(entry.raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [entry.raw]);

  const rowClass = [
    'evalhub-log-viewer__row',
    entry.isSectionHeader ? 'evalhub-log-viewer__row--section' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const copyButton = isHovered ? (
    <div className="evalhub-log-viewer__copy">
      <Tooltip content={copied ? 'Copied' : 'Copy'}>
        <Button variant="plain" aria-label="Copy log entry" onClick={handleCopy}>
          {copied ? <CheckCircleIcon /> : <CopyIcon />}
        </Button>
      </Tooltip>
    </div>
  ) : null;

  if (entry.isSectionHeader) {
    return (
      <div
        className={rowClass}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="evalhub-log-viewer__cell--level" />
        <div className="evalhub-log-viewer__cell--timestamp" />
        <div className="evalhub-log-viewer__cell--thread" />
        <div className="evalhub-log-viewer__cell--message">{entry.message}</div>
        {copyButton}
      </div>
    );
  }

  const fullMessage = entry.continuation
    ? `${entry.message}\n${entry.continuation}`
    : entry.message;

  return (
    <div
      className={rowClass}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="evalhub-log-viewer__cell--level">
        {entry.level ? LOG_LEVEL_ICON[entry.level] : null}
        <span>{entry.level ? LEVEL_LABELS[entry.level] : ''}</span>
      </div>
      <div className="evalhub-log-viewer__cell--timestamp" title={entry.timestamp}>
        {entry.timestamp ? formatLogTimestamp(entry.timestamp) : ''}
      </div>
      <div className="evalhub-log-viewer__cell--thread" title={entry.thread}>
        {entry.thread ?? ''}
      </div>
      <div className="evalhub-log-viewer__cell--message">{fullMessage}</div>
      {copyButton}
    </div>
  );
};

const LogSkeletonRows: React.FC = () => (
  <>
    {Array.from({ length: 5 }, (_, i) => (
      <div key={i} className="evalhub-log-viewer__row">
        <div className="evalhub-log-viewer__cell--level">
          <Skeleton width="100%" height="1em" />
        </div>
        <div className="evalhub-log-viewer__cell--timestamp">
          <Skeleton width="80%" height="1em" />
        </div>
        <div className="evalhub-log-viewer__cell--thread">
          <Skeleton width="70%" height="1em" />
        </div>
        <div className="evalhub-log-viewer__cell--message">
          <Skeleton width={`${60 + ((i * 17) % 30)}%`} height="1em" />
        </div>
      </div>
    ))}
  </>
);

const EvaluationStatusModal: React.FC<EvaluationStatusModalProps> = ({
  job,
  namespace,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<string>('failure-info');
  const [selectedBenchmark, setSelectedBenchmark] = React.useState<string>(ALL_BENCHMARKS);
  const [isBenchmarkSelectOpen, setIsBenchmarkSelectOpen] = React.useState(false);

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
    500,
  );

  const sortedBenchmarks = React.useMemo(
    () => (job?.status.benchmarks ?? []).toSorted((a, b) => a.id.localeCompare(b.id)),
    [job?.status.benchmarks],
  );

  React.useEffect(() => {
    if (job) {
      const jobFailed = job.status.state === 'failed' || job.status.state === 'partially_failed';
      setActiveTab(jobFailed ? 'failure-info' : 'events-log');
      setSelectedBenchmark(ALL_BENCHMARKS);
    }
  }, [job]);

  if (!job) {
    return null;
  }

  const { state } = job.status;
  const {
    message,
    message_code: messageCode,
    message_origin: messageOrigin,
  } = job.status.message ?? {};
  const isInProgress = state === 'running' || state === 'pending' || state === 'stopping';
  const elapsed = formatDuration(
    job.resource.created_at,
    isInProgress ? new Date().toISOString() : job.resource.updated_at,
  );
  const isFailed = state === 'failed' || state === 'partially_failed';

  const handleViewBenchmarkLogs = (bmIndex: number) => {
    setSelectedBenchmark(String(bmIndex));
    setActiveTab('events-log');
  };

  const hasLogContent =
    logs.trim().length > 0 &&
    !logs.split('\n').every((line) => line.startsWith('===') || line.trim() === '');

  const fullMessage = message ? (elapsed ? `${message} Elapsed: ${elapsed}` : message) : undefined;

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
              <EvaluationStatusLabel state={state} />
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
                  <StatusIcon state={state} />
                </FlexItem>
                <FlexItem>
                  <Content component="p">
                    <strong>{STATUS_HEADINGS[state] ?? state}</strong>
                  </Content>
                </FlexItem>
              </Flex>
            </StackItem>
            {fullMessage ? (
              <StackItem>
                <TruncatedMessage text={fullMessage} />
              </StackItem>
            ) : null}
          </Stack>
          <Tabs
            activeKey={activeTab}
            onSelect={(_e, key) => setActiveTab(String(key))}
            data-testid="status-modal-tabs"
            className="evalhub-status-modal__tabs"
          >
            {isFailed ? (
              <Tab
                eventKey="failure-info"
                title={<TabTitleText>Failure info</TabTitleText>}
                data-testid="failure-info-tab"
              />
            ) : null}
            <Tab
              eventKey="events-log"
              title={<TabTitleText>Events log</TabTitleText>}
              data-testid="events-log-tab"
            />
          </Tabs>
        </div>

        {/* Tab content */}
        <div className="pf-v6-u-pt-md">
          {isFailed && activeTab === 'failure-info' ? (
            <Stack hasGutter>
              {messageOrigin || messageCode ? (
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
                          <Label isCompact>{messageCode}</Label>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : null}
                  </DescriptionList>
                </StackItem>
              ) : null}

              {sortedBenchmarks.length > 0 ? (
                <StackItem>
                  <Content component="h4">Per-benchmark status</Content>
                  <Stack hasGutter data-testid="failure-detail-benchmark-errors">
                    {sortedBenchmarks.map((bm) => {
                      const bmFailed = bm.status === 'failed';
                      return (
                        <StackItem key={bm.id}>
                          <Stack>
                            <StackItem>
                              <Flex
                                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                                alignItems={{ default: 'alignItemsCenter' }}
                              >
                                <FlexItem>
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    gap={{ default: 'gapSm' }}
                                  >
                                    <FlexItem>
                                      <Icon status={bmFailed ? 'danger' : 'success'} isInline>
                                        {bmFailed ? <TimesCircleIcon /> : <CheckCircleIcon />}
                                      </Icon>
                                    </FlexItem>
                                    <FlexItem>
                                      <strong>{bm.id}</strong>
                                    </FlexItem>
                                  </Flex>
                                </FlexItem>
                                {bmFailed && bm.error_message?.message_code ? (
                                  <FlexItem>
                                    <Label isCompact>{bm.error_message.message_code}</Label>
                                  </FlexItem>
                                ) : null}
                              </Flex>
                            </StackItem>
                            <StackItem>
                              <Content component="p">
                                {bmFailed && bm.error_message?.message
                                  ? bm.error_message.message
                                  : bm.status}
                              </Content>
                            </StackItem>
                            {bmFailed && bm.benchmark_index != null ? (
                              <StackItem>
                                <Button
                                  variant="link"
                                  isInline
                                  onClick={() => handleViewBenchmarkLogs(bm.benchmark_index!)}
                                  data-testid={`view-logs-${bm.id}`}
                                >
                                  View logs
                                </Button>
                              </StackItem>
                            ) : null}
                          </Stack>
                        </StackItem>
                      );
                    })}
                  </Stack>
                </StackItem>
              ) : null}
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
                            : (sortedBenchmarks.find(
                                (b) => b.benchmark_index === parseInt(selectedBenchmark, 10),
                              )?.id ?? `Benchmark ${selectedBenchmark}`)}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        <SelectOption value={ALL_BENCHMARKS}>All benchmarks</SelectOption>
                        {sortedBenchmarks.map((bm) =>
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
                    <Button
                      variant="plain"
                      aria-label="Refresh logs"
                      onClick={refresh}
                      data-testid="refresh-logs-button"
                    >
                      <SyncAltIcon />
                    </Button>
                  </FlexItem>
                </Flex>
              </StackItem>
              <StackItem>
                <LogHeader />
                <div className="evalhub-log-viewer" data-testid="log-content">
                  {!logsLoaded ? (
                    <LogSkeletonRows />
                  ) : logsError ? (
                    <Alert
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
                      variant="info"
                      isInline
                      title="No log content available"
                      data-testid="logs-empty-alert"
                    >
                      Logs may have expired after pod cleanup.
                    </Alert>
                  ) : (
                    parseLogEntries(logs).map((entry, i) => <LogEntryRow key={i} entry={entry} />)
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
