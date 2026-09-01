import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { useThemeContext } from 'mod-arch-kubeflow';
import { AdminStatusProvider } from '~/odh/context/AdminStatusContext';
import AdminHelpAction from '~/app/pages/modelRegistry/screens/components/AdminHelpAction';

jest.mock('mod-arch-shared', () => ({
  WhosMyAdministrator: ({
    buttonLabel,
    linkTestId,
    leadText,
    contentTestId,
  }: {
    buttonLabel?: string;
    linkTestId?: string;
    leadText?: string;
    contentTestId?: string;
  }) => (
    <div data-testid="whos-my-admin">
      <button type="button" data-testid={linkTestId}>
        {buttonLabel}
      </button>
      <div data-testid={contentTestId}>{leadText}</div>
    </div>
  ),
  KubeflowDocs: ({ buttonLabel }: { buttonLabel?: string }) => (
    <div data-testid="kubeflow-docs">{buttonLabel}</div>
  ),
}));

jest.mock('mod-arch-kubeflow', () => ({
  useThemeContext: jest.fn(() => ({ isMUITheme: false })),
}));

const mockUseThemeContext = jest.mocked(useThemeContext);

const SETTINGS_URL = '/settings/model-resources-operations/model-registry';
const SETTINGS_TITLE = 'Model registry settings';

describe('AdminHelpAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeContext.mockReturnValue({ isMUITheme: false } as ReturnType<
      typeof useThemeContext
    >);
  });

  it('should render WhosMyAdministrator for non-admin users', () => {
    render(
      <MemoryRouter>
        <AdminStatusProvider
          isAdmin={false}
          loaded
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        >
          <AdminHelpAction
            buttonLabel="Need another registry?"
            headerContent="Need another registry?"
          />
        </AdminStatusProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('whos-my-admin')).toBeInTheDocument();
    expect(screen.getByText('Need another registry?')).toBeInTheDocument();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should render admin popover with settings link for admin users', () => {
    render(
      <MemoryRouter>
        <AdminStatusProvider
          isAdmin
          loaded
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        >
          <AdminHelpAction
            buttonLabel="Need another registry?"
            linkTestId="model-registry-help-button"
            headerContent="Need another registry?"
            contentTestId="model-registry-help-content"
          />
        </AdminStatusProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('whos-my-admin')).not.toBeInTheDocument();

    const triggerButton = screen.getByTestId('model-registry-help-button');
    expect(triggerButton).toHaveTextContent('Need another registry?');

    fireEvent.click(triggerButton);

    const settingsLink = screen.getByRole('link');
    expect(settingsLink).toHaveAttribute('href', SETTINGS_URL);
    expect(settingsLink).toHaveTextContent(`Go to ${SETTINGS_TITLE}`);
  });

  it('should render WhosMyAdministrator when admin status has not loaded', () => {
    render(
      <MemoryRouter>
        <AdminStatusProvider
          isAdmin
          loaded={false}
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        >
          <AdminHelpAction />
        </AdminStatusProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('whos-my-admin')).toBeInTheDocument();
  });

  it('should render WhosMyAdministrator when no AdminStatusProvider wraps it', () => {
    render(
      <MemoryRouter>
        <AdminHelpAction />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('whos-my-admin')).toBeInTheDocument();
  });

  it('should render KubeflowDocs when MUI theme is active regardless of admin status', () => {
    mockUseThemeContext.mockReturnValue({ isMUITheme: true } as ReturnType<typeof useThemeContext>);

    render(
      <MemoryRouter>
        <AdminStatusProvider
          isAdmin
          loaded
          settingsUrl={SETTINGS_URL}
          settingsTitle={SETTINGS_TITLE}
        >
          <AdminHelpAction buttonLabel="Help" />
        </AdminStatusProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('kubeflow-docs')).toBeInTheDocument();
    expect(screen.queryByTestId('whos-my-admin')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
