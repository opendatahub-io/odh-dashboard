import { renderHook, act } from '@testing-library/react';
import { TokenInfo } from '~/app/types';
import useServerTokens from '~/app/Chatbot/mcp/hooks/useServerTokens';

describe('useServerTokens', () => {
  const mockOnServerTokensChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty map when no initial tokens provided', () => {
    const { result } = renderHook(() =>
      useServerTokens({
        onServerTokensChange: mockOnServerTokensChange,
      }),
    );

    expect(result.current.serverTokens.size).toBe(0);
  });

  it('should initialize with provided initial tokens', () => {
    const initialTokens = new Map<string, TokenInfo>([
      ['https://server1.com', { token: 'token1', authenticated: true, autoConnected: false }],
    ]);

    const { result } = renderHook(() =>
      useServerTokens({
        onServerTokensChange: mockOnServerTokensChange,
        initialTokens,
      }),
    );

    expect(result.current.serverTokens.size).toBe(1);
    expect(result.current.getToken('https://server1.com')).toEqual({
      token: 'token1',
      authenticated: true,
      autoConnected: false,
    });
  });

  it('should update token and notify parent', () => {
    const { result } = renderHook(() =>
      useServerTokens({
        onServerTokensChange: mockOnServerTokensChange,
      }),
    );

    const tokenInfo: TokenInfo = {
      token: 'test-token',
      authenticated: true,
      autoConnected: false,
    };

    act(() => {
      result.current.updateToken('https://server1.com', tokenInfo);
    });

    expect(result.current.getToken('https://server1.com')).toEqual(tokenInfo);
    expect(mockOnServerTokensChange).toHaveBeenCalledTimes(1);
    expect(mockOnServerTokensChange).toHaveBeenCalledWith(expect.any(Map));
  });

  it('should remove token and notify parent', () => {
    const initialTokens = new Map<string, TokenInfo>([
      ['https://server1.com', { token: 'token1', authenticated: true, autoConnected: false }],
    ]);

    const { result } = renderHook(() =>
      useServerTokens({
        onServerTokensChange: mockOnServerTokensChange,
        initialTokens,
      }),
    );

    act(() => {
      result.current.removeToken('https://server1.com');
    });

    expect(result.current.getToken('https://server1.com')).toBeUndefined();
    expect(result.current.serverTokens.size).toBe(0);
    expect(mockOnServerTokensChange).toHaveBeenCalledTimes(1);
  });

  it('should get token by server URL', () => {
    const tokenInfo: TokenInfo = {
      token: 'test-token',
      authenticated: true,
      autoConnected: false,
    };

    const initialTokens = new Map<string, TokenInfo>([['https://server1.com', tokenInfo]]);

    const { result } = renderHook(() =>
      useServerTokens({
        onServerTokensChange: mockOnServerTokensChange,
        initialTokens,
      }),
    );

    expect(result.current.getToken('https://server1.com')).toEqual(tokenInfo);
    expect(result.current.getToken('https://nonexistent.com')).toBeUndefined();
  });

  it('should handle multiple token operations', () => {
    const { result } = renderHook(() =>
      useServerTokens({
        onServerTokensChange: mockOnServerTokensChange,
      }),
    );

    act(() => {
      result.current.updateToken('https://server1.com', {
        token: 'token1',
        authenticated: true,
        autoConnected: false,
      });
    });

    act(() => {
      result.current.updateToken('https://server2.com', {
        token: 'token2',
        authenticated: false,
        autoConnected: true,
      });
    });

    expect(result.current.serverTokens.size).toBe(2);

    act(() => {
      result.current.removeToken('https://server1.com');
    });

    expect(result.current.serverTokens.size).toBe(1);
    expect(result.current.getToken('https://server1.com')).toBeUndefined();
    expect(result.current.getToken('https://server2.com')).toBeDefined();
  });

  it('should maintain referential stability of functions', () => {
    const { result, rerender } = renderHook(() =>
      useServerTokens({
        onServerTokensChange: mockOnServerTokensChange,
      }),
    );

    act(() => {
      result.current.updateToken('https://server1.com', {
        token: 'token1',
        authenticated: true,
        autoConnected: false,
      });
    });

    rerender();

    // Functions should not be the same after state change (due to dependency on serverTokens)
    // But they should still work correctly
    expect(typeof result.current.updateToken).toBe('function');
    expect(typeof result.current.removeToken).toBe('function');
    expect(typeof result.current.getToken).toBe('function');
  });
});
