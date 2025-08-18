import { act } from 'react';
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import axios from '#~/utilities/axios';
import { mockDsciStatus } from '#~/__mocks__/mockDsciStatus';
import useFetchDsciStatus from '#~/concepts/areas/useFetchDsciStatus';

jest.mock('#~/utilities/axios', () => ({
  get: jest.fn(),
}));

const mockAxios = jest.mocked(axios.get);

describe('useFetchDscStatus', () => {
  it('should return successful dsci status', async () => {
    const mockedResponse = { data: mockDsciStatus({}) };
    mockAxios.mockResolvedValue(mockedResponse);

    const renderResult = testHook(useFetchDsciStatus)();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsci/status`);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    //  wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockedResponse.data, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    //refresh
    mockAxios.mockResolvedValue({ data: mockedResponse.data });
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsci/status`);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle 404 as an error', async () => {
    const error = {
      response: {
        status: 404,
      },
    };

    mockAxios.mockRejectedValue(error);
    const renderResult = testHook(useFetchDsciStatus)();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsci/status`);
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
    expect(axios.get).toHaveBeenCalledWith(`/api/dsci/status`);
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

    mockAxios.mockRejectedValue(error('error1'));
    const renderResult = testHook(useFetchDsciStatus)();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsci/status`);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, new Error('error1')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    // refresh
    mockAxios.mockRejectedValue(error('error2'));
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith(`/api/dsci/status`);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
