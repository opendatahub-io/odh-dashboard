/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import S3FileExplorer, {
  formatBytes,
  mapResultToItems,
  getBreadcrumbTrail,
} from '~/app/components/common/S3FileExplorer/S3FileExplorer';
import { isFolder } from '~/app/components/common/FileExplorer/FileExplorer';
import { getFiles } from '~/app/api/s3';
import { mockStorageSecret } from '~/__mocks__/mockSecretListItem';
import {
  mockS3ListObjectsResponse,
  mockS3EmptyResponse,
} from '~/__mocks__/mockS3ListObjectsResponse';

jest.mock('~/app/api/s3', () => ({
  getFiles: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/utilities/time', () => ({
  relativeTime: jest.fn(() => '2 days ago'),
}));

const mockGetFiles = jest.mocked(getFiles);

describe('S3FileExplorer', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectFiles = jest.fn();
  const defaultSecret = mockStorageSecret({ name: 'my-s3-secret' });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSelectFiles: mockOnSelectFiles,
    namespace: 'test-namespace',
    s3Secret: defaultSecret,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());
  });

  describe('initial load', () => {
    it('should fetch root files on mount when open with a secret', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
        expect.objectContaining({
          namespace: 'test-namespace',
          secretName: 'my-s3-secret',
          limit: 10,
        }),
      );
    });
    it('should render files from the S3 response', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('config.yaml')).toBeInTheDocument();
      });

      expect(screen.getByText('README.md')).toBeInTheDocument();
      // Folders from common_prefixes
      expect(screen.getByText('datasets')).toBeInTheDocument();
      expect(screen.getByText('results')).toBeInTheDocument();
      expect(screen.getByText('configs')).toBeInTheDocument();
    });
    it('should not fetch when no secret is provided', () => {
      render(<S3FileExplorer {...defaultProps} s3Secret={undefined} />);

      expect(mockGetFiles).not.toHaveBeenCalled();
    });
  });

  describe('empty state - no connection', () => {
    it('should show warning when no secret is provided', () => {
      render(<S3FileExplorer {...defaultProps} s3Secret={undefined} />);

      expect(screen.getByText('No connection selected')).toBeInTheDocument();
      expect(screen.getByText('Select a connection to browse its files.')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('should show bucket not configured error', async () => {
      mockGetFiles.mockRejectedValue(new Error('bucket is required'));

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Bucket not configured')).toBeInTheDocument();
      });
    });

    it('should show HTTPS required error for HTTP connections', async () => {
      mockGetFiles.mockRejectedValue(new Error('endpoint URL must use HTTPS scheme, got: http'));

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('S3 Connection must use HTTPS')).toBeInTheDocument();
      });
    });
    it('should show connection not found error', async () => {
      mockGetFiles.mockRejectedValue(new Error('not found'));

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Connection not found')).toBeInTheDocument();
      });
    });
    it('should show generic error for unknown failures', async () => {
      mockGetFiles.mockRejectedValue(new Error('network timeout'));

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });
  });

  describe('selectable extensions', () => {
    it('should mark files as unselectable when extension does not match', async () => {
      render(
        <S3FileExplorer
          {...defaultProps}
          selectableExtensions={['json']}
          unselectableReason="Only JSON files allowed"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('config.yaml')).toBeInTheDocument();
      });

      // config.yaml and README.md should not be selectable since they are not json
      const yamlRow = screen.getByTestId('file-explorer-row--config-yaml');
      const yamlRadio = yamlRow.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(yamlRadio).toBeDisabled();
    });
  });

  describe('source display', () => {
    it('should show the connection name as source', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('my-s3-secret')).toBeInTheDocument();
      });
    });
  });

  describe('modal lifecycle', () => {
    it('should not fetch when modal is closed', () => {
      render(<S3FileExplorer {...defaultProps} isOpen={false} />);

      expect(mockGetFiles).not.toHaveBeenCalled();
    });
  });

  describe('allowedSearchCharacters', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should strip "/" characters from search input before calling the API', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;

      // Type a value containing "/" characters
      fireEvent.change(searchInput, { target: { value: 'my/search/term' } });

      // Advance past the 300ms debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
        expect.objectContaining({
          search: 'mysearchterm',
        }),
      );
    });

    it('should pass the full search value when it contains no "/" characters', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'valid-query' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
        expect.objectContaining({
          search: 'valid-query',
        }),
      );
    });

    it('should render the search characters info icon', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('file-explorer-search-chars-info')).toBeInTheDocument();
    });
  });
});

