import { renderHook, act } from '@testing-library/react';
import { useBrowserStorage } from 'mod-arch-core';

import { useMCPToolSelections } from '~/app/hooks/useMCPToolSelections';

// Mock the useBrowserStorage hook from mod-arch-core
jest.mock('mod-arch-core', () => ({
  useBrowserStorage: jest.fn(),
}));

const mockUseBrowserStorage = useBrowserStorage as jest.MockedFunction<typeof useBrowserStorage>;

describe('useMCPToolSelections', () => {
  let mockSelections: Record<string, Record<string, string[]>>;
  let mockSetSelections: jest.Mock;

  beforeEach(() => {
    mockSelections = {};
    mockSetSelections = jest.fn((updater) => {
      if (typeof updater === 'function') {
        mockSelections = updater(mockSelections);
      } else {
        mockSelections = updater;
      }
    });

    mockUseBrowserStorage.mockReturnValue([mockSelections, mockSetSelections]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getToolSelections', () => {
    it('returns undefined for non-existent namespace', () => {
      const { result } = renderHook(() => useMCPToolSelections());

      const selections = result.current.getToolSelections(
        'non-existent-namespace',
        'http://server.com',
      );

      expect(selections).toBeUndefined();
    });

    it('returns undefined for non-existent server URL', () => {
      mockSelections = {
        'test-namespace': {
          'http://other-server.com': ['tool1', 'tool2'],
        },
      };
      mockUseBrowserStorage.mockReturnValue([mockSelections, mockSetSelections]);

      const { result } = renderHook(() => useMCPToolSelections());

      const selections = result.current.getToolSelections(
        'test-namespace',
        'http://non-existent.com',
      );

      expect(selections).toBeUndefined();
    });

    it('returns empty getToolSelections result when storage is empty', () => {
      const { result } = renderHook(() => useMCPToolSelections());

      const selections = result.current.getToolSelections('test-namespace', 'http://server.com');

      expect(selections).toBeUndefined();
    });
  });

  describe('saveToolSelections', () => {
    it('creates namespace and server mapping on first save', () => {
      const { result } = renderHook(() => useMCPToolSelections());

      act(() => {
        result.current.saveToolSelections('test-namespace', 'http://server.com', [
          'tool1',
          'tool2',
        ]);
      });

      expect(mockSetSelections).toHaveBeenCalledWith({
        'test-namespace': {
          'http://server.com': ['tool1', 'tool2'],
        },
      });
    });

    it('stores empty array correctly (no tools allowed)', () => {
      const { result } = renderHook(() => useMCPToolSelections());

      act(() => {
        result.current.saveToolSelections('test-namespace', 'http://server.com', []);
      });

      expect(mockSetSelections).toHaveBeenCalledWith({
        'test-namespace': {
          'http://server.com': [],
        },
      });
    });

    it('stores array of tool names', () => {
      const { result } = renderHook(() => useMCPToolSelections());

      act(() => {
        result.current.saveToolSelections('test-namespace', 'http://server.com', [
          'tool1',
          'tool2',
          'tool3',
        ]);
      });

      expect(mockSetSelections).toHaveBeenCalledWith({
        'test-namespace': {
          'http://server.com': ['tool1', 'tool2', 'tool3'],
        },
      });
    });

    it('deletes server entry when passing undefined', () => {
      mockSelections = {
        'test-namespace': {
          'http://server.com': ['tool1', 'tool2'],
        },
      };
      mockUseBrowserStorage.mockReturnValue([mockSelections, mockSetSelections]);

      const { result } = renderHook(() => useMCPToolSelections());

      act(() => {
        result.current.saveToolSelections('test-namespace', 'http://server.com', undefined);
      });

      expect(mockSetSelections).toHaveBeenCalledWith({
        'test-namespace': {},
      });
    });

    it('overwrites previous selections when updating', () => {
      mockSelections = {
        'test-namespace': {
          'http://server.com': ['tool1', 'tool2'],
        },
      };
      mockUseBrowserStorage.mockReturnValue([mockSelections, mockSetSelections]);

      const { result } = renderHook(() => useMCPToolSelections());

      act(() => {
        result.current.saveToolSelections('test-namespace', 'http://server.com', [
          'tool3',
          'tool4',
        ]);
      });

      expect(mockSetSelections).toHaveBeenCalledWith({
        'test-namespace': {
          'http://server.com': ['tool3', 'tool4'],
        },
      });
    });

    it('keeps namespaces isolated (namespace A does not affect namespace B)', () => {
      mockSelections = {
        'namespace-a': {
          'http://server.com': ['toolA1', 'toolA2'],
        },
      };
      mockUseBrowserStorage.mockReturnValue([mockSelections, mockSetSelections]);

      const { result } = renderHook(() => useMCPToolSelections());

      act(() => {
        result.current.saveToolSelections('namespace-b', 'http://server.com', ['toolB1', 'toolB2']);
      });

      expect(mockSetSelections).toHaveBeenCalledWith({
        'namespace-a': {
          'http://server.com': ['toolA1', 'toolA2'],
        },
        'namespace-b': {
          'http://server.com': ['toolB1', 'toolB2'],
        },
      });
    });

    it('stores multiple servers per namespace independently', () => {
      mockSelections = {
        'test-namespace': {
          'http://server1.com': ['tool1'],
        },
      };
      mockUseBrowserStorage.mockReturnValue([mockSelections, mockSetSelections]);

      const { result } = renderHook(() => useMCPToolSelections());

      act(() => {
        result.current.saveToolSelections('test-namespace', 'http://server2.com', ['tool2']);
      });

      expect(mockSetSelections).toHaveBeenCalledWith({
        'test-namespace': {
          'http://server1.com': ['tool1'],
          'http://server2.com': ['tool2'],
        },
      });
    });

    it('deletes middle server while keeping others intact', () => {
      mockSelections = {
        'test-namespace': {
          'http://server1.com': ['tool1'],
          'http://server2.com': ['tool2'],
          'http://server3.com': ['tool3'],
        },
      };
      mockUseBrowserStorage.mockReturnValue([mockSelections, mockSetSelections]);

      const { result } = renderHook(() => useMCPToolSelections());

      act(() => {
        result.current.saveToolSelections('test-namespace', 'http://server2.com', undefined);
      });

      expect(mockSetSelections).toHaveBeenCalledWith({
        'test-namespace': {
          'http://server1.com': ['tool1'],
          'http://server3.com': ['tool3'],
        },
      });
    });
  });
});
