import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { loadRemote } from '@module-federation/runtime';
import { fireLinkTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MlflowTrackingEvents } from '@odh-dashboard/internal/concepts/mlflow/const';
import MlflowSkillRegistryPage, {
  MlflowSkillRegistryWrapperProps,
} from '../MlflowSkillRegistryPage';
import MLflowUnavailable from '../../shared/MLflowUnavailable';
import { SKILL_REGISTRY_DESCRIPTION } from '../../shared/const';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useSearchParams: () => [new URLSearchParams({ workspace: 'my-project' })],
}));

jest.mock('@module-federation/runtime', () => ({ loadRemote: jest.fn() }));

type CapturedLazyProps = {
  component: () => Promise<{ default: React.ComponentType<MlflowSkillRegistryWrapperProps> }>;
  props: MlflowSkillRegistryWrapperProps;
};
let capturedLazyProps: CapturedLazyProps | undefined;
jest.mock('@odh-dashboard/plugin-core', () => ({
  LazyCodeRefComponent: (lazyProps: CapturedLazyProps) => {
    capturedLazyProps = lazyProps;
    return null;
  },
}));

type CapturedPageProps = {
  empty?: boolean;
  emptyStatePage?: React.ReactNode;
  noHeader?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerAction?: React.ReactNode;
  children?: React.ReactNode;
};
let capturedPageProps: CapturedPageProps | undefined;
jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: (pageProps: CapturedPageProps) => {
    capturedPageProps = pageProps;
    return (
      <div>
        {pageProps.title}
        {pageProps.description}
        {pageProps.headerAction}
        {pageProps.children}
      </div>
    );
  },
  ProjectObjectType: jest.requireActual<typeof import('@odh-dashboard/ui-core/design')>(
    '@odh-dashboard/ui-core/design',
  ).ProjectObjectType,
}));

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelectorNavigator', () => ({
  __esModule: true,
  default: ({ onProjectChange }: { onProjectChange?: (projectName: string) => void }) => (
    <button data-testid="project-selector" onClick={() => onProjectChange?.('other-project')}>
      Switch project
    </button>
  ),
}));

jest.mock('../../shared/MLflowUnavailable', () => ({
  __esModule: true,
  default: () => <div data-testid="mlflow-unavailable" />,
}));

jest.mock('../../shared/MLflowNotConfigured', () => ({
  __esModule: true,
  default: () => <div data-testid="mlflow-not-configured" />,
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireLinkTrackingEvent: jest.fn(),
}));

const mockUseIsMlflowCRAvailable = jest.fn();
jest.mock('@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable', () => ({
  __esModule: true,
  default: () => mockUseIsMlflowCRAvailable(),
}));

const getWrapperProps = (): MlflowSkillRegistryWrapperProps => {
  if (!capturedLazyProps) {
    throw new Error('The MLflow Skill Registry wrapper was not rendered');
  }
  return capturedLazyProps.props;
};

const loadWrapper = () => {
  if (!capturedLazyProps) {
    throw new Error('The MLflow Skill Registry wrapper was not rendered');
  }
  return capturedLazyProps.component();
};

describe('MlflowSkillRegistryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedLazyProps = undefined;
    capturedPageProps = undefined;
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: true, loaded: true, error: false });
  });

  it('should pass the Skills base path to the MLflow wrapper', () => {
    render(<MlflowSkillRegistryPage />);

    expect(getWrapperProps().basename).toBe('/ai-hub/skills');
  });

  it('should load the Skill Registry wrapper from the MLflow remote', async () => {
    const SkillRegistryWrapper: React.FC<MlflowSkillRegistryWrapperProps> = () => null;
    jest.mocked(loadRemote).mockResolvedValue({ default: SkillRegistryWrapper });
    render(<MlflowSkillRegistryPage />);

    await expect(loadWrapper()).resolves.toEqual({ default: SkillRegistryWrapper });
    expect(loadRemote).toHaveBeenCalledWith('mlflowEmbedded/MlflowSkillRegistryWrapper');
  });

  it('should fall back to the unavailable state when the MLflow remote fails to load', async () => {
    jest.mocked(loadRemote).mockRejectedValue(new Error('Module not exposed'));
    render(<MlflowSkillRegistryPage />);

    await expect(loadWrapper()).resolves.toEqual({ default: MLflowUnavailable });
  });

  it('should show the project selector inline with the page title', () => {
    render(<MlflowSkillRegistryPage />);

    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByTestId('project-selector')).toBeInTheDocument();
  });

  it('should show the page description on the catalog and hide it on skill detail', () => {
    render(<MlflowSkillRegistryPage />);
    expect(capturedPageProps?.description).toBe(SKILL_REGISTRY_DESCRIPTION);

    act(() => {
      getWrapperProps().onBreadcrumbChange([
        { label: 'Skills', path: '/' },
        { label: '@acme/code-review', path: '/@acme/code-review' },
      ]);
    });

    expect(capturedPageProps?.description).toBeUndefined();
  });

  it('should hide the page header when the remote reports a skill detail breadcrumb', () => {
    render(<MlflowSkillRegistryPage />);
    expect(capturedPageProps?.noHeader).toBe(false);

    act(() => {
      getWrapperProps().onBreadcrumbChange([
        { label: 'Skills', path: '/' },
        { label: '@acme/code-review', path: '/@acme/code-review' },
      ]);
    });

    expect(capturedPageProps?.noHeader).toBe(true);
  });

  it('should link Launch MLflow to the Skills page in MLflow with the workspace', () => {
    render(<MlflowSkillRegistryPage />);

    expect(screen.getByTestId('mlflow-skills-jump-link')).toHaveAttribute(
      'href',
      '/mlflow/#/skills?workspace=my-project',
    );
  });

  it('should fire a tracking event when the user switches projects', () => {
    render(<MlflowSkillRegistryPage />);

    fireEvent.click(screen.getByTestId('project-selector'));

    expect(fireLinkTrackingEvent).toHaveBeenCalledWith(MlflowTrackingEvents.PROJECT_SWITCHED, {
      projectName: 'other-project',
    });
  });

  it('should show the not-configured empty state when MLflow is not set up on the cluster', () => {
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: false, loaded: true, error: false });
    render(<MlflowSkillRegistryPage />);
    expect(capturedPageProps?.empty).toBe(true);

    render(<>{capturedPageProps?.emptyStatePage}</>);

    expect(screen.getByTestId('mlflow-not-configured')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-unavailable')).not.toBeInTheDocument();
  });

  it('should show the unavailable empty state when the MLflow status check fails', () => {
    mockUseIsMlflowCRAvailable.mockReturnValue({ available: false, loaded: true, error: true });
    render(<MlflowSkillRegistryPage />);
    expect(capturedPageProps?.empty).toBe(true);

    render(<>{capturedPageProps?.emptyStatePage}</>);

    expect(screen.getByTestId('mlflow-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-not-configured')).not.toBeInTheDocument();
  });
});
