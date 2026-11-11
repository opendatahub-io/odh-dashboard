/* eslint-disable camelcase */
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { SecurityInsight } from '../securityInsightsTypes';

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

jest.mock('../hooks/useSecurityArtifacts', () => ({
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

jest.mock('../SecurityInsightsEmptyState', () => {
  const { createElement } = require('react');
  return {
    __esModule: true,
    default: () => createElement('div', { 'data-testid': 'security-insights-empty-state' }),
  };
});

import SecurityInsightsView from '../SecurityInsightsView';

const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };

const renderView = (props?: Partial<{ sourceId: string; modelName: string; namespace: string }>) =>
  render(
    React.createElement(
      AnalyticsTrackingProvider,
      { value: tracking },
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
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  describe('Security Insights Viewed', () => {
    it('should fire viewed event when data loads successfully', async () => {
      await renderView();

      expect(tracking.trackEvent).toHaveBeenCalledWith('Security Insights Viewed', {
        sourceId: 'src-1',
        modelName: 'test-model',
        insightCount: 3,
      });
      expect(tracking.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('should fire viewed event only once', async () => {
      await renderView();

      const viewedCalls = tracking.trackEvent.mock.calls.filter(
        ([event]) => event === 'Security Insights Viewed',
      );
      expect(viewedCalls).toHaveLength(1);
    });

    it('should not fire viewed event when data is not loaded', async () => {
      mockLoaded = false;
      await renderView();

      expect(tracking.trackEvent).not.toHaveBeenCalledWith(
        'Security Insights Viewed',
        expect.anything(),
      );
    });

    it('should include zero insightCount when there are no insights', async () => {
      mockInsightsData = [];
      await renderView();

      expect(tracking.trackEvent).toHaveBeenCalledWith('Security Insights Viewed', {
        sourceId: 'src-1',
        modelName: 'test-model',
        insightCount: 0,
      });
      expect(tracking.trackEvent).toHaveBeenCalledTimes(1);
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
      tracking.trackEvent.mockClear();

      await selectFilterOption('Category');

      expect(tracking.trackEvent).toHaveBeenCalledWith('Security Insights Filter Type Changed', {
        previousFilterType: 'evaluation',
        newFilterType: 'category',
      });
      expect(tracking.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('should not fire when re-selecting the already active filter', async () => {
      await renderView();
      tracking.trackEvent.mockClear();

      await selectFilterOption('Evaluation Name');

      const filterChangeCalls = tracking.trackEvent.mock.calls.filter(
        ([event]) => event === 'Security Insights Filter Type Changed',
      );
      expect(filterChangeCalls).toHaveLength(0);
    });

    it('should track previous and new filter types accurately', async () => {
      await renderView();
      tracking.trackEvent.mockClear();

      await selectFilterOption('Category');
      await selectFilterOption('Benchmark');

      const filterChangeCalls = tracking.trackEvent.mock.calls.filter(
        ([event]) => event === 'Security Insights Filter Type Changed',
      );
      expect(filterChangeCalls).toHaveLength(2);
      expect(filterChangeCalls[0][1]).toEqual({
        previousFilterType: 'evaluation',
        newFilterType: 'category',
      });
      expect(tracking.trackEvent).toHaveBeenCalledTimes(2);
      expect(filterChangeCalls[1][1]).toEqual({
        previousFilterType: 'category',
        newFilterType: 'benchmark',
      });
    });
  });

  describe('Security Insights Filter Applied', () => {
    it('should fire filter applied event after debounce when text is entered', async () => {
      await renderView();
      tracking.trackEvent.mockClear();

      const searchInput = screen.getByTestId('security-filter-text-field');
      const input = searchInput.querySelector('input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Pipeline' } });

      expect(tracking.trackEvent).not.toHaveBeenCalledWith(
        'Security Insights Filter Applied',
        expect.anything(),
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(tracking.trackEvent).toHaveBeenCalledWith('Security Insights Filter Applied', {
        filterType: 'evaluation',
        hasResults: true,
        resultCount: 1,
      });
      expect(tracking.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('should not fire filter applied event when filter text is cleared', async () => {
      await renderView();
      tracking.trackEvent.mockClear();

      const searchInput = screen.getByTestId('security-filter-text-field');
      const input = searchInput.querySelector('input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Pipeline' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      tracking.trackEvent.mockClear();
      fireEvent.change(input, { target: { value: '' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(tracking.trackEvent).not.toHaveBeenCalledWith(
        'Security Insights Filter Applied',
        expect.anything(),
      );
    });

    it('should report hasResults false when filter matches nothing', async () => {
      await renderView();
      tracking.trackEvent.mockClear();

      const searchInput = screen.getByTestId('security-filter-text-field');
      const input = searchInput.querySelector('input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'nonexistent' } });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(tracking.trackEvent).toHaveBeenCalledWith('Security Insights Filter Applied', {
        filterType: 'evaluation',
        hasResults: false,
        resultCount: 0,
      });
      expect(tracking.trackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security Insights Sort Changed', () => {
    it('should fire sort changed event when clicking a column header', async () => {
      await renderView();
      tracking.trackEvent.mockClear();

      const evaluationHeader = screen.getByRole('columnheader', { name: /^evaluation name$/i });
      const sortButton = evaluationHeader.querySelector('button') as HTMLButtonElement;
      fireEvent.click(sortButton);

      expect(tracking.trackEvent).toHaveBeenCalledWith('Security Insights Sort Changed', {
        column: 'Evaluation',
        direction: 'asc',
      });
      expect(tracking.trackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('No tracking on initial render (beyond viewed)', () => {
    it('should only fire the viewed event on initial render', async () => {
      await renderView();

      const nonViewedCalls = tracking.trackEvent.mock.calls.filter(
        ([event]) => event !== 'Security Insights Viewed',
      );
      expect(nonViewedCalls).toHaveLength(0);
    });
  });

  it('should forward each pagination action once with literal properties', async () => {
    mockInsightsData = Array.from({ length: 21 }, (_, index) => ({
      ...mockInsights[0],
      benchmarkName: `Benchmark ${index}`,
    }));
    await renderView();
    tracking.trackEvent.mockClear();
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to previous page' })[1]);
    expect(tracking.trackEvent.mock.calls).toStrictEqual([
      ['Security Insights Pagination Changed', { page: 2, perPage: 20, totalItems: 21 }],
      ['Security Insights Pagination Changed', { page: 1, perPage: 20, totalItems: 21 }],
    ]);
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();
  });
});
