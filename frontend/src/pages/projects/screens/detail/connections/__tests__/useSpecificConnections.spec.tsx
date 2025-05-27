import { waitFor } from '@testing-library/dom';
import { mockConnection } from '~/__mocks__/mockConnection';
import useConnections from '~/pages/projects/screens/detail/connections/useConnections';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import usePipelinesConnections from '~/pages/projects/screens/detail/connections/usePipelinesConnections';
import useServingConnections from '~/pages/projects/screens/detail/connections/useServingConnections';

jest.mock('~/pages/projects/screens/detail/connections/useConnections');
const mockUseConnections = jest.mocked(useConnections);

describe('useServingConnections', () => {
  it('should return only serving compatible connections', async () => {
    mockUseConnections.mockReturnValue({
      data: [
        mockConnection({ name: 'foo', connectionType: 'uri-v1' }),
        mockConnection({ name: 'bar', connectionType: 'random' }),
      ],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    const renderResult = testHook(useServingConnections)('ds-project-1');

    waitFor(() => {
      expect(renderResult).hookToStrictEqual({
        connections: [mockConnection({ name: 'foo', connectionType: 'uri-v1' })],
        connectionsLoadError: undefined,
        connectionsLoaded: true,
        initialNewConnectionType: undefined,
        initialNewConnectionValues: {},
      });
    });
  });
});

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
