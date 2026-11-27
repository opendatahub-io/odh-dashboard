import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PipelineCoreApplicationPage from '#~/pages/pipelines/global/PipelineCoreApplicationPage';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: { UNIFIED_PROJECT_SELECTOR: 'unified-project-selector' },
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
  PipelineServerTimedOut: function PipelineServerTimedOutMock() {
    return <div data-testid="pipeline-server-timed-out" />;
  },
}));

jest.mock('#~/concepts/pipelines/NoPipelineServer', () => {
  const MockNoPipelineServer = () => <div data-testid="no-pipeline-server" />;
  MockNoPipelineServer.displayName = 'MockNoPipelineServer';
  return MockNoPipelineServer;
});

jest.mock('../PipelineCoreProjectSelector', () => ({
  __esModule: true,
  default: function PipelineCoreProjectSelectorMock({
    getRedirectPath,
  }: {
    getRedirectPath: (namespace: string) => string;
  }) {
    return (
      <div data-testid="pipeline-project-selector" data-redirect-path={getRedirectPath('probe')} />
    );
  },
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

const getInvalidRedirectPath = (namespace: string) => `/pipelines/${namespace}`;

const buildK8sError = (code: number, message: string): Error =>
  new K8sStatusError({
    kind: 'Status',
    apiVersion: 'v1',
    status: 'Failure',
    message,
    reason: 'Forbidden',
    code,
  });

type MockPipelinesServer = Partial<ReturnType<typeof usePipelinesAPI>['pipelinesServer']>;

type RenderPageOptions = {
  upsEnabled?: boolean;
  pipelinesServer?: MockPipelinesServer;
  pipelineLoadError?: Error;
  accessDomain?: string;
  overrideTimeout?: boolean;
};

const mockPipelinesAPI = ({
  pipelinesServer,
  pipelineLoadError,
}: Pick<RenderPageOptions, 'pipelinesServer' | 'pipelineLoadError'>) => {
  mockUsePipelinesAPI.mockReturnValue({
    pipelinesServer: {
      initializing: false,
      installed: true,
      compatible: true,
      timedOut: false,
      name: 'dspa',
      crStatus: undefined,
      isStarting: false,
      ...pipelinesServer,
    },
    pipelineLoadError,
  } as ReturnType<typeof usePipelinesAPI>);
};

const renderPage = ({
  upsEnabled = false,
  pipelinesServer,
  pipelineLoadError,
  accessDomain,
  overrideTimeout,
}: RenderPageOptions = {}) => {
  mockUseIsAreaAvailable.mockReturnValue({ status: upsEnabled } as ReturnType<
    typeof useIsAreaAvailable
  >);
  mockPipelinesAPI({ pipelinesServer, pipelineLoadError });

  return render(
    <MemoryRouter>
      <PipelineCoreApplicationPage
        title="Pipelines"
        getRedirectPath={getInvalidRedirectPath}
        accessDomain={accessDomain}
        overrideTimeout={overrideTimeout}
      >
        <div data-testid="page-children" />
      </PipelineCoreApplicationPage>
    </MemoryRouter>,
  );
};

const getPageHeader = (): HTMLElement => {
  const header = screen
    .getByTestId('app-page-title')
    .closest('.odh-dashboard-applications-page-header');
  if (!header) {
    throw new Error('ApplicationsPage header was not rendered');
  }
  return header as HTMLElement;
};

/**
 * The gate only moves the project selector into the masthead, so every state below must keep
 * rendering its own warning with the selector present off the gate and absent on it.
 */
const expectProjectSelector = (upsEnabled: boolean) => {
  if (upsEnabled) {
    expect(screen.queryByTestId('pipeline-project-selector')).not.toBeInTheDocument();
  } else {
    expect(within(getPageHeader()).getByTestId('pipeline-project-selector')).toBeInTheDocument();
  }
};

describe('PipelineCoreApplicationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    { label: 'disabled', upsEnabled: false, selectorVisible: true },
    { label: 'enabled', upsEnabled: true, selectorVisible: false },
  ])('with the unified project selector $label', ({ upsEnabled, selectorVisible }) => {
    it(`renders the project selector in the page header: ${selectorVisible}`, () => {
      const { container } = renderPage({ upsEnabled });

      if (selectorVisible) {
        expect(within(getPageHeader()).getByTestId('pipeline-project-selector')).toHaveAttribute(
          'data-redirect-path',
          '/pipelines/probe',
        );
      } else {
        expect(container.querySelector('[data-testid="pipeline-project-selector"]')).toBeNull();
      }
    });
  });

  describe.each([
    { label: 'disabled', upsEnabled: false },
    { label: 'enabled', upsEnabled: true },
  ])('pipeline server states with the unified project selector $label', ({ upsEnabled }) => {
    // Pinned to this gate so each state runs on both sides of the header change.
    const renderState = (options: Omit<RenderPageOptions, 'upsEnabled'> = {}) =>
      renderPage({ ...options, upsEnabled });

    it('renders the loading state and not the children while the server is initializing', () => {
      const { container } = renderState({ pipelinesServer: { initializing: true } });

      expect(container.querySelector('[data-id="loading-empty-state"]')).toBeInTheDocument();
      expect(screen.queryByTestId('page-children')).not.toBeInTheDocument();
    });

    it('renders the no-server empty state and not the children when the server is not installed', () => {
      renderState({ pipelinesServer: { installed: false } });

      expect(screen.getByTestId('no-pipeline-server')).toBeInTheDocument();
      expect(screen.queryByTestId('page-children')).not.toBeInTheDocument();
      expectProjectSelector(upsEnabled);
    });

    it('renders the children when the server is installed', () => {
      renderState();

      expect(screen.getByTestId('page-children')).toBeInTheDocument();
      expect(screen.queryByTestId('no-pipeline-server')).not.toBeInTheDocument();
    });

    it('renders the timed out state instead of the children when the server timed out and is compatible', () => {
      renderState({ pipelinesServer: { timedOut: true, compatible: true } });

      expect(screen.getByTestId('pipeline-server-timed-out')).toBeInTheDocument();
      expect(screen.queryByTestId('page-children')).not.toBeInTheDocument();
      expectProjectSelector(upsEnabled);
    });

    it('renders the children when the server timed out but is not compatible', () => {
      renderState({ pipelinesServer: { timedOut: true, compatible: false } });

      expect(screen.queryByTestId('pipeline-server-timed-out')).not.toBeInTheDocument();
      expect(screen.getByTestId('page-children')).toBeInTheDocument();
    });

    it('renders the children when the timeout handling is overridden', () => {
      renderState({
        pipelinesServer: { timedOut: true, compatible: true },
        overrideTimeout: true,
      });

      expect(screen.queryByTestId('pipeline-server-timed-out')).not.toBeInTheDocument();
      expect(screen.getByTestId('page-children')).toBeInTheDocument();
    });
  });

  describe.each([
    { label: 'disabled', upsEnabled: false },
    { label: 'enabled', upsEnabled: true },
  ])('pipeline load errors with the unified project selector $label', ({ upsEnabled }) => {
    const renderState = (options: Omit<RenderPageOptions, 'upsEnabled'> = {}) =>
      renderPage({ ...options, upsEnabled });

    it('renders the unauthorized page for a 403 error and not the children', () => {
      renderState({ pipelineLoadError: buildK8sError(403, 'Forbidden') });

      expect(screen.getByTestId('unauthorized-error')).toHaveTextContent(
        'To access pipelines, ask your administrator to adjust your permissions.',
      );
      expect(screen.queryByTestId('page-children')).not.toBeInTheDocument();
      expectProjectSelector(upsEnabled);
    });

    it('renders the unauthorized page with the custom access domain for a 403 error', () => {
      renderState({
        pipelineLoadError: buildK8sError(403, 'Forbidden'),
        accessDomain: 'artifacts',
      });

      expect(screen.getByTestId('unauthorized-error')).toHaveTextContent(
        'To access artifacts, ask your administrator to adjust your permissions.',
      );
    });

    it('renders the generic error state for a non-403 error', () => {
      const { container } = renderState({
        pipelineLoadError: buildK8sError(500, 'Internal server error'),
      });

      expect(screen.queryByTestId('unauthorized-error')).not.toBeInTheDocument();
      expect(container.querySelector('[data-id="error-empty-state"]')).toBeInTheDocument();
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
      expect(screen.queryByTestId('page-children')).not.toBeInTheDocument();
      expectProjectSelector(upsEnabled);
    });
  });
});
