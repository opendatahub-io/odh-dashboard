import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EvaluationEventLog, { EventLogBenchmark } from '~/app/components/EvaluationEventLog';

const mockRefresh = jest.fn();
const mockUseEvaluationJobLogs = jest.fn().mockReturnValue({
  logs: '2026-01-01 10:00:00 - main - INFO - Test log entry',
  loaded: true,
  error: undefined,
  refresh: mockRefresh,
});

jest.mock('~/app/hooks/useEvaluationJobLogs', () => ({
  useEvaluationJobLogs: (...args: unknown[]) => mockUseEvaluationJobLogs(...args),
}));

jest.mock('~/app/api/k8s', () => ({
  getEvaluationJobLogs: jest.fn(() => () => Promise.resolve('')),
  getEvaluationJobBenchmarkLogs: jest.fn(() => () => Promise.resolve('')),
  isLogApiUnavailable: jest.fn(() => false),
  isLogServerError: jest.fn(() => false),
}));

/* eslint-disable camelcase */
const defaultBenchmarks: EventLogBenchmark[] = [
  { key: 'bm-0', id: 'benchmark-alpha', benchmark_index: 0 },
  { key: 'bm-1', id: 'benchmark-beta', benchmark_index: 1 },
];
/* eslint-enable camelcase */

const renderComponent = (props: Partial<React.ComponentProps<typeof EvaluationEventLog>> = {}) =>
  render(
    <EvaluationEventLog
      namespace="test-ns"
      jobId="job-123"
      evaluationName="eval-test"
      benchmarks={props.benchmarks ?? defaultBenchmarks}
      isInProgress={props.isInProgress ?? true}
      {...props}
    />,
  );

