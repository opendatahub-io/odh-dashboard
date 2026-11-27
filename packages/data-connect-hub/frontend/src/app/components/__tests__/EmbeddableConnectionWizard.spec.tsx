import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getInstance, init, loadRemote, registerRemotes } from '@module-federation/runtime';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import moduleFederationConfig from '../../../../config/moduleFederation.js';
import EmbeddableConnectionWizard from '~/app/components/EmbeddableConnectionWizard';
import EmbeddableConnectionWizardRemote from '~/app/components/EmbeddableConnectionWizardRemote';
import type { ConnectionWizardAvailability } from '~/types';

jest.mock('@module-federation/runtime', () => ({
  getInstance: jest.fn(),
  init: jest.fn(),
  registerRemotes: jest.fn(),
  loadRemote: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: {
    PLUGIN_DATA_CONNECT_HUB: 'plugin-data-connect-hub',
  },
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useAccessReview: jest.fn(),
}));

jest.mock('~/app/components/CreateConnectionWizard', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { useNotification } = jest.requireActual('~/app/hooks/useNotification');
    const notification = useNotification();

    return (
      <div data-testid="remote-notification-wizard">
        <span>{isOpen ? 'open' : 'closed'}</span>
        <button
          type="button"
          onClick={() => {
            notification.success('Connection created');
            onClose();
          }}
        >
          Create connection
        </button>
      </div>
    );
  },
}));

const mockGetInstance = jest.mocked(getInstance);
const mockInit = jest.mocked(init);
const mockRegisterRemotes = jest.mocked(registerRemotes);
const mockLoadRemote = jest.mocked(loadRemote);
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseAccessReview = jest.mocked(useAccessReview);

const StatefulWizardConsumer = () => {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <EmbeddableConnectionWizard
      isOpen={isOpen}
      namespace="test-project"
      onClose={() => setIsOpen(false)}
    />
  );
};

