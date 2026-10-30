import * as React from 'react';
import { render, screen } from '@testing-library/react';
import useIsMlflowCRAvailable from '@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable';
import MlflowExperimentsPage, {
  MlflowExperimentWrapperProps,
  UnsupportedTabInfo,
} from '../MlflowExperimentsPage';
import MlflowAgentObservabilityPage from '../../agent-observability/MlflowAgentObservabilityPage';
import { WorkflowType } from '../../shared/const';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams({ workspace: 'my-project' })],
}));

jest.mock('@module-federation/runtime', () => ({ loadRemote: jest.fn() }));

let capturedWrapperProps: MlflowExperimentWrapperProps | undefined;
jest.mock('@odh-dashboard/plugin-core', () => ({
  LazyCodeRefComponent: ({ props }: { props: MlflowExperimentWrapperProps }) => {
    capturedWrapperProps = props;
    return null;
  },
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    children,
    empty,
    emptyStatePage,
    headerContent,
  }: {
    children?: React.ReactNode;
    empty?: boolean;
    emptyStatePage?: React.ReactNode;
    headerContent?: React.ReactNode;
  }) => (
    <div>
      {headerContent}
      {empty ? emptyStatePage : children}
    </div>
  ),
  ProjectObjectType: jest.requireActual<typeof import('@odh-dashboard/ui-core/design')>(
    '@odh-dashboard/ui-core/design',
  ).ProjectObjectType,
}));

jest.mock('@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireLinkTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../shared/MLflowNotConfigured', () => ({
  __esModule: true,
  default: ({ featureName }: { featureName: string }) => (
    <div data-testid="mlflow-setup-feature-name">{featureName}</div>
  ),
}));

const mockUseIsMlflowCRAvailable = jest.mocked(useIsMlflowCRAvailable);

const reportUnsupportedTab = (info: UnsupportedTabInfo) => {
  const onUnsupportedTab = capturedWrapperProps?.onUnsupportedTab;
  if (!onUnsupportedTab) {
    throw new Error('onUnsupportedTab was not passed to the MLflow wrapper');
  }
  onUnsupportedTab(info);
};

