import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { getBenchmarkDatasetUrl } from '~/app/utilities/benchmarkDatasetUrls';
import BenchmarkDrawerTileContent from '~/app/components/BenchmarkDrawerTileContent';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/utilities/benchmarkDatasetUrls', () => ({
  getBenchmarkDatasetUrl: jest.fn(),
}));

const mockFireEvent = jest.mocked(fireMiscTrackingEvent);
const mockGetDatasetUrl = jest.mocked(getBenchmarkDatasetUrl);

describe('BenchmarkDrawerTileContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render name and subtitle when showHeader defaults to true', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test Benchmark"
        id="test-bench-1"
        providerName="LM Eval"
        trackingSurface="test_surface"
      />,
    );
    expect(screen.getByText('Test Benchmark')).toBeInTheDocument();
    expect(screen.getByText('test-bench-1 · LM Eval')).toBeInTheDocument();
  });

  it('should render subtitle with id only when no providerName', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test Benchmark"
        id="test-bench-1"
        trackingSurface="test_surface"
      />,
    );
    expect(screen.getByText('test-bench-1')).toBeInTheDocument();
  });

  it('should hide name and subtitle when showHeader is false', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test Benchmark"
        id="test-bench-1"
        providerName="LM Eval"
        trackingSurface="test_surface"
        showHeader={false}
      />,
    );
    expect(screen.queryByText('Test Benchmark')).not.toBeInTheDocument();
    expect(screen.queryByText('test-bench-1 · LM Eval')).not.toBeInTheDocument();
  });

  it('should render "View benchmark dataset" link when url resolves', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test"
        id="bench-1"
        url="https://example.com/bench"
        trackingSurface="test_surface"
      />,
    );
    const link = screen.getByRole('link', { name: /View benchmark dataset/i });
    expect(link).toHaveAttribute('href', 'https://example.com/bench');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should fall back to getBenchmarkDatasetUrl when url is undefined', () => {
    mockGetDatasetUrl.mockReturnValue('https://huggingface.co/datasets/test');
    render(<BenchmarkDrawerTileContent name="Test" id="bench-1" trackingSurface="test_surface" />);
    const link = screen.getByRole('link', { name: /View benchmark dataset/i });
    expect(link).toHaveAttribute('href', 'https://huggingface.co/datasets/test');
    expect(mockGetDatasetUrl).toHaveBeenCalledWith('bench-1');
  });

  it('should prefer url over getBenchmarkDatasetUrl fallback', () => {
    mockGetDatasetUrl.mockReturnValue('https://huggingface.co/datasets/fallback');
    render(
      <BenchmarkDrawerTileContent
        name="Test"
        id="bench-1"
        url="https://example.com/primary"
        trackingSurface="test_surface"
      />,
    );
    const link = screen.getByRole('link', { name: /View benchmark dataset/i });
    expect(link).toHaveAttribute('href', 'https://example.com/primary');
  });

  it('should show "Dataset link unavailable" when no URL resolves', () => {
    mockGetDatasetUrl.mockReturnValue(undefined);
    render(<BenchmarkDrawerTileContent name="Test" id="bench-1" trackingSurface="test_surface" />);
    expect(screen.getByText('Dataset link unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View benchmark dataset/i })).not.toBeInTheDocument();
  });

  it('should fire analytics event on link click', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test"
        id="bench-1"
        url="https://example.com"
        trackingSurface="benchmark_drawer"
      />,
    );
    fireEvent.click(screen.getByRole('link', { name: /View benchmark dataset/i }));
    expect(mockFireEvent).toHaveBeenCalledWith('Evaluations External Link Clicked', {
      url: 'https://example.com',
      benchmarkId: 'bench-1',
      surface: 'benchmark_drawer',
    });
  });

  it('should render description with heading', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test"
        id="bench-1"
        description="A benchmark for testing"
        trackingSurface="test_surface"
      />,
    );
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('A benchmark for testing')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    render(<BenchmarkDrawerTileContent name="Test" id="bench-1" trackingSurface="test_surface" />);
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('should render metrics labels when metrics are provided', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test"
        id="bench-1"
        metrics={['accuracy', 'f1_score', 'precision']}
        trackingSurface="test_surface"
      />,
    );
    expect(screen.getByText('Metrics evaluated')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('F1 score')).toBeInTheDocument();
    expect(screen.getByText('Precision')).toBeInTheDocument();
  });

  it('should not render metrics section when metrics is empty', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test"
        id="bench-1"
        metrics={[]}
        trackingSurface="test_surface"
      />,
    );
    expect(screen.queryByText('Metrics evaluated')).not.toBeInTheDocument();
  });

  it('should render provider when providerName is provided', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test"
        id="bench-1"
        providerName="lm-eval"
        trackingSurface="test_surface"
      />,
    );
    expect(screen.getByText('Evaluation framework')).toBeInTheDocument();
    expect(screen.getByText('lm-eval')).toBeInTheDocument();
  });

  it('should not render provider section when providerName is undefined', () => {
    render(<BenchmarkDrawerTileContent name="Test" id="bench-1" trackingSurface="test_surface" />);
    expect(screen.queryByText('Evaluation framework')).not.toBeInTheDocument();
  });

  it('should render all content together', () => {
    mockGetDatasetUrl.mockReturnValue(undefined);
    render(
      <BenchmarkDrawerTileContent
        name="Full Benchmark"
        id="full-bench"
        description="Complete test"
        metrics={['accuracy']}
        providerName="LM Eval"
        url="https://example.com"
        trackingSurface="test_surface"
      />,
    );
    expect(screen.getByText('Full Benchmark')).toBeInTheDocument();
    expect(screen.getByText('full-bench · LM Eval')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View benchmark dataset/i })).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Complete test')).toBeInTheDocument();
    expect(screen.getByText('Metrics evaluated')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Evaluation framework')).toBeInTheDocument();
    expect(screen.getByText('LM Eval')).toBeInTheDocument();
  });

  it('should show dataset link even when showHeader is false', () => {
    render(
      <BenchmarkDrawerTileContent
        name="Test"
        id="bench-1"
        url="https://example.com"
        trackingSurface="test_surface"
        showHeader={false}
      />,
    );
    expect(screen.getByRole('link', { name: /View benchmark dataset/i })).toBeInTheDocument();
  });

  describe('collapsible behavior', () => {
    it('should not show expand/collapse button when isCollapsible is false', () => {
      render(
        <BenchmarkDrawerTileContent
          name="Test"
          id="bench-1"
          description="Some description"
          trackingSurface="test_surface"
        />,
      );
      expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /collapse/i })).not.toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Some description')).toBeInTheDocument();
    });

    it('should hide description and details when isCollapsible is true and collapsed', () => {
      render(
        <BenchmarkDrawerTileContent
          name="Test"
          id="bench-1"
          description="Hidden description"
          metrics={['accuracy']}
          providerName="LM Eval"
          trackingSurface="test_surface"
          isCollapsible
        />,
      );
      expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
      expect(screen.queryByText('Hidden description')).not.toBeInTheDocument();
      expect(screen.queryByText('Metrics evaluated')).not.toBeInTheDocument();
      expect(screen.queryByText('Evaluation framework')).not.toBeInTheDocument();
    });

    it('should show description and details after clicking expand', () => {
      render(
        <BenchmarkDrawerTileContent
          name="Test"
          id="bench-1"
          description="Revealed description"
          metrics={['accuracy']}
          providerName="LM Eval"
          trackingSurface="test_surface"
          isCollapsible
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
      expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Revealed description')).toBeInTheDocument();
      expect(screen.getByText('Metrics evaluated')).toBeInTheDocument();
      expect(screen.getByText('Evaluation framework')).toBeInTheDocument();
    });

    it('should collapse again after clicking collapse', () => {
      render(
        <BenchmarkDrawerTileContent
          name="Test"
          id="bench-1"
          description="Toggle description"
          trackingSurface="test_surface"
          isCollapsible
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
      expect(screen.getByText('Toggle description')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
      expect(screen.queryByText('Toggle description')).not.toBeInTheDocument();
    });

    it('should not be collapsible when isCollapsible is true but showHeader is false', () => {
      render(
        <BenchmarkDrawerTileContent
          name="Test"
          id="bench-1"
          description="Always visible"
          metrics={['accuracy']}
          trackingSurface="test_surface"
          isCollapsible
          showHeader={false}
        />,
      );
      expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Always visible')).toBeInTheDocument();
      expect(screen.getByText('Metrics evaluated')).toBeInTheDocument();
    });

    it('should not be collapsible when tile has no description or metadata', () => {
      render(
        <BenchmarkDrawerTileContent
          name="Empty Benchmark"
          id="bench-empty"
          trackingSurface="test_surface"
          isCollapsible
        />,
      );
      expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /collapse/i })).not.toBeInTheDocument();
      expect(screen.getByText('Empty Benchmark')).toBeInTheDocument();
      expect(screen.getByText('bench-empty')).toBeInTheDocument();
    });

    it('should still show header name and subtitle when collapsed', () => {
      render(
        <BenchmarkDrawerTileContent
          name="Collapsible Benchmark"
          id="bench-1"
          providerName="LM Eval"
          description="Hidden content"
          trackingSurface="test_surface"
          isCollapsible
        />,
      );
      expect(screen.getByText('Collapsible Benchmark')).toBeInTheDocument();
      expect(screen.getByText('bench-1 · LM Eval')).toBeInTheDocument();
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });
  });
});
