import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { MemoryRouter } from 'react-router-dom';
import type { QualityInsight } from '../qualityInsightsTypes';

let mockLoaded = true;
let mockLoadError: Error | undefined;
let mockInsightsData: QualityInsight[] = [];

jest.mock('../hooks/useQualityArtifacts', () => ({
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
      createElement('div', { 'data-testid': 'quality-table-row-title' }, title, description),
  };
});

import QualityInsightsView from '../QualityInsightsView';

const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };

const renderView = () =>
  render(
    React.createElement(
      AnalyticsTrackingProvider,
      { value: tracking },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(QualityInsightsView, {
          sourceId: 'src-1',
          modelName: 'test-model',
          namespace: 'test-ns',
        }),
      ),
    ),
  );

describe('QualityInsightsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoaded = true;
    mockLoadError = undefined;
    mockInsightsData = [];
  });

  it('shows a spinner while loading', async () => {
    mockLoaded = false;
    await renderView();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(tracking.trackEvent).not.toHaveBeenCalled();
  });

  it('shows an error before the loading state', async () => {
    mockLoaded = false;
    mockLoadError = new Error('Connection failed');
    await renderView();
    expect(screen.getByText('Error loading quality insights')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('shows the empty state when no quality insights are returned', async () => {
    await renderView();
    expect(screen.getByTestId('quality-insights-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No quality insights')).toBeInTheDocument();
    expect(tracking.trackEvent.mock.calls).toStrictEqual([
      ['Quality Insights Viewed', { sourceId: 'src-1', modelName: 'test-model', insightCount: 0 }],
    ]);
  });

  it('renders table rows and filters by evaluation', async () => {
    mockInsightsData = [
      {
        evaluation: 'Python function generation',
        category: 'code',
        benchmarkName: 'HumanEval',
        benchmarkDescription: 'Writes correct Python functions.',
        score: 0.628,
        result: '62.8%',
      },
      {
        evaluation: 'Hard multi-step reasoning',
        category: 'reasoning',
        benchmarkName: 'BBH',
        benchmarkDescription: 'Challenging reasoning tasks.',
        score: 0.491,
        result: '49.1%',
      },
    ];

    await renderView();
    expect(screen.getByTestId('quality-insights-table')).toBeInTheDocument();
    expect(screen.getAllByTestId('quality-table-row-title')[0]).toHaveTextContent('HumanEval');
    expect(screen.getAllByTestId('quality-table-row-title')[1]).toHaveTextContent('BBH');

    fireEvent.change(
      screen.getByTestId('quality-filter-text-field').querySelector('input') as HTMLInputElement,
      {
        target: { value: 'Python' },
      },
    );
    expect(screen.getAllByTestId('quality-table-row-title')).toHaveLength(1);
    expect(screen.getByTestId('quality-table-row-title')).toHaveTextContent('HumanEval');
  });

  it('sorts rows and paginates the result set', async () => {
    mockInsightsData = Array.from({ length: 21 }, (_, index) => ({
      evaluation: `Evaluation ${20 - index}`,
      category: 'reasoning',
      benchmarkName: `Benchmark ${20 - index}`,
      benchmarkDescription: 'Benchmark description',
      score: 0.5,
      result: '50.0%',
    }));

    await renderView();
    const rows = () => screen.getAllByTestId('quality-insight-row');
    expect(rows()).toHaveLength(20);
    const firstRowBeforeSort = rows()[0].textContent;

    fireEvent.click(
      screen
        .getByRole('columnheader', { name: 'Evaluation' })
        .querySelector('button') as HTMLButtonElement,
    );

    expect(rows()[0].textContent).not.toBe(firstRowBeforeSort);

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Evaluation');
    expect(tracking.trackEvent.mock.calls).toStrictEqual([
      ['Quality Insights Viewed', { sourceId: 'src-1', modelName: 'test-model', insightCount: 21 }],
      ['Quality Insights Sort Changed', { column: 'Evaluation', direction: 'asc' }],
      ['Quality Insights Pagination Changed', { page: 2, perPage: 20, totalItems: 21 }],
    ]);
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();
  });

  it('sorts evaluation scores numerically', async () => {
    mockInsightsData = [
      {
        evaluation: 'Higher score',
        category: 'reasoning',
        benchmarkName: 'Benchmark A',
        benchmarkDescription: 'Benchmark description',
        score: 0.9,
        result: '90.0%',
      },
      {
        evaluation: 'Lower score',
        category: 'reasoning',
        benchmarkName: 'Benchmark B',
        benchmarkDescription: 'Benchmark description',
        score: 0.85,
        result: '85.0%',
      },
    ];

    await renderView();
    fireEvent.click(
      screen
        .getByRole('columnheader', { name: 'Evaluation score' })
        .querySelector('button') as HTMLButtonElement,
    );

    expect(screen.getAllByTestId('quality-insight-row')[0]).toHaveTextContent('Lower score');
  });

  it('sorts fractional and percentage scores on the same scale', async () => {
    mockInsightsData = [
      {
        evaluation: 'Fractional higher score',
        category: 'reasoning',
        benchmarkName: 'Benchmark A',
        benchmarkDescription: 'Benchmark description',
        score: 0.9,
        result: '90.0%',
      },
      {
        evaluation: 'Percentage lower score',
        category: 'reasoning',
        benchmarkName: 'Benchmark B',
        benchmarkDescription: 'Benchmark description',
        score: 62.8,
        result: '62.8%',
      },
    ];

    await renderView();
    fireEvent.click(
      screen
        .getByRole('columnheader', { name: 'Evaluation score' })
        .querySelector('button') as HTMLButtonElement,
    );

    expect(screen.getAllByTestId('quality-insight-row')[0]).toHaveTextContent(
      'Percentage lower score',
    );
  });

  it('sorts non-percentage scores without percentage normalization', async () => {
    mockInsightsData = [
      {
        evaluation: 'Percentage score',
        category: 'reasoning',
        benchmarkName: 'Benchmark A',
        benchmarkDescription: 'Benchmark description',
        score: 0.5,
        resultMetric: 'accuracy',
        result: '50.0%',
      },
      {
        evaluation: 'Raw score',
        category: 'performance',
        benchmarkName: 'Benchmark B',
        benchmarkDescription: 'Benchmark description',
        score: 0.8,
        resultMetric: 'output_tokens_per_second',
        result: '0.8 output tokens/s',
      },
    ];

    await renderView();
    fireEvent.click(
      screen
        .getByRole('columnheader', { name: 'Evaluation score' })
        .querySelector('button') as HTMLButtonElement,
    );

    expect(screen.getAllByTestId('quality-insight-row')[0]).toHaveTextContent('Raw score');
  });

  it('keeps missing scores after scored rows in both sort directions', async () => {
    mockInsightsData = [
      {
        evaluation: 'Missing score',
        category: 'reasoning',
        benchmarkName: 'Benchmark A',
        benchmarkDescription: 'Benchmark description',
        score: undefined,
        result: '',
      },
      {
        evaluation: 'Scored result',
        category: 'reasoning',
        benchmarkName: 'Benchmark B',
        benchmarkDescription: 'Benchmark description',
        score: 0.8,
        result: '80.0%',
      },
    ];

    await renderView();
    const scoreSortButton = screen
      .getByRole('columnheader', { name: 'Evaluation score' })
      .querySelector('button') as HTMLButtonElement;

    fireEvent.click(scoreSortButton);
    expect(screen.getAllByTestId('quality-insight-row')[0]).toHaveTextContent('Scored result');

    fireEvent.click(scoreSortButton);
    expect(screen.getAllByTestId('quality-insight-row')[0]).toHaveTextContent('Scored result');
  });

  describe('tracking', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockInsightsData = [
        {
          evaluation: 'Python function generation',
          category: 'code',
          benchmarkName: 'HumanEval',
          benchmarkDescription: 'Writes correct Python functions.',
          score: 0.628,
          result: '62.8%',
        },
      ];
    });

    afterEach(() => jest.useRealTimers());

    it('should preserve debounce, result counts, filter changes, and once-only viewing', async () => {
      await renderView();
      const input = screen.getByRole('textbox', { name: 'Filter by evaluation name' });
      fireEvent.change(input, { target: { value: 'Python' } });
      act(() => jest.advanceTimersByTime(499));
      expect(tracking.trackEvent.mock.calls).toStrictEqual([
        [
          'Quality Insights Viewed',
          { sourceId: 'src-1', modelName: 'test-model', insightCount: 1 },
        ],
      ]);
      act(() => jest.advanceTimersByTime(1));
      fireEvent.change(input, { target: { value: 'missing' } });
      act(() => jest.advanceTimersByTime(500));
      fireEvent.change(input, { target: { value: '' } });
      act(() => jest.advanceTimersByTime(500));
      fireEvent.click(screen.getByTestId('quality-filter-type-toggle'));
      fireEvent.click(screen.getByRole('option', { name: 'Category' }));
      act(() => jest.advanceTimersByTime(500));

      expect(tracking.trackEvent.mock.calls).toStrictEqual([
        [
          'Quality Insights Viewed',
          { sourceId: 'src-1', modelName: 'test-model', insightCount: 1 },
        ],
        [
          'Quality Insights Filter Applied',
          { filterType: 'evaluation', hasResults: true, resultCount: 1 },
        ],
        [
          'Quality Insights Filter Applied',
          { filterType: 'evaluation', hasResults: false, resultCount: 0 },
        ],
        [
          'Quality Insights Filter Type Changed',
          { previousFilterType: 'evaluation', newFilterType: 'category' },
        ],
      ]);
      expect(tracking.trackPageEvent).not.toHaveBeenCalled();
    });

    it('should cancel a pending filter event on unmount', async () => {
      const { unmount } = renderView();
      fireEvent.change(screen.getByRole('textbox', { name: 'Filter by evaluation name' }), {
        target: { value: 'Python' },
      });
      tracking.trackEvent.mockClear();
      unmount();
      act(() => jest.advanceTimersByTime(500));
      expect(tracking.trackEvent).not.toHaveBeenCalled();
    });
  });
});
