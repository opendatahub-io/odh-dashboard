import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { MaaSEndpointFieldWizardField } from '~/odh/modelServingExtensions/modelDeploymentWizard/MaaSEndpointCheckbox';
import {
  fireMaaSPublishTrackingEvent,
  markMaaSPublishSubmitAttempted,
  resetMaaSPublishTrackingSession,
  updateMaaSPublishTrackingSession,
} from '~/odh/modelServingExtensions/modelDeploymentWizard/maasPublishTracking';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

// The registered externalDataHook is the React injection boundary; the radio
// component alone does not establish this wiring.
const useMaaSPublishTrackingSession = MaaSEndpointFieldWizardField.externalDataHook!;

const renderSession = (trackEvent: jest.Mock) =>
  renderHook((deps?: { addedAsMaas: boolean }) => useMaaSPublishTrackingSession(deps), {
    wrapper: ({ children }) => (
      <TrackingProvider trackEvent={trackEvent}>
        <MemoryRouter>{children}</MemoryRouter>
      </TrackingProvider>
    ),
  });

describe('MaaSEndpointCheckbox externalDataHook tracking', () => {
  const originalPathname = window.location.pathname;

  beforeEach(() => {
    resetMaaSPublishTrackingSession();
    window.history.replaceState({}, '', '/ai-hub/models/deployments/deploy');
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalPathname);
    resetMaaSPublishTrackingSession();
  });

  it('should deliver the publish event to the host-supplied callback on wizard exit', () => {
    const trackEvent = jest.fn();
    const { rerender, unmount } = renderSession(trackEvent);

    // Update the pending session state through the wizard lifecycle helpers.
    rerender({ addedAsMaas: true });
    markMaaSPublishSubmitAttempted();
    expect(trackEvent).not.toHaveBeenCalled();

    // Leaving the wizard route before unmount ends the session with submit/error.
    window.history.replaceState({}, '', '/ai-hub/models');
    unmount();

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Model as Maas Published', {
      outcome: 'submit',
      success: false,
      source: 'deployment_wizard',
      addedAsMaas: true,
      mode: 'create',
    });
  });

  it('should use the replacement callback without resetting pending session state', () => {
    const first = jest.fn();
    const replacement = jest.fn();
    // The host provider value can change across rerenders; the lifecycle effect must
    // re-run start with the new callback identity so the session stores it, while
    // preserving its pending state.
    let current = first;
    const { rerender, unmount } = renderHook(
      (deps?: { addedAsMaas: boolean }) => useMaaSPublishTrackingSession(deps),
      {
        wrapper: ({ children }) => (
          <TrackingProvider trackEvent={current}>
            <MemoryRouter>{children}</MemoryRouter>
          </TrackingProvider>
        ),
      },
    );

    rerender({ addedAsMaas: true });
    markMaaSPublishSubmitAttempted();

    current = replacement;
    rerender({ addedAsMaas: true });

    window.history.replaceState({}, '', '/ai-hub/models');
    unmount();

    expect(first).not.toHaveBeenCalled();
    expect(replacement).toHaveBeenCalledTimes(1);
    expect(replacement).toHaveBeenCalledWith('Model as Maas Published', {
      outcome: 'submit',
      success: false,
      source: 'deployment_wizard',
      addedAsMaas: true,
      mode: 'create',
    });
  });

  it('should not re-emit after completion when the callback is replaced', () => {
    const first = jest.fn();
    const replacement = jest.fn();
    let current = first;
    const { rerender, unmount } = renderHook(
      (deps?: { addedAsMaas: boolean }) => useMaaSPublishTrackingSession(deps),
      {
        wrapper: ({ children }) => (
          <TrackingProvider trackEvent={current}>
            <MemoryRouter>{children}</MemoryRouter>
          </TrackingProvider>
        ),
      },
    );

    rerender({ addedAsMaas: true });
    // Complete the session with an emitted success event.
    fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true);
    expect(first).toHaveBeenCalledTimes(1);

    current = replacement;
    rerender({ addedAsMaas: true });

    window.history.replaceState({}, '', '/ai-hub/models');
    unmount();

    expect(first).toHaveBeenCalledTimes(1);
    expect(replacement).not.toHaveBeenCalled();
  });

  it('should not emit when the field deactivates while still on the wizard route', () => {
    const trackEvent = jest.fn();
    const { unmount } = renderSession(trackEvent);

    updateMaaSPublishTrackingSession(true);
    unmount();

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
