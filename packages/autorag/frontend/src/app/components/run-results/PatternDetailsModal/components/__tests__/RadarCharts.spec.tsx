import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { AutoRAGEvaluationMetricResult, MetricReference } from '~/app/types/autoragPattern';
import ScoreRadarChart from '~/app/components/run-results/PatternDetailsModal/components/ScoreRadarChart';
import ComparisonRadarChart from '~/app/components/run-results/PatternDetailsModal/components/ComparisonRadarChart';

const MINIFIED_CHART_TOKEN = '--pf-v6-chart-echarts-geo--item-style--BorderWidth';

jest.mock('@patternfly/react-charts/echarts', () => {
  const MockReact = jest.requireActual<typeof import('react')>('react');

  const mockParseMinifiedPatternFlyNumericToken = (): void => {
    const raw = globalThis
      .getComputedStyle(globalThis.document.body)
      .getPropertyValue('--pf-v6-chart-echarts-geo--item-style--BorderWidth')
      .trim();
    if (raw === '') {
      return;
    }
    if (!Number.isNaN(Number(raw)) || raw === 'true' || raw === 'false') {
      JSON.parse(raw);
    }
  };

  return {
    Charts: ({
      theme,
      themeColor,
      'data-testid': testId,
    }: {
      theme?: unknown;
      themeColor?: string;
      'data-testid'?: string;
    }) => {
      if (themeColor || !theme) {
        mockParseMinifiedPatternFlyNumericToken();
      }
      return MockReact.createElement('div', {
        'data-testid': testId,
        'data-has-theme': theme ? 'true' : 'false',
        'data-theme-color': themeColor ?? '',
      });
    },
  };
});

jest.mock('echarts/core', () => ({
  use: jest.fn(),
}));

const metrics: AutoRAGEvaluationMetricResult[] = [
  { name: 'faithfulness', evaluator: 'unitxt', score: 0.8 },
];
const allMetricNames: MetricReference[] = [{ name: 'faithfulness', evaluator: 'unitxt' }];

describe('AutoRAG radar charts', () => {
  beforeEach(() => {
    document.body.style.setProperty(MINIFIED_CHART_TOKEN, '.5');
  });

  afterEach(() => {
    document.body.style.removeProperty(MINIFIED_CHART_TOKEN);
  });

  it('should render ScoreRadarChart with a direct theme when CSS numeric tokens are minified', () => {
    render(<ScoreRadarChart metrics={metrics} allMetricNames={allMetricNames} />);

    const chart = screen.getByTestId('score-radar-chart');
    expect(chart).toHaveAttribute('data-has-theme', 'true');
    expect(chart).toHaveAttribute('data-theme-color', '');
  });

  it('should render ComparisonRadarChart with a direct theme when CSS numeric tokens are minified', () => {
    render(
      <ComparisonRadarChart
        primaryMetrics={metrics}
        primaryLabel="Pattern A"
        comparisonMetrics={metrics}
        comparisonLabel="Pattern B"
        allMetricNames={allMetricNames}
      />,
    );

    const chart = screen.getByTestId('comparison-radar-chart');
    expect(chart).toHaveAttribute('data-has-theme', 'true');
    expect(chart).toHaveAttribute('data-theme-color', '');
  });
});
