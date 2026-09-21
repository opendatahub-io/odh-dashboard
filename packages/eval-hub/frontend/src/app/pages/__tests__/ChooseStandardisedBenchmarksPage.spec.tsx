import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChooseStandardisedBenchmarksPage from '~/app/pages/ChooseStandardisedBenchmarksPage';
import { Provider } from '~/app/types';

const mockUseProviders = jest.fn();
const mockNavigate = jest.fn();

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: () => mockUseProviders(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const makeProvider = (overrides: Partial<Provider> = {}): Provider => ({
  resource: { id: 'lm_evaluation_harness' },
  name: 'lm_evaluation_harness',
  title: 'LM Evaluation Harness',
  benchmarks: [],
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/test-project/evaluation/benchmarks']}>
      <Routes>
        <Route
          path="/:namespace/evaluation/benchmarks"
          element={<ChooseStandardisedBenchmarksPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ChooseStandardisedBenchmarksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProviders.mockReturnValue({
      providers: [
        makeProvider({
          benchmarks: [
            {
              id: 'arc_easy',
              name: 'Basic science Q&A',
              category: 'Reasoning',
              metrics: ['accuracy'],
            },
            {
              id: 'inspect/arc',
              name: 'ARC',
              category: 'Reasoning',
              metrics: ['accuracy'],
            },
            {
              id: 'truthfulqa_mc1',
              name: 'TruthfulQA',
              category: 'Knowledge',
              metrics: ['accuracy'],
            },
          ],
        }),
      ],
      loaded: true,
      loadError: undefined,
    });
  });

  it('should render the filter input with correct placeholder', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Filter by name or ID')).toBeInTheDocument();
  });

  it('should show all benchmarks when no filter is applied', () => {
    renderPage();
    expect(screen.getByTestId('benchmark-card-lm_evaluation_harness-arc_easy')).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-card-lm_evaluation_harness-inspect/arc'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-card-lm_evaluation_harness-truthfulqa_mc1'),
    ).toBeInTheDocument();
  });

  it('should filter benchmarks by name', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'TruthfulQA' },
    });
    expect(
      screen.getByTestId('benchmark-card-lm_evaluation_harness-truthfulqa_mc1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-arc_easy'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-inspect/arc'),
    ).not.toBeInTheDocument();
  });

  it('should filter benchmarks by ID', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'arc_easy' },
    });
    expect(screen.getByTestId('benchmark-card-lm_evaluation_harness-arc_easy')).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-inspect/arc'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-truthfulqa_mc1'),
    ).not.toBeInTheDocument();
  });

  it('should match benchmarks by partial ID', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'inspect/' },
    });
    expect(
      screen.getByTestId('benchmark-card-lm_evaluation_harness-inspect/arc'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-arc_easy'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-truthfulqa_mc1'),
    ).not.toBeInTheDocument();
  });

  it('should match benchmarks by name or ID when input matches both', () => {
    renderPage();
    // 'arc' matches the name "ARC" and the IDs "arc_easy" and "inspect/arc"
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'arc' },
    });
    expect(screen.getByTestId('benchmark-card-lm_evaluation_harness-arc_easy')).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-card-lm_evaluation_harness-inspect/arc'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-truthfulqa_mc1'),
    ).not.toBeInTheDocument();
  });

  it('should show chip label as "Name or ID" when filter is active', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'arc' },
    });
    expect(screen.getByText('Name or ID')).toBeInTheDocument();
  });

  it('should show no results message when filter matches nothing', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'zzznomatch' },
    });
    expect(screen.queryByText('Basic science Q&A')).not.toBeInTheDocument();
    expect(screen.queryByText('ARC')).not.toBeInTheDocument();
    expect(screen.queryByText('TruthfulQA')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'No benchmarks match the filter criteria. Try adjusting or clearing your filters.',
      ),
    ).toBeInTheDocument();
  });

  it('should filter benchmarks by ID case-insensitively', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'ARC_EASY' },
    });
    expect(screen.getByTestId('benchmark-card-lm_evaluation_harness-arc_easy')).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-inspect/arc'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-truthfulqa_mc1'),
    ).not.toBeInTheDocument();
  });

  it('should restore all benchmarks after removing the name/ID filter chip', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'arc_easy' },
    });
    expect(
      screen.queryByTestId('benchmark-card-lm_evaluation_harness-truthfulqa_mc1'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /arc_easy/i }));

    expect(screen.getByTestId('benchmark-card-lm_evaluation_harness-arc_easy')).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-card-lm_evaluation_harness-inspect/arc'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('benchmark-card-lm_evaluation_harness-truthfulqa_mc1'),
    ).toBeInTheDocument();
  });

  it('should show a loading spinner while providers are loading', () => {
    mockUseProviders.mockReturnValue({
      providers: [],
      loaded: false,
      loadError: undefined,
    });
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Filter by name or ID')).not.toBeInTheDocument();
  });
});
