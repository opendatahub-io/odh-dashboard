import { act } from '@testing-library/react';
import axios from 'axios';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import useFetchDscStatus from '~/concepts/areas/useFetchDscStatus';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

const mockAxios = axios.get as jest.Mock;

describe('useFetchDscStatus', () => {
  it('should return successful dsc status', async () => {
    const mockedResponse = { data: mockDscStatus({}) };
    mockAxios.mockReturnValue(Promise.resolve(mockedResponse));

    const renderResult = testHook(useFetchDscStatus)();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsc/status`);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    //  wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockedResponse.data, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    //refresh
    mockAxios.mockReturnValue(Promise.resolve({ data: mockedResponse.data }));
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsc/status`);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle 404 as an error', async () => {
    const error = {
      response: {
        status: 404,
      },
    };

    mockAxios.mockReturnValue(Promise.reject(error));
    const renderResult = testHook(useFetchDscStatus)();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsc/status`);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsc/status`);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, true));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });

  it('should handle other errors and rethrow', async () => {
    const error = (message: string) => ({
      response: {
        data: {
          message,
        },
      },
    });

    mockAxios.mockReturnValue(Promise.reject(error('error1')));
    const renderResult = testHook(useFetchDscStatus)();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsc/status`);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, new Error('error1')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    // refresh
    mockAxios.mockReturnValue(Promise.reject(error('error2')));
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsc/status`);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
