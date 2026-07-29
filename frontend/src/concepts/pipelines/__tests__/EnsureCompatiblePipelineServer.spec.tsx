import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
  DeleteServerModal: () => null,
}));

jest.mock('#~/concepts/pipelines/NoPipelineServer', () => {
  const Mock = () => <div data-testid="no-pipeline-server">No pipeline server</div>;
  Mock.displayName = 'MockNoPipelineServer';
  return Mock;
});

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

const mockPipelinesAPI = (
  overrides: Partial<ReturnType<typeof usePipelinesAPI>['pipelinesServer']>,
) => {
  mockUsePipelinesAPI.mockReturnValue({
    pipelinesServer: {
      initializing: false,
      installed: true,
      compatible: true,
      timedOut: false,
      name: 'dspa',
      crStatus: undefined,
      isStarting: false,
      ...overrides,
    },
  } as ReturnType<typeof usePipelinesAPI>);
};

describe('EnsureCompatiblePipelineServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when server is compatible', () => {
    mockPipelinesAPI({ compatible: true, installed: true });
    render(
      <EnsureCompatiblePipelineServer>
        <div>Pipeline content</div>
      </EnsureCompatiblePipelineServer>,
    );
    expect(screen.getByText('Pipeline content')).toBeInTheDocument();
  });

  it('should render spinner when server is initializing', () => {
    mockPipelinesAPI({ initializing: true });
    render(
      <EnsureCompatiblePipelineServer>
        <div>Pipeline content</div>
      </EnsureCompatiblePipelineServer>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Pipeline content')).not.toBeInTheDocument();
  });

  it('should render NoPipelineServer when server is not installed', () => {
    mockPipelinesAPI({ installed: false });
    render(
      <EnsureCompatiblePipelineServer>
        <div>Pipeline content</div>
      </EnsureCompatiblePipelineServer>,
    );
    expect(screen.getByTestId('no-pipeline-server')).toBeInTheDocument();
    expect(screen.queryByText('Pipeline content')).not.toBeInTheDocument();
  });

  it('should render incompatible server error when server is not compatible', () => {
    mockPipelinesAPI({ installed: true, compatible: false });
    render(
      <MemoryRouter>
        <EnsureCompatiblePipelineServer>
          <div>Pipeline content</div>
        </EnsureCompatiblePipelineServer>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('incompatible-pipelines-server')).toBeInTheDocument();
    expect(
      screen.getByText('Unsupported pipeline and pipeline server version'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Pipeline content')).not.toBeInTheDocument();
  });
});
