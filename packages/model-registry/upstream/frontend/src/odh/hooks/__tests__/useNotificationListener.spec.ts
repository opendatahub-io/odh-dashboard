import { createElement } from 'react';
import type { Context } from 'react';
import type { Notification } from 'mod-arch-core';
import { AlertVariant } from '@patternfly/react-core';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { useNotificationListener } from '~/odh/hooks/useNotificationListener';

const NOTIFICATION_BRIDGE_EVENT = 'odh-notification-bridge';

jest.mock('mod-arch-core', () => {
  const { createContext } = jest.requireActual<typeof import('react')>('react');
  const ctx = createContext(null);
  return {
    __esModule: true,
    NotificationContext: ctx,
    __mockContext: ctx,
  };
});

function getNotificationContext(): Context<unknown> {
  return (
    jest.requireMock('mod-arch-core') as typeof import('mod-arch-core') & {
      __mockContext: Context<unknown>;
    }
  ).__mockContext;
}

function createNotification(id: number, title: string): Notification {
  return {
    id,
    status: AlertVariant.success,
    title,
    timestamp: new Date('2026-01-01T00:00:00Z'),
    message: `Message for ${title}`,
  };
}

type ContextState = { notifications: Notification[] };

function createWrapper(state: ContextState) {
  const NotificationContext = getNotificationContext();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    createElement(
      NotificationContext.Provider,
      {
        value: {
          notifications: state.notifications,
          notificationCount: state.notifications.length,
          updateNotificationCount: jest.fn(),
          dispatch: jest.fn(),
        },
      },
      children,
    );
  return Wrapper;
}

describe('useNotificationListener', () => {
  let dispatchedEvents: CustomEvent[];

  beforeEach(() => {
    dispatchedEvents = [];

    const originalDispatchEvent = window.dispatchEvent.bind(window);
    jest.spyOn(window, 'dispatchEvent').mockImplementation((event: Event) => {
      if (event.type === NOTIFICATION_BRIDGE_EVENT) {
        dispatchedEvents.push(event as CustomEvent);
      }
      return originalDispatchEvent(event);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should bridge new notifications as CustomEvents', () => {
    const state: ContextState = { notifications: [createNotification(0, 'First')] };

    renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(1);
    expect(dispatchedEvents[0].detail.title).toBe('First');
  });

  it('should not re-bridge already-bridged notifications on rerender', () => {
    const state: ContextState = { notifications: [createNotification(0, 'First')] };

    const renderResult = renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(1);
    expect(renderResult).hookToHaveUpdateCount(1);

    renderResult.rerender(undefined);

    expect(dispatchedEvents).toHaveLength(1);
  });

  it('should bridge only new notifications when more are added', () => {
    const first = createNotification(0, 'First');
    const state: ContextState = { notifications: [first] };

    const renderResult = renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(1);

    // Preserve reference to existing notification (matches real reducer behavior)
    state.notifications = [first, createNotification(1, 'Second')];
    renderResult.rerender(undefined);

    expect(dispatchedEvents).toHaveLength(2);
    expect(dispatchedEvents[1].detail.title).toBe('Second');
  });

  it('should not skip notifications when a notification is deleted and a new one is added', () => {
    const n0 = createNotification(0, 'N0');
    const n1 = createNotification(1, 'N1');
    const n2 = createNotification(2, 'N2');
    const state: ContextState = { notifications: [n0, n1, n2] };

    const renderResult = renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(3);

    // Delete n1 and add a new one — same array length as before
    state.notifications = [n0, n2, createNotification(3, 'N3-new')];
    renderResult.rerender(undefined);

    expect(dispatchedEvents).toHaveLength(4);
    expect(dispatchedEvents[3].detail.title).toBe('N3-new');
  });

  it('should not skip notifications when the array shrinks then grows back', () => {
    const n0 = createNotification(0, 'N0');
    const n1 = createNotification(1, 'N1');
    const n2 = createNotification(2, 'N2');
    const state: ContextState = { notifications: [n0, n1, n2] };

    const renderResult = renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(3);

    // Shrink: delete one notification
    state.notifications = [n0, n2];
    renderResult.rerender(undefined);

    expect(dispatchedEvents).toHaveLength(3);

    // Grow back: add a new notification
    state.notifications = [n0, n2, createNotification(3, 'N3')];
    renderResult.rerender(undefined);

    expect(dispatchedEvents).toHaveLength(4);
    expect(dispatchedEvents[3].detail.title).toBe('N3');
  });

  it('should bridge notifications with duplicate IDs from different hook instances', () => {
    const fromArchiveModal = createNotification(0, 'Model archived');
    const state: ContextState = { notifications: [fromArchiveModal] };

    const renderResult = renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(1);
    expect(dispatchedEvents[0].detail.title).toBe('Model archived');

    // A different useNotification instance produces the same id=0
    const fromJobContext = createNotification(0, 'Transfer job succeeded');
    state.notifications = [fromArchiveModal, fromJobContext];
    renderResult.rerender(undefined);

    expect(dispatchedEvents).toHaveLength(2);
    expect(dispatchedEvents[1].detail.title).toBe('Transfer job succeeded');
  });

  it('should skip notifications with hidden=true', () => {
    const state: ContextState = {
      notifications: [{ ...createNotification(0, 'Hidden'), hidden: true }],
    };

    renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(0);
  });

  it('should bridge notifications even without an id', () => {
    const noIdNotification: Notification = {
      status: AlertVariant.info,
      title: 'No ID',
      timestamp: new Date('2026-01-01T00:00:00Z'),
    };
    const state: ContextState = { notifications: [noIdNotification] };

    renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(1);
    expect(dispatchedEvents[0].detail.title).toBe('No ID');
  });

  it('should include link data when linkUrl and linkLabel are present', () => {
    const state: ContextState = {
      notifications: [
        {
          ...createNotification(0, 'With Link'),
          linkUrl: '/some/path',
          linkLabel: 'Click here',
          messageText: 'Link message text',
        },
      ],
    };

    renderHook(() => useNotificationListener(), {
      wrapper: createWrapper(state),
    });

    expect(dispatchedEvents).toHaveLength(1);
    expect(dispatchedEvents[0].detail).toEqual(
      expect.objectContaining({
        linkUrl: '/some/path',
        linkLabel: 'Click here',
        message: 'Link message text',
      }),
    );
  });
});