describe('MlflowExperimentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedWrapperProps = undefined;
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: true, loaded: true, error: false });
  });

  it('should lock the MLflow wrapper to the Model training workflow type', () => {
    render(<MlflowExperimentsPage />);

    expect(capturedWrapperProps?.workflowType).toBe(WorkflowType.MACHINE_LEARNING);
  });

  it('should pass a breadcrumb change handler to the MLflow wrapper', () => {
    render(<MlflowExperimentsPage />);

    expect(capturedWrapperProps?.onBreadcrumbChange).toEqual(expect.any(Function));
  });

  it('should pass the Experiments base path to the MLflow wrapper', () => {
    render(<MlflowExperimentsPage />);

    expect(capturedWrapperProps?.basename).toBe('/develop-train/mlflow/experiments');
  });

  it('should pass the Agent traces base path and GenAI workflow type from the Agent traces page', () => {
    render(<MlflowAgentObservabilityPage />);

    expect(capturedWrapperProps?.basename).toBe('/observe-and-monitor/agent-traces');
    expect(capturedWrapperProps?.workflowType).toBe(WorkflowType.GENAI);
  });

  it('should use agent observability in the Agent traces setup guidance', () => {
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: false, loaded: true, error: false });

    render(<MlflowAgentObservabilityPage />);

    expect(screen.getByTestId('mlflow-setup-feature-name')).toHaveTextContent(
      'agent observability',
    );
    expect(screen.queryByTestId('mlflow-embedded-jump-link')).not.toBeInTheDocument();
  });

  describe('onUnsupportedTab', () => {
    it('should redirect the top-level prompts list to prompt management with the workspace', () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        tabName: 'prompts',
        relativePath: '/prompts',
        search: '?workspace=my-project',
        workflowType: WorkflowType.MACHINE_LEARNING,
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/prompts?workspace=my-project', {
        replace: true,
      });
    });

    it('should redirect a prompt detail to prompt management and URL-encode the prompt name', () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        experimentId: '123',
        tabName: 'prompts',
        promptName: 'my prompt/v1',
        relativePath: '/123/prompts/my prompt/v1',
        search: '?workspace=my-project',
        workflowType: WorkflowType.MACHINE_LEARNING,
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/gen-ai-studio/prompts/prompts/my%20prompt%2Fv1?workspace=my-project',
        { replace: true },
      );
    });

    it('should keep only the workspace param when redirecting to prompt management', () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        tabName: 'prompts',
        relativePath: '/prompts',
        search: '?workspace=my-project&selectedTraceId=abc',
        workflowType: WorkflowType.MACHINE_LEARNING,
      });

      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/prompts?workspace=my-project', {
        replace: true,
      });
    });

    it("should fall back to the page's workspace when the reported search has no workspace", () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        tabName: 'prompts',
        relativePath: '/prompts',
        search: '',
        workflowType: WorkflowType.MACHINE_LEARNING,
      });

      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/prompts?workspace=my-project', {
        replace: true,
      });
    });

    it("should fall back to the page's workspace when the reported workspace is empty", () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        tabName: 'prompts',
        relativePath: '/prompts',
        search: '?workspace=',
        workflowType: WorkflowType.MACHINE_LEARNING,
      });

      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/prompts?workspace=my-project', {
        replace: true,
      });
    });

    it('should preserve the linked prompt version when redirecting from the Experiments page', () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        experimentId: '123',
        tabName: 'prompts',
        promptName: 'my-prompt',
        relativePath: '/123/prompts/my-prompt',
        search: '?workspace=my-project&promptVersion=1',
        workflowType: WorkflowType.MACHINE_LEARNING,
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/gen-ai-studio/prompts/prompts/my-prompt?promptVersion=1&workspace=my-project',
        { replace: true },
      );
    });

    it('should preserve the linked prompt version when redirecting from the Agent traces page', () => {
      render(<MlflowAgentObservabilityPage />);

      reportUnsupportedTab({
        tabName: 'prompts',
        promptName: 'my-prompt',
        relativePath: '/prompts/my-prompt',
        search: '?workspace=my-project&promptVersion=1',
        workflowType: WorkflowType.GENAI,
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/gen-ai-studio/prompts/prompts/my-prompt?promptVersion=1&workspace=my-project',
        { replace: true },
      );
    });

    it('should redirect a GenAI tab on the Experiments page to Agent traces, keeping the path and search', () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        experimentId: '123',
        tabName: 'chat-sessions',
        relativePath: '/123/chat-sessions/session-1',
        search: '?workspace=my-project&selectedTraceId=abc',
        workflowType: WorkflowType.MACHINE_LEARNING,
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        '/observe-and-monitor/agent-traces/123/chat-sessions/session-1?workspace=my-project&selectedTraceId=abc',
        { replace: true },
      );
    });

    it('should redirect a non-prompts tab on the Experiments page to Agent traces whatever workflow type the remote reports', () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        experimentId: '123',
        tabName: 'chat-sessions',
        relativePath: '/123/chat-sessions',
        search: '?workspace=my-project',
        workflowType: WorkflowType.GENAI,
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/observe-and-monitor/agent-traces/123/chat-sessions?workspace=my-project',
        { replace: true },
      );
    });

    describe('without a redirect for the reported tab', () => {
      const onPopState = jest.fn();

      beforeEach(() => {
        window.addEventListener('popstate', onPopState);
      });

      afterEach(() => {
        window.removeEventListener('popstate', onPopState);
        window.history.replaceState(null, '', '/');
      });

      it('should move the remote to the reported experiment for a tab it has no redirect for', () => {
        render(<MlflowAgentObservabilityPage />);

        reportUnsupportedTab({
          experimentId: '123',
          tabName: 'runs',
          relativePath: '/123/runs',
          search: '?workspace=my-project&selectedTraceId=abc',
          workflowType: WorkflowType.GENAI,
        });

        expect(`${window.location.pathname}${window.location.search}`).toBe(
          '/observe-and-monitor/agent-traces/123?workspace=my-project',
        );
        expect(onPopState).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('should move the remote to the Agent traces root when no experiment is reported', () => {
        render(<MlflowAgentObservabilityPage />);

        reportUnsupportedTab({
          tabName: 'runs',
          relativePath: '/runs',
          search: '?workspace=my-project',
          workflowType: WorkflowType.GENAI,
        });

        expect(`${window.location.pathname}${window.location.search}`).toBe(
          '/observe-and-monitor/agent-traces?workspace=my-project',
        );
        expect(onPopState).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });
});
