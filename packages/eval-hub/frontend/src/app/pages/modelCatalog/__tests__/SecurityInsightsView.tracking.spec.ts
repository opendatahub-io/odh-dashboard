/* eslint-disable camelcase */
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { SecurityInsight } from '~/app/pages/modelCatalog/securityInsightsTypes';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockInsights: SecurityInsight[] = [
  {
    evaluation: 'Pipeline',
    category: 'Security',
    benchmarkName: 'Prompt Injection',
    benchmarkDescription: 'Tests resistance to prompt injection attacks',
    result: '85.0%',
  },
  {
    evaluation: 'Manual',
    category: 'Safety',
    benchmarkName: 'Toxicity Detection',
    benchmarkDescription: 'Measures model output toxicity',
    result: '92.0%',
  },
  {
    evaluation: 'Automated',
    category: 'Alignment',
    benchmarkName: 'Bias Detection',
    benchmarkDescription: 'Detects bias in model responses',
    result: '78.5%',
  },
];

let mockLoaded = true;
let mockLoadError: Error | undefined;
let mockInsightsData = mockInsights;

jest.mock('~/app/hooks/useSecurityArtifacts', () => ({
  __esModule: true,
  default: () => ({
    insights: mockInsightsData,
    loaded: mockLoaded,
    loadError: mockLoadError,
  }),
}));

jest.mock('@odh-dashboard/internal/components/table/TableRowTitleDescription', () => {
  const { createElement } = require('react');
  return {
    __esModule: true,
    default: ({ title, description }: { title: string; description: string }) =>
      createElement('div', { 'data-testid': 'table-row-title' }, title, description),
  };
});

const mockFireMisc = jest.mocked(fireMiscTrackingEvent);

const renderView = (props?: Partial<{ sourceId: string; modelName: string; namespace: string }>) =>
  import('~/app/pages/modelCatalog/SecurityInsightsView').then(
    ({ default: SecurityInsightsView }) =>
      render(
        React.createElement(SecurityInsightsView, {
          sourceId: 'src-1',
          modelName: 'test-model',
          namespace: 'test-ns',
          ...props,
        }),
      ),
  );

describe('SecurityInsightsView - Tracking Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLoaded = true;
    mockLoadError = undefined;
    mockInsightsData = mockInsights;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Security Insights Viewed', () => {
    it('should fire viewed event when data loads successfully', async () => {
      await renderView();

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.SECURITY_INSIGHTS_VIEWED, {
        sourceId: 'src-1',
        modelName: 'test-model',
        insightCount: 3,
      });
    });

    it('should fire viewed event only once', async () => {
      await renderView();

      const viewedCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event === EVAL_HUB_EVENTS.SECURITY_INSIGHTS_VIEWED,
      );
      expect(viewedCalls).toHaveLength(1);
    });

    it('should not fire viewed event when data is not loaded', async () => {
      mockLoaded = false;
      await renderView();

      expect(mockFireMisc).not.toHaveBeenCalledWith(
        EVAL_HUB_EVENTS.SECURITY_INSIGHTS_VIEWED,
        expect.anything(),
      );
    });

    it('should include zero insightCount when there are no insights', async () => {
      mockInsightsData = [];
      await renderView();

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.SECURITY_INSIGHTS_VIEWED, {
        sourceId: 'src-1',
        modelName: 'test-model',
        insightCount: 0,
      });
    });
  });

  describe('Security Insights Filter Type Changed', () => {
    const selectFilterOption = async (label: string) => {
      await act(async () => {
        fireEvent.click(screen.getByTestId('security-filter-type-toggle'));
      });
      const option = screen.getByRole('option', { name: label });
      await act(async () => {
        fireEvent.click(option);
      });
    };

    it('should fire filter type changed event when switching filter', async () => {
      await renderView();
      mockFireMisc.mockClear();

      await selectFilterOption('Category');

      expect(mockFireMisc).toHaveBeenCalledWith(
        EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_TYPE_CHANGED,
        {
          previousFilterType: 'evaluation',
          newFilterType: 'category',
        },
      );
    });

    it('should not fire when re-selecting the already active filter', async () => {
      await renderView();
      mockFireMisc.mockClear();

      await selectFilterOption('Evaluation name');

      const filterChangeCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event === EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_TYPE_CHANGED,
      );
      expect(filterChangeCalls).toHaveLength(0);
    });

    it('should track previous and new filter types accurately', async () => {
      await renderView();
      mockFireMisc.mockClear();

      await selectFilterOption('Category');
      await selectFilterOption('Benchmark');

      const filterChangeCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event === EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_TYPE_CHANGED,
      );
      expect(filterChangeCalls).toHaveLength(2);
      expect(filterChangeCalls[0][1]).toEqual({
        previousFilterType: 'evaluation',
        newFilterType: 'category',
      });
      expect(filterChangeCalls[1][1]).toEqual({
        previousFilterType: 'category',
        newFilterType: 'benchmark',
      });
    });
  });

  describe('Security Insights Filter Applied', () => {
    it('should fire filter applied event after debounce when text is entered', async () => {
      await renderView();
      mockFireMisc.mockClear();

      const searchInput = screen.getByTestId('security-filter-text-field');
      const input = searchInput.querySelector('input')!;
      fireEvent.change(input, { target: { value: 'Pipeline' } });

      expect(mockFireMisc).not.toHaveBeenCalledWith(
        EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_APPLIED,
        expect.anything(),
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_APPLIED, {
        filterType: 'evaluation',
        hasResults: true,
        resultCount: 1,
      });
    });

    it('should not fire filter applied event when filter text is cleared', async () => {
      await renderView();
      mockFireMisc.mockClear();

      const searchInput = screen.getByTestId('security-filter-text-field');
      const input = searchInput.querySelector('input')!;
      fireEvent.change(input, { target: { value: 'Pipeline' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      mockFireMisc.mockClear();
      fireEvent.change(input, { target: { value: '' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockFireMisc).not.toHaveBeenCalledWith(
        EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_APPLIED,
        expect.anything(),
      );
    });

    it('should report hasResults false when filter matches nothing', async () => {
      await renderView();
      mockFireMisc.mockClear();

      const searchInput = screen.getByTestId('security-filter-text-field');
      const input = searchInput.querySelector('input')!;
      fireEvent.change(input, { target: { value: 'nonexistent' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_APPLIED, {
        filterType: 'evaluation',
        hasResults: false,
        resultCount: 0,
      });
    });
  });

  describe('Security Insights Sort Changed', () => {
    it('should fire sort changed event when clicking a column header', async () => {
      await renderView();
      mockFireMisc.mockClear();

      const evaluationHeader = screen.getByRole('columnheader', { name: /^evaluation name$/i });
      const sortButton = evaluationHeader.querySelector('button')!;
      fireEvent.click(sortButton);

      expect(mockFireMisc).toHaveBeenCalledWith(EVAL_HUB_EVENTS.SECURITY_INSIGHTS_SORT_CHANGED, {
        column: 'Evaluation',
        direction: expect.stringMatching(/^(asc|desc)$/),
      });
    });
  });

  describe('No tracking on initial render (beyond viewed)', () => {
    it('should only fire the viewed event on initial render', async () => {
      await renderView();

      const nonViewedCalls = mockFireMisc.mock.calls.filter(
        ([event]) => event !== EVAL_HUB_EVENTS.SECURITY_INSIGHTS_VIEWED,
      );
      expect(nonViewedCalls).toHaveLength(0);
    });
  });
});