describe('EvaluationEventLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '2026-01-01 10:00:00 - main - INFO - Test log entry',
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
    });
  });

  it('should render log content when loaded', () => {
    renderComponent();
    expect(screen.getByTestId('log-content')).toBeInTheDocument();
  });

  it('should render the refresh button', () => {
    renderComponent();
    expect(screen.getByTestId('refresh-logs-button')).toBeInTheDocument();
  });

  it('should call refresh when refresh button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('refresh-logs-button'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should render the benchmark selector when multiple benchmarks exist', () => {
    renderComponent();
    expect(screen.getByTestId('benchmark-log-selector')).toBeInTheDocument();
  });

  it('should not render the benchmark selector for a single benchmark', () => {
    renderComponent({
      // eslint-disable-next-line camelcase
      benchmarks: [{ key: 'bm-0', id: 'only-benchmark', benchmark_index: 0 }],
    });
    expect(screen.queryByTestId('benchmark-log-selector')).not.toBeInTheDocument();
  });

  it('should wrap the toolbar on narrow viewports and keep a single row from md', () => {
    renderComponent();
    const toolbar = screen.getByTestId('event-log-toolbar');
    expect(toolbar).toHaveClass('pf-m-wrap');
    expect(toolbar).toHaveClass('pf-m-nowrap-on-md');
  });

  describe('scrollToBottomOnNextLoad reset on benchmark change', () => {
    it('should not scroll to bottom on newly selected benchmark after a refresh was requested', () => {
      const scrollToSpy = jest.fn();

      mockUseEvaluationJobLogs.mockReturnValue({
        logs: '',
        loaded: false,
        error: undefined,
        refresh: mockRefresh,
      });

      const { rerender } = render(
        <EvaluationEventLog
          namespace="test-ns"
          jobId="job-123"
          evaluationName="eval-test"
          benchmarks={defaultBenchmarks}
          isInProgress
        />,
      );

      // Simulate: logs become loaded for the initial benchmark
      mockUseEvaluationJobLogs.mockReturnValue({
        logs: '2026-01-01 10:00:00 - main - INFO - Initial log',
        loaded: true,
        error: undefined,
        refresh: mockRefresh,
      });

      rerender(
        <EvaluationEventLog
          namespace="test-ns"
          jobId="job-123"
          evaluationName="eval-test"
          benchmarks={defaultBenchmarks}
          isInProgress
        />,
      );

      // Click refresh — this sets scrollToBottomOnNextLoad = true
      fireEvent.click(screen.getByTestId('refresh-logs-button'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);

      // Before logs finish loading, simulate switching to a different benchmark
      // Logs go back to not-loaded because the hook refetches for the new benchmark
      mockUseEvaluationJobLogs.mockReturnValue({
        logs: '',
        loaded: false,
        error: undefined,
        refresh: mockRefresh,
      });

      // Select a different benchmark
      fireEvent.click(screen.getByTestId('benchmark-log-selector'));
      const option = screen.getByText('benchmark-beta');
      fireEvent.click(option);

      // Now the new benchmark's logs load
      const logContainer = screen.getByTestId('log-content');
      Object.defineProperty(logContainer, 'scrollTo', { value: scrollToSpy, writable: true });
      Object.defineProperty(logContainer, 'scrollHeight', { value: 2000, configurable: true });
      Object.defineProperty(logContainer, 'clientHeight', { value: 500, configurable: true });

      mockUseEvaluationJobLogs.mockReturnValue({
        logs: '2026-01-01 11:00:00 - main - INFO - New benchmark log',
        loaded: true,
        error: undefined,
        refresh: mockRefresh,
      });

      rerender(
        <EvaluationEventLog
          namespace="test-ns"
          jobId="job-123"
          evaluationName="eval-test"
          benchmarks={defaultBenchmarks}
          isInProgress
        />,
      );

      // The scroll-to-bottom call from the refresh should NOT have fired
      // because we switched benchmarks, which resets the flag.
      // The only scrollTo call should be the scroll-to-top from benchmark change.
      const scrollToBottomCalls = scrollToSpy.mock.calls.filter(([, y]: [number, number]) => y > 0);
      expect(scrollToBottomCalls).toHaveLength(0);
    });

    it('should cancel a queued scroll-to-bottom frame when benchmark changes', () => {
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
      const cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(jest.fn());

      mockUseEvaluationJobLogs.mockReturnValue({
        logs: '',
        loaded: false,
        error: undefined,
        refresh: mockRefresh,
      });

      const { rerender } = render(
        <EvaluationEventLog
          namespace="test-ns"
          jobId="job-123"
          evaluationName="eval-test"
          benchmarks={defaultBenchmarks}
          isInProgress
        />,
      );

      // Load initial logs
      mockUseEvaluationJobLogs.mockReturnValue({
        logs: '2026-01-01 10:00:00 - main - INFO - Initial log',
        loaded: true,
        error: undefined,
        refresh: mockRefresh,
      });
      rerender(
        <EvaluationEventLog
          namespace="test-ns"
          jobId="job-123"
          evaluationName="eval-test"
          benchmarks={defaultBenchmarks}
          isInProgress
        />,
      );

      // Refresh to set scrollToBottomOnNextLoad, then reload logs to queue the rAF
      fireEvent.click(screen.getByTestId('refresh-logs-button'));
      mockUseEvaluationJobLogs.mockReturnValue({
        logs: '2026-01-01 10:00:01 - main - INFO - After refresh',
        loaded: true,
        error: undefined,
        refresh: mockRefresh,
      });
      rerender(
        <EvaluationEventLog
          namespace="test-ns"
          jobId="job-123"
          evaluationName="eval-test"
          benchmarks={defaultBenchmarks}
          isInProgress
        />,
      );

      expect(rafSpy).toHaveBeenCalled();

      // Switch benchmark before the frame fires
      fireEvent.click(screen.getByTestId('benchmark-log-selector'));
      fireEvent.click(screen.getByText('benchmark-beta'));

      expect(cafSpy).toHaveBeenCalledWith(42);

      rafSpy.mockRestore();
      cafSpy.mockRestore();
    });
  });
});
