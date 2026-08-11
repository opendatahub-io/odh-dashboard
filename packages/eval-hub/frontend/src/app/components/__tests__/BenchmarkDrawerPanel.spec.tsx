import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer, DrawerContent } from '@patternfly/react-core';
import { mockFlatBenchmark } from '~/__mocks__/mockBenchmark';
import BenchmarkDrawerPanel from '~/app/components/BenchmarkDrawerPanel';
import { FlatBenchmark } from '~/app/types';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockOnClose = jest.fn();
const mockOnRunBenchmark = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

/* eslint-disable camelcase */
const renderPanel = (benchmarkOverrides: Partial<FlatBenchmark> = {}) => {
  const benchmark: FlatBenchmark = {
    ...mockFlatBenchmark(),
    ...benchmarkOverrides,
  };

  const panel = (
    <BenchmarkDrawerPanel
      benchmark={benchmark}
      onClose={mockOnClose}
      onRunBenchmark={mockOnRunBenchmark}
    />
  );

  return render(
    <Drawer isExpanded>
      <DrawerContent panelContent={panel}>
        <div />
      </DrawerContent>
    </Drawer>,
  );
};

describe('BenchmarkDrawerPanel', () => {
  it('should render the drawer panel with benchmark name', () => {
    renderPanel();
    expect(screen.getByTestId('benchmark-drawer-panel')).toBeInTheDocument();
    expect(screen.getByText('TruthfulQA MC1')).toBeInTheDocument();
  });

  it('should render nothing when benchmark is undefined', () => {
    const panel = (
      <BenchmarkDrawerPanel
        benchmark={undefined}
        onClose={mockOnClose}
        onRunBenchmark={mockOnRunBenchmark}
      />
    );
    const { container } = render(
      <Drawer isExpanded>
        <DrawerContent panelContent={panel}>
          <div />
        </DrawerContent>
      </Drawer>,
    );
    expect(screen.queryByTestId('benchmark-drawer-panel')).not.toBeInTheDocument();
    expect(container.querySelector('.pf-v6-c-drawer__panel')).not.toBeInTheDocument();
  });

  it('should show provider name as plain text when no recommended_when', () => {
    renderPanel({ providerName: 'LM Evaluation Harness' });
    expect(screen.getByText('LM Evaluation Harness')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-provider-tooltip')).not.toBeInTheDocument();
  });

  it('should show provider name with tooltip content when recommended_when is present', async () => {
    const user = userEvent.setup();
    renderPanel({
      providerName: 'LM Evaluation Harness',
      providerAgent: {
        recommended_when: ['User wants to measure model accuracy'],
      },
    });
    const trigger = screen.getByTestId('benchmark-provider-tooltip');
    expect(trigger).toHaveTextContent('LM Evaluation Harness');

    await user.hover(trigger);
    await waitFor(() => {
      expect(screen.getByText('Recommended when:')).toBeInTheDocument();
      expect(screen.getByText('User wants to measure model accuracy')).toBeInTheDocument();
    });
  });

  it('should display target type when providerAgent has target_type', () => {
    renderPanel({
      providerAgent: {
        target_type: 'model',
      },
    });
    expect(screen.getByText('Target type')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
  });

  it('should not display target type when providerAgent is absent', () => {
    renderPanel();
    expect(screen.queryByText('Target type')).not.toBeInTheDocument();
  });

  it('should not display target type when target_type is empty', () => {
    renderPanel({ providerAgent: { target_type: '' } });
    expect(screen.queryByText('Target type')).not.toBeInTheDocument();
  });
});
/* eslint-enable camelcase */
