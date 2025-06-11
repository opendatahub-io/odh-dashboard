import React, { act } from 'react';
import { render, waitFor } from '@testing-library/react';
import {
  FinalNotificationWatcherResponse,
  NotificationResponseStatus,
  NotificationWatcherContext,
  NotificationWatcherContextProvider,
  NotificationWatcherResponse,
} from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import useNotification from '#~/utilities/useNotification';

jest.mock('#~/utilities/useNotification', () => {
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
  finalResponse: FinalNotificationWatcherResponse;
  repollCount?: number;
}) => {
  const callbackMock = jest.fn();
  Array.from({ length: repollCount }).forEach(() =>
    callbackMock.mockResolvedValueOnce({ status: NotificationResponseStatus.REPOLL }),
  );
  callbackMock.mockResolvedValueOnce(finalResponse);
  return callbackMock;
};

const renderTestComponent = (callbackMocks: jest.Mock[], callbackDelay = 0) => {
  const TestComponent = () => {
    const { registerNotification } = React.useContext(NotificationWatcherContext);

    React.useEffect(() => {
      act(() => {
        callbackMocks.forEach((callbackMock) =>
          registerNotification({ callback: callbackMock, callbackDelay }),
        );
      });
    }, [registerNotification]);

    return null;
  };

  render(
    <NotificationWatcherContextProvider>
      <TestComponent />
    </NotificationWatcherContextProvider>,
  );
};

describe('NotificationWatcherContextProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("should trigger 'success' notification", async () => {
    const finalResponse: FinalNotificationWatcherResponse = {
      status: NotificationResponseStatus.SUCCESS,
      title: 'Success Title',
      message: 'Success Message',
    };

    const callbackMock = createCallbackMock({ finalResponse });

    renderTestComponent([callbackMock]);

    await waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1);
      expect(useNotificationMock().success).toHaveBeenCalledWith(
        finalResponse.title,
        finalResponse.message,
        finalResponse.actions,
      );
    });
  });

  it("should trigger 'error' notification", async () => {
    const finalResponse: NotificationWatcherResponse = {
      status: NotificationResponseStatus.ERROR,
      title: 'Error Title',
      message: 'Error Message',
      actions: [{ title: 'Action', onClick: jest.fn() }],
    };

    const callbackMock = createCallbackMock({ finalResponse });

    renderTestComponent([callbackMock]);

    await waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1);
      expect(useNotificationMock().error).toHaveBeenCalledWith(
        finalResponse.title,
        finalResponse.message,
        finalResponse.actions,
      );
    });
  });

  it("should not do anything if the reported status is 'stop'", async () => {
    const callbackMock = createCallbackMock({
      finalResponse: { status: NotificationResponseStatus.STOP },
    });

    renderTestComponent([callbackMock]);

    await waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1);
      Object.values(useNotificationMock()).forEach((fn) => {
        expect(fn).not.toHaveBeenCalled();
      });
    });
  });

  it("should retry when response is 'repoll' with delay", async () => {
    jest.useFakeTimers();

    const repollCount = 3;
    const callbackDelay = 1000;

    const finalResponse: NotificationWatcherResponse = {
      status: NotificationResponseStatus.SUCCESS,
      title: 'Repoll with delay Success Title',
      message: 'Repoll with delay Success Message',
      actions: [{ title: 'Action', onClick: jest.fn() }],
    };

    const callbackMock = createCallbackMock({ finalResponse, repollCount });

    renderTestComponent([callbackMock], callbackDelay);

    expect(callbackMock).toHaveBeenCalledTimes(0);

    act(() => {
      jest.advanceTimersByTime(repollCount * callbackDelay);
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
      { timeout: (repollCount + 1) * callbackDelay },
    );
  });

  it("should retry when response is 'repoll' (single callback)", async () => {
    const finalResponse: NotificationWatcherResponse = {
      status: NotificationResponseStatus.SUCCESS,
      title: 'Repoll Success Title',
      message: 'Repoll Success Message',
      actions: [{ title: 'Action', onClick: jest.fn() }],
    };

    const callbackMock = createCallbackMock({ finalResponse, repollCount: 3 });

    renderTestComponent([callbackMock]);

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
          status: NotificationResponseStatus.SUCCESS,
          title: `${repollCount}x Repoll Success Title`,
          message: `${repollCount}x Repoll Success Message`,
        },
        repollCount,
      }),
    );

    renderTestComponent(callbackMocks);

    await waitFor(() => {
      repollCounts.forEach((repollCount, index) => {
        expect(callbackMocks[index]).toHaveBeenCalledTimes(repollCount + 1);
        expect(useNotificationMock().success).toHaveBeenCalledTimes(3);
      });
    });
  });

  it('should not propagate errors up to the consumer', async () => {
    const error = new Error('Test error');
    const callbackMock = jest.fn().mockRejectedValueOnce(error);
    const errorTracker = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const TestComponent = () => {
      const { registerNotification } = React.useContext(NotificationWatcherContext);

      React.useEffect(() => {
        act(() => {
          try {
            registerNotification({ callback: callbackMock, callbackDelay: 0 });
          } catch (err) {
            errorTracker(err);
          }
        });
      }, [registerNotification]);

      return null;
    };

    render(
      <NotificationWatcherContextProvider>
        <TestComponent />
      </NotificationWatcherContextProvider>,
    );

    await waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1);
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.anything(), error);
    expect(errorTracker).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should catch errors thrown by callbackMock when handled properly', async () => {
    const error = new Error('Test error');
    const callbackMock = jest.fn().mockRejectedValueOnce(error);
    const errorTracker = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const TestComponent = () => {
      const { registerNotification } = React.useContext(NotificationWatcherContext);

      React.useEffect(() => {
        act(() => {
          registerNotification({
            callback: async () => {
              try {
                await callbackMock();
                return { status: NotificationResponseStatus.REPOLL };
              } catch (err) {
                errorTracker(err);
                return { status: NotificationResponseStatus.STOP };
              }
            },
            callbackDelay: 0,
          });
        });
      }, [registerNotification]);

      return null;
    };

    render(
      <NotificationWatcherContextProvider>
        <TestComponent />
      </NotificationWatcherContextProvider>,
    );

    await waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1);
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(errorTracker).toHaveBeenCalledWith(error);
    consoleErrorSpy.mockRestore();
  });
});
