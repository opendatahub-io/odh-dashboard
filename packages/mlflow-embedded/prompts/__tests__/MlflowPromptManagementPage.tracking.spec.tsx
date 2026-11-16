import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import MlflowPromptManagementPage from '../MlflowPromptManagementPage';
import { renderWithTracking } from '../../shared/__tests__/TrackingProvider';

let mockGlobalPromptsEnabled = true;
let mockGlobalNamespace: string | undefined = 'global-prompts';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useSearchParams: () => [new URLSearchParams({ workspace: 'my-project' })],
}));

jest.mock('@odh-dashboard/internal/app/AppContext', () => ({
  useAppContext: () => ({
    dashboardConfig: {
      spec: {
        dashboardConfig: { globalProjectPrompts: mockGlobalPromptsEnabled },
        globalMLflowNamespaces: mockGlobalNamespace ? [mockGlobalNamespace] : [],
      },
    },
  }),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/user', () => ({
  useUser: () => ({ isAdmin: false }),
}));

jest.mock('@odh-dashboard/internal/concepts/mlflow/hooks/useIsMlflowCRAvailable', () => ({
  __esModule: true,
  default: () => ({ available: true, loaded: true, error: false }),
}));

jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual<typeof import('@odh-dashboard/plugin-core')>('@odh-dashboard/plugin-core'),
  LazyCodeRefComponent: () => null,
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual<typeof import('@odh-dashboard/ui-core')>('@odh-dashboard/ui-core'),
  ApplicationsPage: ({ title }: { title: React.ReactNode }) => <>{title}</>,
}));

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelectorNavigator', () => ({
  __esModule: true,
  default: ({ onProjectChange }: { onProjectChange: (projectName: string) => void }) => (
    <>
      <button data-testid="select-global" onClick={() => onProjectChange('global-prompts')}>
        Global project
      </button>
      <button data-testid="select-local" onClick={() => onProjectChange('other-project')}>
        Other project
      </button>
    </>
  ),
}));

describe('MlflowPromptManagementPage tracking', () => {
  beforeEach(() => {
    mockGlobalPromptsEnabled = true;
    mockGlobalNamespace = 'global-prompts';
  });

  it.each([
    ['select-global', 'global-prompts', true],
    ['select-local', 'other-project', false],
  ])(
    'should preserve the project selection payload for %s',
    (testId, selectedProject, isGlobalProject) => {
      const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
      const { rerender } = renderWithTracking(<MlflowPromptManagementPage />, tracking);
      rerender(<MlflowPromptManagementPage />);
      expect(tracking.trackEvent).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId(testId));

      expect(tracking.trackEvent.mock.calls).toStrictEqual([
        ['Prompts global project changed', { isGlobalProject, selectedProject }],
      ]);
      expect(tracking.trackPageEvent).not.toHaveBeenCalled();
    },
  );

  it.each(['disabled', 'unconfigured'])('should preserve non-global selection when %s', (state) => {
    mockGlobalPromptsEnabled = state !== 'disabled';
    mockGlobalNamespace = state === 'unconfigured' ? undefined : 'global-prompts';
    const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
    renderWithTracking(<MlflowPromptManagementPage />, tracking);

    fireEvent.click(screen.getByTestId('select-global'));

    expect(tracking.trackEvent.mock.calls).toStrictEqual([
      [
        'Prompts global project changed',
        { isGlobalProject: false, selectedProject: 'global-prompts' },
      ],
    ]);
    expect(tracking.trackPageEvent).not.toHaveBeenCalled();
  });
});
