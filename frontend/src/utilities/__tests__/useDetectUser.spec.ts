import axios from 'axios';
import { act, waitFor, renderHook } from '@testing-library/react';
import { StatusResponse } from '~/redux/types';
import { useAppDispatch } from '~/redux/hooks';
import useDetectUser from '~/utilities/useDetectUser';
import { getUserFulfilled, getUserPending, getUserRejected } from '~/redux/actions/actions';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

// Mock Axios
jest.mock('axios');

// Mock the useDispatch hook
jest.mock('~/redux/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

const useAppDispatchMock = useAppDispatch as jest.Mock;
const dispatchMock = jest.fn();

describe('useDetectUser', () => {
  it('should dispatch getUserPending and getUserFulfilled on successful API call', async () => {
    const statusResponseMock: StatusResponse = {
      kube: {
        currentContext: 'myContext',
        currentUser: {
          name: 'john_doe',
          token: 'myAuthToken',
        },
        namespace: 'myNamespace',
        userName: 'John Doe',
        clusterID: 'myClusterID',
        clusterBranding: 'My Cluster',
        isAdmin: true,
        isAllowed: true,
        serverURL: 'https://api.example.com',
        isImpersonating: false,
      },
    };

    // Mock axios.get to return a resolved promise with the statusResponseMock
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: statusResponseMock });
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
    (axios.get as jest.MockedFunction<typeof axios.get>).mockRejectedValueOnce({
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
  it('should cancel the API call when cancelled is true', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: {} });
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
