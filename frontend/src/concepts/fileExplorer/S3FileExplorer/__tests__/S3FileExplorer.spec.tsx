/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import S3FileExplorer, {
  getBreadcrumbTrail,
} from '#~/concepts/fileExplorer/S3FileExplorer/S3FileExplorer';
import {
  mockS3ListObjectsResponse,
  mockS3PaginatedResponse,
  mockDatasetsPrefixes,
  mockDatasetsObjects,
  mockDatasetsTrainObjects,
} from '#~/concepts/fileExplorer/__mocks__/mockS3ListObjectsResponse';
import { getFiles } from '#~/concepts/fileExplorer/api/s3.ts';

jest.mock('#~/concepts/fileExplorer/api/s3.ts', () => ({
  getFiles: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/utilities/time', () => ({
  relativeTime: jest.fn(() => '2 days ago'),
}));

const mockGetFiles = jest.mocked(getFiles);

describe('S3FileExplorer', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectFiles = jest.fn();

  const defaultProps = {
    apiPath: '',
    isOpen: true,
    onClose: mockOnClose,
    onSelectFiles: mockOnSelectFiles,
    namespace: 'test-namespace',
    s3SecretName: 'my-s3-secret',
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
      render(<S3FileExplorer {...defaultProps} s3SecretName={undefined} />);

      expect(mockGetFiles).not.toHaveBeenCalled();
    });
  });

  describe('empty state - no connection', () => {
    it('should show warning when no secret is provided', () => {
      render(<S3FileExplorer {...defaultProps} s3SecretName={undefined} />);

      expect(screen.getByText('No connection selected')).toBeInTheDocument();
      expect(screen.getByText('Select a connection to browse its files.')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it.each([
      {
        name: 'AutoML BFF message',
        message:
          'bucket parameter is required either as a query parameter or as AWS_S3_BUCKET in the secret',
      },
      {
        name: 'AutoRAG BFF message',
        message: 'bucket is required either as a query parameter or as AWS_S3_BUCKET in the secret',
      },
    ])('should show bucket not configured error for $name', async ({ message }) => {
      mockGetFiles.mockRejectedValue(new Error(message));

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Bucket not configured')).toBeInTheDocument();
      });
    });

    it.each([
      {
        name: 'BFF message with external endpoints qualifier',
        message: 'endpoint URL must use HTTPS scheme for external endpoints, got: http',
      },
      {
        name: 'BFF message without qualifier',
        message: 'endpoint URL must use HTTPS scheme, got: http',
      },
    ])('should show HTTPS required error for $name', async ({ message }) => {
      mockGetFiles.mockRejectedValue(new Error(message));

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('S3 Connection must use HTTPS')).toBeInTheDocument();
      });
    });
    it('should show S3 endpoint unreachable error', async () => {
      mockGetFiles.mockRejectedValue(new Error('Unable to connect to the S3 storage endpoint'));

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('S3 endpoint unreachable')).toBeInTheDocument();
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

  describe('folder navigation', () => {
    it('should fetch files with the folder path when a folder is clicked', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Mock the response for the datasets folder
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      // Click the "datasets" folder link inside its row
      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      const folderLink = within(datasetsRow).getByRole('button', { name: 'datasets' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
        expect.objectContaining({
          namespace: 'test-namespace',
          secretName: 'my-s3-secret',
          path: 'datasets/',
          limit: 10,
        }),
      );
    });

    it('should fetch root files when the root breadcrumb is clicked', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Navigate into a folder first
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      const folderLink = within(datasetsRow).getByRole('button', { name: 'datasets' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Now click the root breadcrumb to go back
      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      const rootBreadcrumb = screen.getByTestId('file-explorer-breadcrumb-root');
      fireEvent.click(rootBreadcrumb);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Root fetch should not have a path param
      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
        expect.objectContaining({
          namespace: 'test-namespace',
          secretName: 'my-s3-secret',
          limit: 10,
        }),
      );
      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.not.objectContaining({ path: expect.anything() }),
      );
    });

    it('should reset pagination when navigating to a folder', async () => {
      // Start with a paginated response so we're on page > 1
      mockGetFiles.mockResolvedValue(mockS3PaginatedResponse());

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Navigate into a folder — pagination should reset to page 1 with no continuation token
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      const folderLink = within(datasetsRow).getByRole('button', { name: 'datasets' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Should not include a continuation token (next) when navigating to a new folder
      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.not.objectContaining({ next: expect.anything() }),
      );
    });

    it('should update the breadcrumb trail when navigating into a folder', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      const folderLink = within(datasetsRow).getByRole('button', { name: 'datasets' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(screen.getByTestId('file-explorer-breadcrumb-current')).toHaveTextContent(
          'datasets',
        );
      });
    });
  });

  describe('pagination', () => {
    it('should use continuation token when going to the next page', async () => {
      mockGetFiles.mockResolvedValue(mockS3PaginatedResponse());

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // The paginated response has next_continuation_token: '10'
      // Click "next page" in the pagination controls
      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      const pagination = screen.getByTestId('file-explorer-pagination');
      const nextPageButton = within(pagination).getByRole('button', {
        name: 'Go to next page',
      });
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
        expect.objectContaining({
          next: '10',
        }),
      );
    });

    it('should not send a continuation token when going back to page 1', async () => {
      mockGetFiles.mockResolvedValue(mockS3PaginatedResponse());

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Go to page 2
      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      const pagination = screen.getByTestId('file-explorer-pagination');
      const nextPageButton = within(pagination).getByRole('button', {
        name: 'Go to next page',
      });
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Go back to page 1
      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      const prevPageButton = within(pagination).getByRole('button', {
        name: 'Go to previous page',
      });
      fireEvent.click(prevPageButton);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Page 1 should not include a continuation token
      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.not.objectContaining({ next: expect.anything() }),
      );
    });

    it('should reset to page 1 when changing perPage', async () => {
      mockGetFiles.mockResolvedValue(mockS3PaginatedResponse());

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Go to page 2 first
      mockGetFiles.mockClear();
      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      const pagination = screen.getByTestId('file-explorer-pagination');
      const nextPageButton = within(pagination).getByRole('button', {
        name: 'Go to next page',
      });
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Change perPage — open the per-page toggle (the button that shows "X - Y of Z")
      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      const paginationNav = screen.getByTestId('file-explorer-pagination');
      // The per-page toggle is the menu toggle button inside the pagination (not the nav arrows)
      const perPageToggle = within(paginationNav).getByRole('button', {
        name: /\d+ - \d+/,
      });
      fireEvent.click(perPageToggle);

      // Select 20 per page from the dropdown
      const perPage20Option = screen.getByText('20 per page');
      fireEvent.click(perPage20Option);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.objectContaining({
          limit: 20,
        }),
      );
      // Should reset to page 1 — no continuation token
      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.not.objectContaining({ next: expect.anything() }),
      );
    });
  });

  describe('connection change', () => {
    it('should trigger a new fetch when the secret prop changes', async () => {
      const { rerender } = render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.objectContaining({ secretName: 'my-s3-secret' }),
      );
      mockGetFiles.mockClear();

      // Change the secret
      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      rerender(<S3FileExplorer {...defaultProps} s3SecretName="other-secret" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.objectContaining({ secretName: 'other-secret' }),
      );
    });

    it('should trigger a new fetch when the namespace prop changes', async () => {
      const { rerender } = render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.objectContaining({ namespace: 'test-namespace' }),
      );
      mockGetFiles.mockClear();

      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      rerender(<S3FileExplorer {...defaultProps} namespace="other-namespace" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.objectContaining({ namespace: 'other-namespace' }),
      );
    });
  });

  describe('modal reset', () => {
    it('should reset state when the modal is closed and reopened', async () => {
      const { rerender } = render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Verify files are rendered
      expect(screen.getByText('config.yaml')).toBeInTheDocument();
      mockGetFiles.mockClear();

      // Close the modal
      rerender(<S3FileExplorer {...defaultProps} isOpen={false} />);

      // Reopen the modal — should trigger a fresh fetch
      mockGetFiles.mockResolvedValue(mockS3ListObjectsResponse());

      rerender(<S3FileExplorer {...defaultProps} isOpen />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Verify files are rendered again from the fresh fetch
      expect(screen.getByText('config.yaml')).toBeInTheDocument();
    });
  });

  describe('folder selection', () => {
    it('should mark children as forceShowAsSelected when viewing a selected folder', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Select the "datasets" folder by clicking its row
      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      fireEvent.click(datasetsRow);

      // Now navigate into the datasets folder
      mockGetFiles.mockClear();
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      const folderLink = within(datasetsRow).getByRole('button', { name: 'datasets' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Wait for the folder's contents to render
      await waitFor(() => {
        expect(screen.getByText('metadata.json')).toBeInTheDocument();
      });

      // The child files should be shown as selected (forceShowAsSelected)
      // which means their radio/checkbox should be checked and disabled
      const metadataRow = screen.getByTestId('file-explorer-row--datasets-metadata-json');
      const metadataRadio = metadataRow.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(metadataRadio).toBeChecked();
      expect(metadataRadio).toBeDisabled();
    });

    it('should clear folder selection when a non-folder file is selected', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Select the "datasets" folder
      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      fireEvent.click(datasetsRow);

      // Verify folder is selected
      const datasetsRadio = within(datasetsRow).getByRole('radio');
      expect(datasetsRadio).toBeChecked();

      // Now select a regular file (config.yaml) — this should clear the folder selection
      const configRow = screen.getByTestId('file-explorer-row--config-yaml');
      const configRadio = within(configRow).getByRole('radio');
      fireEvent.click(configRadio);

      // The folder selection should be cleared — datasets folder should no longer be selected
      expect(datasetsRadio).not.toBeChecked();
    });
  });

  describe('secret removal', () => {
    it('should reset state when the secret is removed after being connected', async () => {
      const { rerender } = render(<S3FileExplorer {...defaultProps} />);

      // Wait for the initial fetch with the secret
      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Verify files are rendered
      expect(screen.getByText('config.yaml')).toBeInTheDocument();

      // Remove the secret — should trigger resetState via the effect (line 349-350)
      rerender(<S3FileExplorer {...defaultProps} s3SecretName={undefined} />);

      // State should be reset — files should be gone, "No connection selected" should show
      expect(screen.queryByText('config.yaml')).not.toBeInTheDocument();
      expect(screen.getByText('No connection selected')).toBeInTheDocument();
    });
  });

  describe('same-connection skip', () => {
    it('should not re-fetch when rerendered with the same connection props', async () => {
      const { rerender } = render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Rerender with the exact same props — should NOT trigger another fetch
      rerender(<S3FileExplorer {...defaultProps} />);

      // Still only 1 call — no additional fetch
      expect(mockGetFiles).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch after unmount and remount with the same connection', async () => {
      const { unmount } = render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      unmount();

      mockGetFiles.mockResolvedValueOnce(mockS3ListObjectsResponse());

      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(2);
      });
    });

    it('should re-fetch when apiPath changes even if namespace/secret/bucket stay the same', async () => {
      const { rerender } = render(<S3FileExplorer {...defaultProps} apiPath="/v1/s3" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      mockGetFiles.mockResolvedValueOnce(mockS3ListObjectsResponse());

      rerender(<S3FileExplorer {...defaultProps} apiPath="/v2/s3" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('fetch race-condition guards', () => {
    it('should not set error state when fetch is aborted', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      mockGetFiles.mockRejectedValueOnce(abortError);

      render(<S3FileExplorer {...defaultProps} />);

      // Wait for the rejection to be processed
      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Give React time to process the rejection
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });

      // Should NOT show any error state — AbortError is silently ignored (line 307-308)
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByText('Bucket not configured')).not.toBeInTheDocument();
    });

    it('should ignore stale fetch results when a newer fetch has started', async () => {
      // Create a controllable promise for the initial fetch
      let resolveStale!: (value: ReturnType<typeof mockS3ListObjectsResponse>) => void;
      const staleFetchPromise = new Promise<ReturnType<typeof mockS3ListObjectsResponse>>(
        (resolve) => {
          resolveStale = resolve;
        },
      );
      mockGetFiles.mockReturnValueOnce(staleFetchPromise);

      const { rerender } = render(<S3FileExplorer {...defaultProps} />);

      // Wait for the first fetch to be called
      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // While the first fetch is still pending, change the connection (secret)
      // to trigger a new fetch — this increments fetchIdRef, making the first fetch stale
      const newResponse = mockS3ListObjectsResponse({
        common_prefixes: [],
        contents: [
          {
            key: 'new-file.txt',
            size: 200,
            last_modified: '2026-01-01T00:00:00Z',
            etag: '',
            storage_class: '',
          },
        ],
      });
      mockGetFiles.mockResolvedValueOnce(newResponse);

      rerender(<S3FileExplorer {...defaultProps} s3SecretName="other-secret" />);

      // Wait for the second fetch to complete and render
      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => {
        expect(screen.getByText('new-file.txt')).toBeInTheDocument();
      });

      // Now resolve the stale first fetch — its result should be ignored (line 293-294)
      await act(async () => {
        resolveStale(mockS3ListObjectsResponse());
      });

      // The UI should still show the second fetch's results, not the stale first fetch's
      expect(screen.getByText('new-file.txt')).toBeInTheDocument();
      expect(screen.queryByText('config.yaml')).not.toBeInTheDocument();
      expect(screen.queryByText('README.md')).not.toBeInTheDocument();
    });

    it('should ignore errors from a stale fetch', async () => {
      // Create a controllable promise for the initial fetch that will reject
      let rejectStale!: (error: Error) => void;
      const staleFetchPromise = new Promise<ReturnType<typeof mockS3ListObjectsResponse>>(
        (_resolve, reject) => {
          rejectStale = reject;
        },
      );
      mockGetFiles.mockReturnValueOnce(staleFetchPromise);

      const { rerender } = render(<S3FileExplorer {...defaultProps} />);

      // Wait for the first fetch to be called
      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // While the first fetch is still pending, change the connection to trigger a new fetch
      // — this increments fetchIdRef, making the first fetch stale
      mockGetFiles.mockResolvedValueOnce(
        mockS3ListObjectsResponse({
          common_prefixes: [],
          contents: [
            {
              key: 'success.txt',
              size: 50,
              last_modified: '2026-01-01T00:00:00Z',
              etag: '',
              storage_class: '',
            },
          ],
        }),
      );

      rerender(<S3FileExplorer {...defaultProps} s3SecretName="other-secret" />);

      // Wait for the second fetch to succeed
      await waitFor(() => {
        expect(screen.getByText('success.txt')).toBeInTheDocument();
      });

      // Now reject the stale first fetch — its error should be ignored (line 310-311)
      await act(async () => {
        rejectStale(new Error('network timeout'));
      });

      // The UI should still show the successful result, not an error
      expect(screen.getByText('success.txt')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('disabledPaths prop', () => {
    it('should mark a disabled folder as unselectable', async () => {
      render(<S3FileExplorer {...defaultProps} disabledPaths={['/datasets']} />);

      await waitFor(() => {
        expect(screen.getByText('datasets')).toBeInTheDocument();
      });

      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      const radio = datasetsRow.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(radio).toBeDisabled();
    });

    it('should render a disabled folder name as plain text instead of a link', async () => {
      render(<S3FileExplorer {...defaultProps} disabledPaths={['/datasets']} />);

      await waitFor(() => {
        expect(screen.getByText('datasets')).toBeInTheDocument();
      });

      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      expect(
        within(datasetsRow).queryByRole('button', { name: 'datasets' }),
      ).not.toBeInTheDocument();
    });

    it('should not disable folders that do not match disabledPaths', async () => {
      render(<S3FileExplorer {...defaultProps} disabledPaths={['/datasets']} />);

      await waitFor(() => {
        expect(screen.getByText('results')).toBeInTheDocument();
      });

      // "results" folder should still be selectable and navigable
      const resultsRow = screen.getByTestId('file-explorer-row--results');
      const radio = resultsRow.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(radio).not.toBeDisabled();
      expect(within(resultsRow).getByRole('button', { name: 'results' })).toBeInTheDocument();
    });

    it('should prevent navigation into a disabled folder', async () => {
      render(<S3FileExplorer {...defaultProps} disabledPaths={['/datasets']} />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // The folder link should not be rendered, but even if handleNavigate is
      // called directly (e.g. via onFolderClick), it should be a no-op.
      // Verify no additional fetch occurs by clicking the row (which selects, not navigates)
      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      fireEvent.click(datasetsRow);

      expect(mockGetFiles).not.toHaveBeenCalled();
    });

    it('should disable a nested folder only when browsed into the matching parent', async () => {
      // disabledPaths=["/datasets/train"] should NOT disable a top-level "train" folder
      // but SHOULD disable "train" when inside /datasets
      render(<S3FileExplorer {...defaultProps} disabledPaths={['/datasets/train']} />);

      await waitFor(() => {
        expect(screen.getByText('datasets')).toBeInTheDocument();
      });

      // "datasets" at root should NOT be disabled
      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      const datasetsRadio = datasetsRow.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(datasetsRadio).not.toBeDisabled();
      expect(within(datasetsRow).getByRole('button', { name: 'datasets' })).toBeInTheDocument();

      // Navigate into datasets
      mockGetFiles.mockClear();
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      const folderLink = within(datasetsRow).getByRole('button', { name: 'datasets' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Now "train" inside /datasets should be disabled
      await waitFor(() => {
        expect(screen.getByText('train')).toBeInTheDocument();
      });

      const trainRow = screen.getByTestId('file-explorer-row--datasets-train');
      const trainRadio = trainRow.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(trainRadio).toBeDisabled();
      expect(within(trainRow).queryByRole('button', { name: 'train' })).not.toBeInTheDocument();
    });

    it('should not show "Select folder" in the overflow menu for a disabled folder', async () => {
      render(<S3FileExplorer {...defaultProps} disabledPaths={['/datasets']} />);

      await waitFor(() => {
        expect(screen.getByText('datasets')).toBeInTheDocument();
      });

      // Open the overflow menu on the disabled folder row
      const datasetsRow = screen.getByTestId('file-explorer-row--datasets');
      const kebab = within(datasetsRow).getByRole('button', {
        name: /actions/i,
      });
      fireEvent.click(kebab);

      // "View details" should still be available
      expect(screen.getByText('View details')).toBeInTheDocument();
      // "Select folder" should NOT be available
      expect(screen.queryByText('Select folder')).not.toBeInTheDocument();
    });
  });

  describe('clear selection', () => {
    it('should clear all selected files and disable the button when clicked', async () => {
      render(<S3FileExplorer {...defaultProps} selection="checkbox" />);

      await waitFor(() => {
        expect(screen.getByText('config.yaml')).toBeInTheDocument();
      });

      // Select two files
      const configRow = screen.getByTestId('file-explorer-row--config-yaml');
      fireEvent.click(configRow);
      const readmeRow = screen.getByTestId('file-explorer-row--README-md');
      fireEvent.click(readmeRow);

      // Both should be checked
      expect(within(configRow).getByRole('checkbox')).toBeChecked();
      expect(within(readmeRow).getByRole('checkbox')).toBeChecked();

      // Clear selection button should be enabled
      const clearButton = screen.getByTestId('file-explorer-clear-all-selections');
      expect(clearButton).not.toBeDisabled();
      fireEvent.click(clearButton);

      // All checkboxes should be unchecked
      expect(within(configRow).getByRole('checkbox')).not.toBeChecked();
      expect(within(readmeRow).getByRole('checkbox')).not.toBeChecked();
    });
  });

  describe('rootPath prop', () => {
    it('should fetch from the rootPath on mount instead of /', async () => {
      render(<S3FileExplorer {...defaultProps} rootPath="/datasets" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
        expect.objectContaining({
          path: 'datasets/',
        }),
      );
    });

    it('should navigate to rootPath (not /) when root breadcrumb is clicked', async () => {
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      render(<S3FileExplorer {...defaultProps} rootPath="/datasets" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Navigate into a subfolder
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: [],
          contents: mockDatasetsTrainObjects(),
        }),
      );

      const trainRow = screen.getByTestId('file-explorer-row--datasets-train');
      const folderLink = within(trainRow).getByRole('button', { name: 'train' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });
      mockGetFiles.mockClear();

      // Click root breadcrumb — should go back to rootPath, not /
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      const rootBreadcrumb = screen.getByTestId('file-explorer-breadcrumb-root');
      fireEvent.click(rootBreadcrumb);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.objectContaining({
          path: 'datasets/',
        }),
      );
    });

    it('should strip rootPath segments from the breadcrumb trail', async () => {
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      render(<S3FileExplorer {...defaultProps} rootPath="/datasets" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // At the rootPath level, no breadcrumb folders should be shown
      expect(screen.queryByTestId('file-explorer-breadcrumb-current')).not.toBeInTheDocument();

      // Navigate into a subfolder
      mockGetFiles.mockClear();
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: [],
          contents: mockDatasetsTrainObjects(),
        }),
      );

      const trainRow = screen.getByTestId('file-explorer-row--datasets-train');
      const folderLink = within(trainRow).getByRole('button', { name: 'train' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Only "train" should appear as a breadcrumb — "datasets" is the root and should be stripped
      await waitFor(() => {
        expect(screen.getByTestId('file-explorer-breadcrumb-current')).toHaveTextContent('train');
      });
    });

    it('should show custom search placeholder derived from rootPath folder name', async () => {
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      render(<S3FileExplorer {...defaultProps} rootPath="/datasets" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // At root level (no breadcrumb folders), the search placeholder should mention the root folder name
      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;
      expect(searchInput).toHaveAttribute('placeholder', "Search within 'datasets'");
    });

    it('should not show custom search placeholder when navigated into a subfolder', async () => {
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: mockDatasetsPrefixes(),
          contents: mockDatasetsObjects(),
        }),
      );

      render(<S3FileExplorer {...defaultProps} rootPath="/datasets" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Navigate into a subfolder
      mockGetFiles.mockClear();
      mockGetFiles.mockResolvedValue(
        mockS3ListObjectsResponse({
          common_prefixes: [],
          contents: mockDatasetsTrainObjects(),
        }),
      );

      const trainRow = screen.getByTestId('file-explorer-row--datasets-train');
      const folderLink = within(trainRow).getByRole('button', { name: 'train' });
      fireEvent.click(folderLink);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Inside a subfolder, placeholder should show the current folder name
      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;
      expect(searchInput).toHaveAttribute('placeholder', "Search within 'train'");
    });

    it('should treat rootPath="/" the same as no rootPath', async () => {
      render(<S3FileExplorer {...defaultProps} rootPath="/" />);

      await waitFor(() => {
        expect(mockGetFiles).toHaveBeenCalledTimes(1);
      });

      // Should fetch from root (no path param) just like without rootPath
      expect(mockGetFiles).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.not.objectContaining({ path: expect.anything() }),
      );
    });
  });

  describe('selection prop', () => {
    it('should default to radio selection mode', async () => {
      render(<S3FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('config.yaml')).toBeInTheDocument();
      });

      const configRow = screen.getByTestId('file-explorer-row--config-yaml');
      expect(configRow.querySelector('input[type="radio"]')).toBeInTheDocument();
    });

    it('should use checkbox selection mode when selection="checkbox"', async () => {
      render(<S3FileExplorer {...defaultProps} selection="checkbox" />);

      await waitFor(() => {
        expect(screen.getByText('config.yaml')).toBeInTheDocument();
      });

      const configRow = screen.getByTestId('file-explorer-row--config-yaml');
      expect(configRow.querySelector('input[type="checkbox"]')).toBeInTheDocument();
    });
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
