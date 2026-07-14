import { render, screen } from '@testing-library/react';
import * as React from 'react';

let mockLoaded = true;
let mockLoadError: Error | undefined;
let mockInsightsData: unknown[] = [];

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
    default: ({ title }: { title: string }) =>
      createElement('div', { 'data-testid': 'table-row-title' }, title),
  };
});

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const renderView = () =>
  import('~/app/pages/modelCatalog/SecurityInsightsView').then(
    ({ default: SecurityInsightsView }) =>
      render(
        React.createElement(SecurityInsightsView, {
          sourceId: 'src-1',
          modelName: 'test-model',
          namespace: 'test-ns',
        }),
      ),
  );

describe('SecurityInsightsView - Empty and Loading States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoaded = true;
    mockLoadError = undefined;
    mockInsightsData = [];
  });

  it('should show empty state when loaded with no insights', async () => {
    await renderView();
    expect(screen.getByTestId('security-insights-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No safety and security insights')).toBeInTheDocument();
    expect(
      screen.getByText('No safety and security evaluation data is available for this model yet.'),
    ).toBeInTheDocument();
  });

  it('should not show the table when there are no insights', async () => {
    await renderView();
    expect(screen.queryByTestId('security-insights-table')).not.toBeInTheDocument();
  });

  it('should show spinner when loading', async () => {
    mockLoaded = false;
    await renderView();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('security-insights-empty-state')).not.toBeInTheDocument();
  });

  it('should show error alert on load failure', async () => {
    mockLoadError = new Error('Connection failed');
    await renderView();
    expect(screen.getByText('Error loading security insights')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('should show table when insights are available', async () => {
    mockInsightsData = [
      {
        evaluation: 'Pipeline',
        category: 'Security',
        benchmarkName: 'Prompt Injection',
        benchmarkDescription: 'Tests resistance to prompt injection',
        result: '85.0%',
      },
    ];
    await renderView();
    expect(screen.queryByTestId('security-insights-empty-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('security-insights-table')).toBeInTheDocument();
  });
});
