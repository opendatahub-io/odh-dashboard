import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import NoPipelineServer from '#~/concepts/pipelines/NoPipelineServer';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
  CreatePipelineServerButton: ({ isInline }: { isInline?: boolean }) => (
    <button data-testid="create-pipeline-server-button" data-inline={isInline}>
      Configure pipeline server
    </button>
  ),
}));

jest.mock('#~/concepts/pipelines/content/import/ImportPipelineButton', () => {
  const Mock = () => <button data-testid="import-pipeline-button">Import pipeline</button>;
  Mock.displayName = 'MockImportPipelineButton';
  return Mock;
});

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

const mockPipelinesAPI = (installed: boolean) => {
  mockUsePipelinesAPI.mockReturnValue({
    pipelinesServer: {
      initializing: false,
      installed,
      compatible: true,
      timedOut: false,
      name: 'dspa',
      crStatus: undefined,
      isStarting: false,
    },
  } as ReturnType<typeof usePipelinesAPI>);
};

describe('NoPipelineServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render configure server empty state when server is not installed', () => {
    mockPipelinesAPI(false);
    render(<NoPipelineServer />);
    expect(screen.getByText('Configure a pipeline server')).toBeInTheDocument();
    expect(screen.getByTestId('create-pipeline-server-button')).toBeInTheDocument();
  });

  it('should render import pipeline empty state when server is installed', () => {
    mockPipelinesAPI(true);
    render(<NoPipelineServer />);
    expect(screen.getByText('Start by importing a pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('import-pipeline-button')).toBeInTheDocument();
  });
});
