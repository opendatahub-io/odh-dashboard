import { act } from 'react';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import useConnections from '~/pages/projects/screens/detail/connections/useConnections';
import { getSecretsByLabel } from '~/api';
import { mockConnection } from '~/__mocks__/mockConnection';

jest.mock('~/api', () => ({
  getSecretsByLabel: jest.fn(),
}));

const mockGetSecretsByLabel = jest.mocked(getSecretsByLabel);

describe('useConnections', () => {
  it('should return all connections', async () => {
    const connectionsMock = [mockConnection({ name: 'foo' }), mockConnection({ name: 'bar' })];
    mockGetSecretsByLabel.mockResolvedValue(connectionsMock);
    const renderResult = testHook(useConnections)('ds-project-1');
    expect(mockGetSecretsByLabel).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockGetSecretsByLabel).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(connectionsMock, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    await act(() => renderResult.result.current[3]());
    expect(mockGetSecretsByLabel).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });
});
