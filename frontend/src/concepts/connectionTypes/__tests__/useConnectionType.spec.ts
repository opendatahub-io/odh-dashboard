import { act } from 'react';
import { standardUseFetchState, testHook } from '#~/__tests__/unit/testUtils/hooks';
import { fetchConnectionType } from '#~/services/connectionTypesService';
import { useConnectionType } from '#~/concepts/connectionTypes/useConnectionType';
import { mockConnectionTypeConfigMapObj } from '#~/__mocks__/mockConnectionType';

jest.mock('#~/services/connectionTypesService', () => ({
  fetchConnectionType: jest.fn(),
}));

const mockFetchConnectionType = jest.mocked(fetchConnectionType);

describe('useConnectionType', () => {
  it('should return connection type config map object when name is given', async () => {
    const configMapObjMock = mockConnectionTypeConfigMapObj({ name: 'test-connection-type' });
    mockFetchConnectionType.mockResolvedValue(configMapObjMock);
    const renderResult = testHook(useConnectionType)('test-connection-type');
    expect(mockFetchConnectionType).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(undefined, false, undefined));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockFetchConnectionType).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(configMapObjMock, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    await act(() => renderResult.result.current[3]());
    expect(mockFetchConnectionType).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle errors when name is empty', async () => {
    mockFetchConnectionType.mockRejectedValue(new Error('No connection type name'));
    const renderResult = testHook(useConnectionType)('test');
    expect(renderResult).hookToStrictEqual(standardUseFetchState(undefined));
    expect(renderResult).hookToHaveUpdateCount(1);
    //  wait for update
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(undefined, false, new Error('No connection type name')),
    );
    expect(mockFetchConnectionType).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);
    // refresh
    mockFetchConnectionType.mockRejectedValue(new Error('No connection type name-error2'));
    await act(() => renderResult.result.current[3]());
    expect(mockFetchConnectionType).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(undefined, false, new Error('No connection type name-error2')),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
