import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PipelineServerActions from '#~/concepts/pipelines/content/PipelineServerActions';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
  DeleteServerModal: () => null,
  ViewServerModal: () => null,
}));

jest.mock('#~/concepts/pipelines/content/DeletePipelinesModal', () => {
  const Mock = () => null;
  Mock.displayName = 'MockDeletePipelinesModal';
  return Mock;
});

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireSimpleTrackingEvent: jest.fn(),
}));

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

const mockPipelinesAPI = (compatible = true) => {
  mockUsePipelinesAPI.mockReturnValue({
    pipelinesServer: {
      initializing: false,
      installed: true,
      compatible,
      timedOut: false,
      name: 'dspa',
      crStatus: undefined,
      isStarting: false,
    },
    refreshAllAPI: jest.fn(),
  } as unknown as ReturnType<typeof usePipelinesAPI>);
};

describe('PipelineServerActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render enabled action button when not disabled', () => {
    mockPipelinesAPI();
    render(<PipelineServerActions isDisabled={false} />);
    const button = screen.getByTestId('pipeline-server-action');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should render disabled action button when isDisabled is true', () => {
    mockPipelinesAPI();
    render(<PipelineServerActions isDisabled />);
    const button = screen.getByTestId('pipeline-server-action');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should render with kebab variant', () => {
    mockPipelinesAPI();
    render(<PipelineServerActions variant="kebab" isDisabled={false} />);
    const button = screen.getByTestId('pipeline-server-action');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Pipeline server action kebab toggle');
  });
});