describe('formatBytes', () => {
  it('should return "0 B" for zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
  it('should return "0 B" for negative values', () => {
    expect(formatBytes(-100)).toBe('0 B');
  });
  it('should return "0 B" for NaN', () => {
    expect(formatBytes(NaN)).toBe('0 B');
  });
  it('should return "0 B" for Infinity', () => {
    expect(formatBytes(Infinity)).toBe('0 B');
  });
  it('should format bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
  });
  it('should format kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });
  it('should format megabytes correctly', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });
  it('should format gigabytes correctly', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB');
  });
  it('should format terabytes correctly', () => {
    expect(formatBytes(1099511627776)).toBe('1.0 TB');
  });
  it('should format partial values with one decimal', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('mapResultToItems', () => {
  it('should map common_prefixes to folders', () => {
    const result = mockS3ListObjectsResponse({ contents: [] });
    const items = mapResultToItems(result);
    const folders = items.filter(isFolder);

    expect(folders).toHaveLength(3);
    expect(folders.map((f) => f.name)).toEqual(
      expect.arrayContaining(['configs', 'datasets', 'results']),
    );
  });
  it('should map contents to files with correct properties', () => {
    const result = mockS3ListObjectsResponse({ common_prefixes: [] });
    const items = mapResultToItems(result);

    const readme = items.find((f) => f.name === 'README.md');
    expect(readme).toBeDefined();
    expect(readme?.path).toBe('/README.md');
    expect(readme?.type).toBe('MD');
    expect(readme?.size).toBe('2.0 KB');
  });
  it('should sort items alphabetically by name', () => {
    const result = mockS3ListObjectsResponse();
    const items = mapResultToItems(result);
    const names = items.map((f) => f.name);

    expect(names).toEqual([...names].toSorted((a, b) => a.localeCompare(b)));
  });
  it('should mark root folder markers as hidden', () => {
    const result = mockS3ListObjectsResponse({
      common_prefixes: [{ prefix: '/' }, { prefix: '' }],
      contents: [],
    });
    const items = mapResultToItems(result);

    expect(items.every((i) => i.hidden)).toBe(true);
  });
  it('should treat keys ending with / as folder markers', () => {
    const result = mockS3ListObjectsResponse({
      common_prefixes: [],
      contents: [{ key: 'my-folder/', size: 0, last_modified: '', etag: '', storage_class: '' }],
    });
    const items = mapResultToItems(result);

    expect(items).toHaveLength(1);
    expect(isFolder(items[0])).toBe(true);
    expect(items[0].name).toBe('my-folder');
  });
  it('should return empty array for empty response', () => {
    const result = mockS3EmptyResponse();
    const items = mapResultToItems(result);

    expect(items).toEqual([]);
  });
  it('should filter selectable files by extension', () => {
    const result = mockS3ListObjectsResponse({ common_prefixes: [] });
    const items = mapResultToItems(result, { selectableExtensions: ['yaml'] });

    const yaml = items.find((f) => f.name === 'config.yaml');
    const md = items.find((f) => f.name === 'README.md');

    expect(yaml?.selectable).toBe(true);
    expect(md?.selectable).toBe(false);
  });
  it('should mark all files selectable when no extensions filter is provided', () => {
    const result = mockS3ListObjectsResponse({ common_prefixes: [] });
    const items = mapResultToItems(result);

    const files = items.filter((f) => !isFolder(f));
    expect(files.every((f) => f.selectable)).toBe(true);
  });
});

describe('getBreadcrumbTrail', () => {
  it('should return empty array for root path', () => {
    expect(getBreadcrumbTrail('/')).toEqual([]);
  });
  it('should return single folder for one-level path', () => {
    const trail = getBreadcrumbTrail('/datasets');

    expect(trail).toHaveLength(1);
    expect(trail[0]).toEqual({
      name: 'datasets',
      path: '/datasets',
      type: 'folder',
      items: 0,
    });
  });
  it('should return multiple folders for nested path', () => {
    const trail = getBreadcrumbTrail('/datasets/train/batch-1');

    expect(trail).toHaveLength(3);
    expect(trail[0]).toEqual(expect.objectContaining({ name: 'datasets', path: '/datasets' }));
    expect(trail[1]).toEqual(expect.objectContaining({ name: 'train', path: '/datasets/train' }));
    expect(trail[2]).toEqual(
      expect.objectContaining({ name: 'batch-1', path: '/datasets/train/batch-1' }),
    );
  });
  it('should build accumulated paths correctly', () => {
    const trail = getBreadcrumbTrail('/a/b/c');
    const paths = trail.map((f) => f.path);

    expect(paths).toEqual(['/a', '/a/b', '/a/b/c']);
  });
});
