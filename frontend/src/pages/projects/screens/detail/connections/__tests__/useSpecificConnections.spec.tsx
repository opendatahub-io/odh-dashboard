import { waitFor } from '@testing-library/dom';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockConnection } from '#~/__mocks__/mockConnection';
import useConnections from '#~/pages/projects/screens/detail/connections/useConnections';
import usePipelinesConnections from '#~/pages/projects/screens/detail/connections/usePipelinesConnections';

jest.mock('#~/pages/projects/screens/detail/connections/useConnections');
const mockUseConnections = jest.mocked(useConnections);

describe('usePipelinesConnections', () => {
  it('should return only pipelines compatible connections', async () => {
    mockUseConnections.mockReturnValue({
      data: [
        mockConnection({ name: 'foo' }),
        mockConnection({ name: 'bar', connectionType: 'random' }),
      ],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    const renderResult = testHook(usePipelinesConnections)('ds-project-1');

    waitFor(() => {
      expect(renderResult).hookToStrictEqual({
        connections: [mockConnection({ name: 'foo' })],
        connectionsLoadError: undefined,
        connectionsLoaded: true,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });
    });
  });
});
