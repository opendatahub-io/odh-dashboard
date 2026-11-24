import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { getInstance, init, loadRemote, registerRemotes } from '@module-federation/runtime';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import EmbeddableConnectionWizard from '~/app/components/EmbeddableConnectionWizard';
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

const mockGetInstance = jest.mocked(getInstance);
const mockInit = jest.mocked(init);
const mockRegisterRemotes = jest.mocked(registerRemotes);
const mockLoadRemote = jest.mocked(loadRemote);
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

const RemoteWizard = () => <div data-testid="remote-connection-wizard" />;

describe('EmbeddableConnectionWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInstance.mockReturnValue(null);
    mockInit.mockReturnValue({} as ReturnType<typeof init>);
    mockRegisterRemotes.mockReturnValue(undefined);
    mockLoadRemote.mockResolvedValue({ default: RemoteWizard });
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: null,
      featureFlags: null,
      reliantAreas: null,
      requiredCapabilities: null,
      requiredComponents: null,
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
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

    expect(await screen.findByTestId('remote-connection-wizard')).toBeInTheDocument();
    expect(mockInit).toHaveBeenCalledWith({
      name: 'connectionWizardConsumer',
      remotes: [{ name: 'dataConnectHub', entry: '/_mf/dataConnectHub/remoteEntry.js' }],
    });
    expect(mockLoadRemote).toHaveBeenCalledWith('dataConnectHub/EmbeddableCreateConnectionWizard');
    expect(global.fetch).toHaveBeenCalledWith('/data-connect-hub/api/v1/backend-health', {
      signal: expect.any(AbortSignal),
    });
    await waitFor(() => expect(onAvailabilityChange).toHaveBeenCalledWith({ status: 'available' }));
  });

  it('renders the fallback without remote or backend checks when the feature is disabled', () => {
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
      />,
    );

    expect(screen.getByTestId('legacy-connection-modal')).toBeInTheDocument();
    expect(mockLoadRemote).not.toHaveBeenCalled();
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
});
