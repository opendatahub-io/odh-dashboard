import '@testing-library/jest-dom';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useHostRouteSync from '../useHostRouteSync';

const mockNavigate = jest.fn();
let mockLocation = { pathname: '/ai-hub/mcp-servers/registry', search: '' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

describe('useHostRouteSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = { pathname: '/ai-hub/mcp-servers/registry', search: '' };
  });

  it('does not navigate when window.location already matches the host location', () => {
    window.history.pushState({}, '', '/ai-hub/mcp-servers/registry');

    const { result } = renderHook(() => useHostRouteSync(), { wrapper: MemoryRouter });
    result.current();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates the host router when the remote pushed a new pathname', () => {
    window.history.pushState({}, '', '/ai-hub/mcp-servers/registry/my-server?workspace=team1');

    const { result } = renderHook(() => useHostRouteSync(), { wrapper: MemoryRouter });
    result.current();

    expect(mockNavigate).toHaveBeenCalledWith(
      '/ai-hub/mcp-servers/registry/my-server?workspace=team1',
      { replace: true },
    );
  });

  it('navigates when only the search string changed', () => {
    mockLocation = {
      pathname: '/ai-hub/mcp-servers/registry/my-server',
      search: '?workspace=team1',
    };
    window.history.pushState({}, '', '/ai-hub/mcp-servers/registry/my-server?workspace=team2');

    const { result } = renderHook(() => useHostRouteSync(), { wrapper: MemoryRouter });
    result.current();

    expect(mockNavigate).toHaveBeenCalledWith(
      '/ai-hub/mcp-servers/registry/my-server?workspace=team2',
      { replace: true },
    );
  });
});
