import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { QualityInsight } from '~/app/pages/modelCatalog/qualityInsightsTypes';

let mockLoaded = true;
let mockLoadError: Error | undefined;
let mockInsightsData: QualityInsight[] = [];

jest.mock('~/app/hooks/useQualityArtifacts', () => ({
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

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const renderView = () =>
  import('~/app/pages/modelCatalog/QualityInsightsView').then(({ default: QualityInsightsView }) =>
    render(
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
    mockLoaded = true;
    mockLoadError = undefined;
    mockInsightsData = [];
  });

  it('shows a spinner while loading', async () => {
    mockLoaded = false;
    await renderView();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
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

    fireEvent.change(screen.getByTestId('quality-filter-text-field').querySelector('input')!, {
      target: { value: 'Python' },
    });
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
      screen.getByRole('columnheader', { name: 'Evaluation' }).querySelector('button')!,
    );

    expect(rows()[0].textContent).not.toBe(firstRowBeforeSort);

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Evaluation');
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
      screen.getByRole('columnheader', { name: 'Evaluation score' }).querySelector('button')!,
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
      screen.getByRole('columnheader', { name: 'Evaluation score' }).querySelector('button')!,
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
      screen.getByRole('columnheader', { name: 'Evaluation score' }).querySelector('button')!,
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
      .querySelector('button')!;

    fireEvent.click(scoreSortButton);
    expect(screen.getAllByTestId('quality-insight-row')[0]).toHaveTextContent('Scored result');

    fireEvent.click(scoreSortButton);
    expect(screen.getAllByTestId('quality-insight-row')[0]).toHaveTextContent('Scored result');
  });
});