describe('EmbeddableConnectionWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInstance.mockReturnValue(null);
    mockInit.mockReturnValue({} as ReturnType<typeof init>);
    mockRegisterRemotes.mockReturnValue(undefined);
    mockLoadRemote.mockResolvedValue({ default: EmbeddableConnectionWizardRemote });
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: null,
      featureFlags: null,
      reliantAreas: null,
      requiredCapabilities: null,
      requiredComponents: null,
    });
    mockUseAccessReview.mockReturnValue([true, true]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
  });

  it('exposes only the availability-aware wizard facade', () => {
    const exposes = moduleFederationConfig.moduleFederationPlugins[0].options.exposes;

    expect(Object.keys(exposes)).toEqual([
      './extensions',
      './extension-points',
      './EmbeddableConnectionWizard',
    ]);
    expect(exposes['./EmbeddableConnectionWizard']).toBe(
      './src/app/components/EmbeddableConnectionWizardRemote',
    );
  });

  it('registers the remote, checks backend health, and renders the wizard', async () => {
    const onAvailabilityChange = jest.fn(
      (_availability: ConnectionWizardAvailability) => undefined,
    );

    render(
      <EmbeddableConnectionWizard
        isOpen
        namespace="test-project"
        onAvailabilityChange={onAvailabilityChange}
      />,
    );

    expect(await screen.findByTestId('remote-notification-wizard')).toBeInTheDocument();
    expect(mockInit).toHaveBeenCalledWith({
      name: 'connectionWizardConsumer',
      remotes: [{ name: 'dataConnectHub', entry: '/_mf/dataConnectHub/remoteEntry.js' }],
    });
    expect(mockLoadRemote).toHaveBeenCalledWith('dataConnectHub/EmbeddableConnectionWizard');
    expect(global.fetch).toHaveBeenCalledWith('/data-connect-hub/healthcheck/backend', {
      signal: expect.any(AbortSignal),
    });
    await waitFor(() => expect(onAvailabilityChange).toHaveBeenCalledWith({ status: 'available' }));
  });

  it('renders the fallback without backend checks when the feature is disabled', async () => {
    const onAvailabilityChange = jest.fn(
      (_availability: ConnectionWizardAvailability) => undefined,
    );
    mockLoadRemote.mockReturnValue(new Promise(() => undefined));
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
      devFlags: null,
      featureFlags: null,
      reliantAreas: null,
      requiredCapabilities: null,
      requiredComponents: null,
    });

    render(
      <EmbeddableConnectionWizard
        isOpen
        namespace="test-project"
        unavailableFallback={<div data-testid="legacy-connection-modal" />}
        onAvailabilityChange={onAvailabilityChange}
      />,
    );

    expect(await screen.findByTestId('legacy-connection-modal')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockLoadRemote).not.toHaveBeenCalled();
    expect(onAvailabilityChange).toHaveBeenCalledWith({
      status: 'unavailable',
      reason: 'feature-flag',
    });
  });

  it('renders the fallback before loading the wizard when create permission is denied', async () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    const onAvailabilityChange = jest.fn(
      (_availability: ConnectionWizardAvailability) => undefined,
    );

    render(
      <EmbeddableConnectionWizard
        isOpen
        namespace="test-project"
        unavailableFallback={<div data-testid="legacy-connection-modal" />}
        onAvailabilityChange={onAvailabilityChange}
      />,
    );

    expect(await screen.findByTestId('legacy-connection-modal')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(onAvailabilityChange).toHaveBeenCalledWith({
        status: 'unavailable',
        reason: 'permissions',
      }),
    );
  });

  it('waits for the create access check before loading the wizard', async () => {
    mockUseAccessReview.mockReturnValue([false, false]);

    render(<EmbeddableConnectionWizard isOpen namespace="test-project" />);

    await waitFor(() =>
      expect(screen.getByTestId('connection-wizard-loading-tearsheet')).toBeInTheDocument(),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders the fallback when the backend health check fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 } as Response);
    const onAvailabilityChange = jest.fn(
      (_availability: ConnectionWizardAvailability) => undefined,
    );

    render(
      <EmbeddableConnectionWizard
        isOpen
        namespace="test-project"
        unavailableFallback={<div data-testid="legacy-connection-modal" />}
        onAvailabilityChange={onAvailabilityChange}
      />,
    );

    expect(await screen.findByTestId('legacy-connection-modal')).toBeInTheDocument();
    await waitFor(() =>
      expect(onAvailabilityChange).toHaveBeenCalledWith({
        status: 'unavailable',
        reason: 'backend',
      }),
    );
  });

  it('renders the fallback when the federated wizard cannot load', async () => {
    mockLoadRemote.mockRejectedValue(new Error('remote unavailable'));

    render(
      <EmbeddableConnectionWizard
        isOpen
        namespace="test-project"
        unavailableFallback={<div data-testid="legacy-connection-modal" />}
      />,
    );

    expect(await screen.findByTestId('legacy-connection-modal')).toBeInTheDocument();
  });

  it('renders the fallback when the federated wizard throws while rendering', async () => {
    const onAvailabilityChange = jest.fn(
      (_availability: ConnectionWizardAvailability) => undefined,
    );
    const ThrowingWizard = () => {
      throw new Error('remote render failed');
    };
    const HealthyWizard = () => <div data-testid="healthy-remote-wizard" />;
    mockLoadRemote
      .mockResolvedValueOnce({ default: ThrowingWizard })
      .mockResolvedValueOnce({ default: HealthyWizard });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const props = {
      namespace: 'test-project',
      unavailableFallback: <div data-testid="legacy-connection-modal" />,
      onAvailabilityChange,
    };

    try {
      const { rerender } = render(<EmbeddableConnectionWizard {...props} isOpen />);

      expect(await screen.findByTestId('legacy-connection-modal')).toBeInTheDocument();
      await waitFor(() =>
        expect(onAvailabilityChange).toHaveBeenCalledWith({
          status: 'unavailable',
          reason: 'remote',
        }),
      );

      rerender(<EmbeddableConnectionWizard {...props} isOpen={false} />);
      expect(screen.queryByTestId('legacy-connection-modal')).toBeNull();

      rerender(<EmbeddableConnectionWizard {...props} isOpen />);
      expect(await screen.findByTestId('healthy-remote-wizard')).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('reports checking before each open after a remote failure', async () => {
    const onAvailabilityChange = jest.fn(
      (_availability: ConnectionWizardAvailability) => undefined,
    );
    mockLoadRemote.mockRejectedValueOnce(new Error('remote unavailable'));

    const { rerender } = render(
      <EmbeddableConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId="connection-type-id"
        onAvailabilityChange={onAvailabilityChange}
      />,
    );

    expect(await screen.findByTestId('connection-wizard-unavailable')).toBeInTheDocument();
    expect(onAvailabilityChange).toHaveBeenNthCalledWith(1, { status: 'checking' });
    expect(onAvailabilityChange).toHaveBeenNthCalledWith(2, {
      status: 'unavailable',
      reason: 'remote',
    });

    rerender(
      <EmbeddableConnectionWizard
        isOpen={false}
        namespace="test-project"
        initialConnectionTypeId="connection-type-id"
        onAvailabilityChange={onAvailabilityChange}
      />,
    );
    mockLoadRemote.mockResolvedValue({ default: EmbeddableConnectionWizardRemote });
    rerender(
      <EmbeddableConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId="connection-type-id"
        onAvailabilityChange={onAvailabilityChange}
      />,
    );

    expect(onAvailabilityChange).toHaveBeenNthCalledWith(3, { status: 'checking' });
    await waitFor(() =>
      expect(onAvailabilityChange).toHaveBeenLastCalledWith({ status: 'available' }),
    );
  });

  it('does not check availability while closed', () => {
    render(<EmbeddableConnectionWizard isOpen={false} namespace="test-project" />);

    expect(screen.queryByTestId('connection-wizard-loading')).toBeNull();
    expect(mockLoadRemote).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows the connection tearsheet while availability is checked', async () => {
    mockLoadRemote.mockReturnValue(new Promise(() => undefined));

    render(<EmbeddableConnectionWizard isOpen namespace="test-project" tearsheetStackLevel={2} />);

    expect(await screen.findByTestId('connection-wizard-loading-tearsheet')).toBeInTheDocument();
    const spinner = screen.getByTestId('connection-wizard-loading');
    expect(spinner).toBeInTheDocument();
    expect(spinner.getAttribute('style')).toBeNull();
    expect(document.querySelector('.pf-m-stack-level-2')).toBeInTheDocument();
  });

  it('invokes onClose when the loading tearsheet is dismissed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockLoadRemote.mockReturnValue(new Promise(() => undefined));

    render(<EmbeddableConnectionWizard isOpen namespace="test-project" onClose={onClose} />);

    await user.click(await screen.findByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledWith('cancelled');
  });

  it('keeps success notifications mounted after the wizard closes', async () => {
    const user = userEvent.setup();
    render(<StatefulWizardConsumer />);

    await user.click(await screen.findByRole('button', { name: 'Create connection' }));

    expect(await screen.findByText('closed')).toBeInTheDocument();
    expect(await screen.findByText('Connection created')).toBeInTheDocument();
    expect(screen.getByTestId('toast-notification-group')).toBeInTheDocument();
  });
});
