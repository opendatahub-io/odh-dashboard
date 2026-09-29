import * as React from 'react';
import { render } from '@testing-library/react';
import MlflowExperimentsPage, { MlflowExperimentWrapperProps } from '../MlflowExperimentsPage';
import { WorkflowType } from '../../shared/const';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
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

describe('MlflowExperimentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedWrapperProps = undefined;
  });

  it('should lock the MLflow wrapper to the Model training workflow type', () => {
    render(<MlflowExperimentsPage />);

    expect(capturedWrapperProps?.workflowType).toBe(WorkflowType.MACHINE_LEARNING);
  });

  it('should pass a breadcrumb change handler to the MLflow wrapper', () => {
    render(<MlflowExperimentsPage />);

    expect(capturedWrapperProps?.onBreadcrumbChange).toEqual(expect.any(Function));
  });
});
