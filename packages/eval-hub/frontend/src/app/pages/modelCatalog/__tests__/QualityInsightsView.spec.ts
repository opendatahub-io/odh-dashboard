import { fireEvent, render, screen, within } from '@testing-library/react';
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
        result: '62.8%',
      },
      {
        evaluation: 'Hard multi-step reasoning',
        category: 'reasoning',
        benchmarkName: 'BBH',
        benchmarkDescription: 'Challenging reasoning tasks.',
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

    fireEvent.click(
      within(screen.getByTestId('quality-insights-pagination-top')).getByRole('button', {
        name: 'Go to next page',
      }),
    );
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Evaluation');
  });
});
