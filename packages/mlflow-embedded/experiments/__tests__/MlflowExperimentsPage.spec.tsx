import * as React from 'react';
import { render } from '@testing-library/react';
import MlflowExperimentsPage, {
  MlflowExperimentWrapperProps,
  UnsupportedTabInfo,
} from '../MlflowExperimentsPage';
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
  ApplicationsPage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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
  default: () => ({ available: true, loaded: true, error: false }),
}));

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

    it('should redirect to prompt management without a query when the search has no workspace', () => {
      render(<MlflowExperimentsPage />);

      reportUnsupportedTab({
        tabName: 'prompts',
        relativePath: '/prompts',
        search: '',
        workflowType: WorkflowType.MACHINE_LEARNING,
      });

      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/prompts', { replace: true });
    });

    it('should redirect prompts to prompt management from the Agent observability page too', () => {
      render(<MlflowExperimentsPage workflowType={WorkflowType.GENAI} />);

      reportUnsupportedTab({
        tabName: 'prompts',
        promptName: 'my-prompt',
        relativePath: '/prompts/my-prompt',
        search: '?workspace=my-project',
        workflowType: WorkflowType.GENAI,
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/gen-ai-studio/prompts/prompts/my-prompt?workspace=my-project',
        { replace: true },
      );
    });

    it('should redirect a GenAI tab on the Experiments page to Agent observability, keeping the path and search', () => {
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
        '/observe-and-monitor/agent-observability/123/chat-sessions/session-1?workspace=my-project&selectedTraceId=abc',
        { replace: true },
      );
    });

    it('should not navigate for a non-prompts tab reported by the Agent observability page', () => {
      render(<MlflowExperimentsPage workflowType={WorkflowType.GENAI} />);

      reportUnsupportedTab({
        experimentId: '123',
        tabName: 'runs',
        relativePath: '/123/runs',
        search: '?workspace=my-project',
        workflowType: WorkflowType.GENAI,
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
