import { act } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import axios from '@odh-dashboard/ui-core/utilities/axios';
import { StatusResponse } from '#~/redux/types';
import { useAppDispatch } from '#~/redux/hooks';
import useDetectUser from '#~/utilities/useDetectUser';
import { getUserFulfilled, getUserPending, getUserRejected } from '#~/redux/actions/actions';
import { POLL_INTERVAL } from '#~/utilities/const';

// Mock Axios
jest.mock('@odh-dashboard/ui-core/utilities/axios');

// Mock the useDispatch hook
jest.mock('#~/redux/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

const useAppDispatchMock = jest.mocked(useAppDispatch);
const dispatchMock = jest.fn();

const createStatusResponse = (): StatusResponse => ({
  kube: {
    currentContext: 'myContext',
    currentUser: {
      name: 'john_doe',
      token: 'myAuthToken',
    },
    namespace: 'myNamespace',
    userName: 'John Doe',
    userID: '1234',
    clusterID: 'myClusterID',
    clusterBranding: 'My Cluster',
    isAdmin: true,
    isAllowed: true,
    serverURL: 'https://api.example.com',
    isImpersonating: false,
  },
});

describe('useDetectUser', () => {
  it('should dispatch getUserPending and getUserFulfilled on successful API call', async () => {
    const statusResponseMock = createStatusResponse();

    // Mock axios.get to return a resolved promise with the statusResponseMock
    jest.mocked(axios.get).mockResolvedValueOnce({ data: statusResponseMock });
    useAppDispatchMock.mockReturnValueOnce(dispatchMock);

    // Render the component with the hook
    testHook(useDetectUser)();

    // Wait for the asynchronous operations to complete
    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(getUserPending());
      expect(dispatchMock).toHaveBeenCalledWith(getUserFulfilled(statusResponseMock));
    });
  });

  it('should dispatch getUserPending and getUserRejected on failed API call', async () => {
    const testError = new Error('Test error');
    // Mock axios.get to return a rejected promise with the errorResponseMock
    jest.mocked(axios.get).mockRejectedValueOnce({
      response: { data: testError },
    });
    useAppDispatchMock.mockReturnValueOnce(dispatchMock);

    // Render the component with the hook
    testHook(useDetectUser)();

    // Wait for the asynchronous operations to complete
    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(getUserPending());
      expect(dispatchMock).toHaveBeenCalledWith(getUserRejected(testError));
    });
  });

  it('should handle network errors and retry the API call', async () => {
    const testError = new Error('Network error');
    const rejectedAction = getUserRejected(testError);
    jest.mocked(axios.get).mockRejectedValueOnce(testError).mockRejectedValueOnce(testError);
    useAppDispatchMock.mockReturnValueOnce(dispatchMock);
    jest.useFakeTimers();

    const { unmount } = renderHook(() => useDetectUser());

    try {
      await waitFor(() => {
        expect(dispatchMock).toHaveBeenCalledWith(rejectedAction);
      });

      expect(axios.get).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(POLL_INTERVAL);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(dispatchMock).toHaveBeenCalledTimes(3);
        expect(dispatchMock).toHaveBeenNthCalledWith(3, rejectedAction);
      });
    } finally {
      unmount();
      jest.useRealTimers();
    }
  });

  it('should preserve the user state during transient network errors after a successful API call', async () => {
    const statusResponseMock = createStatusResponse();
    const testError = new Error('Network error');
    jest
      .mocked(axios.get)
      .mockResolvedValueOnce({ data: statusResponseMock })
      .mockRejectedValueOnce(testError)
      .mockResolvedValueOnce({ data: statusResponseMock });
    useAppDispatchMock.mockReturnValueOnce(dispatchMock);
    jest.useFakeTimers();

    const { unmount } = renderHook(() => useDetectUser());

    try {
      await waitFor(() => {
        expect(dispatchMock).toHaveBeenCalledWith(getUserFulfilled(statusResponseMock));
      });

      act(() => {
        jest.advanceTimersByTime(POLL_INTERVAL);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
      expect(dispatchMock).not.toHaveBeenCalledWith(getUserRejected(expect.anything()));

      act(() => {
        jest.advanceTimersByTime(POLL_INTERVAL);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(3);
        expect(dispatchMock).toHaveBeenCalledTimes(3);
        expect(dispatchMock).toHaveBeenNthCalledWith(3, getUserFulfilled(statusResponseMock));
      });
    } finally {
      unmount();
      jest.useRealTimers();
    }
  });

  it('should dispatch getUserRejected for HTTP errors after a successful API call', async () => {
    const statusResponseMock = createStatusResponse();
    const testError = new Error('Unauthorized');
    const rejectedAction = getUserRejected(testError);
    jest
      .mocked(axios.get)
      .mockResolvedValueOnce({ data: statusResponseMock })
      .mockRejectedValueOnce({ response: { data: testError } });
    useAppDispatchMock.mockReturnValueOnce(dispatchMock);
    jest.useFakeTimers();

    const { unmount } = renderHook(() => useDetectUser());

    try {
      await waitFor(() => {
        expect(dispatchMock).toHaveBeenCalledWith(getUserFulfilled(statusResponseMock));
      });

      act(() => {
        jest.advanceTimersByTime(POLL_INTERVAL);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(dispatchMock).toHaveBeenCalledTimes(3);
        expect(dispatchMock).toHaveBeenNthCalledWith(1, getUserPending());
        expect(dispatchMock).toHaveBeenNthCalledWith(2, getUserFulfilled(statusResponseMock));
        expect(dispatchMock).toHaveBeenNthCalledWith(3, rejectedAction);
      });
    } finally {
      unmount();
      jest.useRealTimers();
    }
  });

  it('should reject malformed responses after a successful API call', async () => {
    const statusResponseMock = createStatusResponse();
    const rejectedAction = getUserRejected(new Error('Unable to process user status response'));
    jest
      .mocked(axios.get)
      .mockResolvedValueOnce({ data: statusResponseMock })
      .mockResolvedValueOnce({ data: { kube: null } });
    useAppDispatchMock.mockReturnValueOnce(dispatchMock);
    jest.useFakeTimers();

    const { unmount } = renderHook(() => useDetectUser());

    try {
      await waitFor(() => {
        expect(dispatchMock).toHaveBeenCalledWith(getUserFulfilled(statusResponseMock));
      });

      act(() => {
        jest.advanceTimersByTime(POLL_INTERVAL);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(dispatchMock).toHaveBeenCalledTimes(3);
        expect(dispatchMock).toHaveBeenNthCalledWith(1, getUserPending());
        expect(dispatchMock).toHaveBeenNthCalledWith(2, getUserFulfilled(statusResponseMock));
        expect(dispatchMock).toHaveBeenNthCalledWith(3, rejectedAction);
      });
    } finally {
      unmount();
      jest.useRealTimers();
    }
  });

  it('should cancel the API call when cancelled is true', async () => {
    jest.mocked(axios.get).mockResolvedValueOnce({ data: {} });
    useAppDispatchMock.mockReturnValueOnce(dispatchMock);

    // Act
    const { unmount } = renderHook(() => useDetectUser());
    act(() => unmount());

    // Wait for the asynchronous operations to complete
    await waitFor(() => {
      // Assert that dispatchMock is called with getUserPending
      expect(dispatchMock).toHaveBeenCalledWith(getUserPending());
      // Assert that dispatchMock is not called with getUserFulfilled
      expect(dispatchMock).not.toHaveBeenCalledWith(getUserRejected(expect.anything()));
    });
  });
});
