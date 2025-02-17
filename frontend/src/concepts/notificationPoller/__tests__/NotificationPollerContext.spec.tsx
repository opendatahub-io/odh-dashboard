import React, { act } from 'react';
import { render, waitFor } from '@testing-library/react';
import {
  FinalNotificationPollerResponse,
  NotificationPollerContext,
  NotificationPollerContextProvider,
  NotificationPollerResponse,
} from '~/concepts/notificationPoller/NotificationPollerContext';
import useNotification from '~/utilities/useNotification';

jest.mock('~/utilities/useNotification', () => {
  const mock = {
    success: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => mock),
  };
});

const useNotificationMock = jest.mocked(useNotification);

const createCallbackMock = ({
  finalResponse,
  repollCount = 0,
}: {
  finalResponse: FinalNotificationPollerResponse;
  repollCount?: number;
}) => {
  const callbackMock = jest.fn();
  Array.from({ length: repollCount }).forEach(() =>
    callbackMock.mockResolvedValueOnce({ status: 'repoll' }),
  );
  callbackMock.mockResolvedValueOnce(finalResponse);
  return callbackMock;
};

const renderTestComponent = (callbackMocks: jest.Mock[], delayRepollMs = 0) => {
  const TestComponent = () => {
    const { watchForNotification } = React.useContext(NotificationPollerContext);

    React.useEffect(() => {
      act(() => {
        callbackMocks.forEach((callbackMock) =>
          watchForNotification({ callback: callbackMock, delayRepollMs }),
        );
      });
    }, [watchForNotification]);

    return null;
  };

  render(
    <NotificationPollerContextProvider>
      <TestComponent />
    </NotificationPollerContextProvider>,
  );
};

describe('NotificationPollerContextProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("should trigger 'success' notification", async () => {
    const finalResponse: FinalNotificationPollerResponse = {
      status: 'success',
      title: 'Success Title',
      message: 'Success Message',
    };

    const callbackMock = createCallbackMock({ finalResponse });

    renderTestComponent([callbackMock]);

    expect(callbackMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(useNotificationMock().success).toHaveBeenCalledWith(
        finalResponse.title,
        finalResponse.message,
        finalResponse.actions,
      );
    });
  });

  it("should trigger 'error' notification", async () => {
    const finalResponse: NotificationPollerResponse = {
      status: 'error',
      title: 'Error Title',
      message: 'Error Message',
      actions: [{ title: 'Action', onClick: jest.fn() }],
    };

    const callbackMock = createCallbackMock({ finalResponse });

    renderTestComponent([callbackMock]);

    expect(callbackMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(useNotificationMock().error).toHaveBeenCalledWith(
        finalResponse.title,
        finalResponse.message,
        finalResponse.actions,
      );
    });
  });

  it("should not do anything if the reported status is 'stop'", async () => {
    const callbackMock = createCallbackMock({ finalResponse: { status: 'stop' } });

    renderTestComponent([callbackMock]);

    expect(callbackMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      Object.values(useNotificationMock()).forEach((fn) => {
        expect(fn).not.toHaveBeenCalled();
      });
    });
  });

  it("should retry when response is 'repoll' with delay", async () => {
    jest.useFakeTimers();

    const repollCount = 3;
    const repollDelayMs = 1000;

    const finalResponse: NotificationPollerResponse = {
      status: 'success',
      title: 'Repoll with delay Success Title',
      message: 'Repoll with delay Success Message',
      actions: [{ title: 'Action', onClick: jest.fn() }],
    };

    const callbackMock = createCallbackMock({ finalResponse, repollCount });

    renderTestComponent([callbackMock], repollDelayMs);

    expect(callbackMock).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(repollCount * repollDelayMs);
    });

    await waitFor(
      () => {
        expect(callbackMock).toHaveBeenCalledTimes(repollCount + 1);
        expect(useNotificationMock().success).toHaveBeenCalledWith(
          finalResponse.title,
          finalResponse.message,
          finalResponse.actions,
        );
      },
      { timeout: (repollCount + 1) * repollDelayMs },
    );
  });

  it("should retry when response is 'repoll' (single callback)", async () => {
    const finalResponse: NotificationPollerResponse = {
      status: 'success',
      title: 'Repoll Success Title',
      message: 'Repoll Success Message',
      actions: [{ title: 'Action', onClick: jest.fn() }],
    };

    const callbackMock = createCallbackMock({ finalResponse, repollCount: 3 });

    renderTestComponent([callbackMock]);

    expect(callbackMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(4);
      expect(useNotificationMock().success).toHaveBeenCalledWith(
        finalResponse.title,
        finalResponse.message,
        finalResponse.actions,
      );
    });
  });

  it("should retry when response is 'repoll' (multiple callbacks)", async () => {
    const repollCounts = [1, 3, 5];

    const callbackMocks = repollCounts.map((repollCount) =>
      createCallbackMock({
        finalResponse: {
          status: 'success',
          title: `${repollCount}x Repoll Success Title`,
          message: `${repollCount}x Repoll Success Message`,
        },
        repollCount,
      }),
    );

    renderTestComponent(callbackMocks);

    repollCounts.forEach((_, index) => {
      expect(callbackMocks[index]).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      repollCounts.forEach((repollCount, index) => {
        expect(callbackMocks[index]).toHaveBeenCalledTimes(repollCount + 1);
        expect(useNotificationMock().success).toHaveBeenCalledTimes(3);
      });
    });
  });

  it('should propagate errors up to the caller', async () => {
    const error = new Error('Test error');
    const callbackMock = jest.fn().mockRejectedValueOnce(error);

    const TestComponent = () => {
      const { watchForNotification } = React.useContext(NotificationPollerContext);

      React.useEffect(() => {
        act(() => {
          watchForNotification({ callback: callbackMock })
            .then(() => {
              throw new Error('This should not be called');
            })
            .catch((e) => {
              expect(e).toBe(error);
            });
        });
      }, [watchForNotification]);

      return null;
    };

    render(
      <NotificationPollerContextProvider>
        <TestComponent />
      </NotificationPollerContextProvider>,
    );
  });
});
