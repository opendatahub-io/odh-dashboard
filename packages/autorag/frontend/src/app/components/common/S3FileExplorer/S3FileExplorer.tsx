// Modules -------------------------------------------------------------------->

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import { debounce } from 'es-toolkit';
import FileExplorer from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import type {
  Files,
  Source,
  Folder,
  FileExplorerEmptyStateConfig,
} from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import type { SecretListItem as ConnectionSecret, S3ListObjectsResult } from '~/app/types.ts';
import { getFiles } from '~/app/api/s3.ts';

// Globals -------------------------------------------------------------------->

const DEFAULT_PER_PAGE = 10;

const formatBytes = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Maps an S3ListObjectsResult to FileExplorer-compatible items. */
const mapResultToItems = (result: S3ListObjectsResult): Files => {
  const items: Files = [];

  if (Array.isArray(result.common_prefixes)) {
    for (const cp of result.common_prefixes) {
      // Mark root folders markers as hidden — "/" and "" are the bucket root
      const isRoot = cp.prefix === '/' || cp.prefix === '';
      const prefixPath = `/${cp.prefix.replace(/\/$/, '')}`;
      const name = prefixPath.split('/').filter(Boolean).pop() ?? prefixPath;
      const folder: Folder = {
        name,
        path: prefixPath,
        type: 'folder',
        items: 0,
        ...(isRoot && { hidden: true }),
        details: {
          ...{ Type: 'Folder' },
        },
      };
      items.push(folder);
    }
  }

  if (Array.isArray(result.contents)) {
    for (const obj of result.contents) {
      // Mark root folder markers as hidden
      if (obj.key === '/' || obj.key === '') {
        items.push({ name: '/', path: '/', type: 'folder', items: 0, hidden: true });
        continue;
      }
      // Skip keys that end with / (folder markers)
      if (obj.key.endsWith('/')) {
        const dirPath = `/${obj.key.replace(/\/$/, '')}`;
        const name = dirPath.split('/').filter(Boolean).pop() ?? dirPath;
        items.push({ name, path: dirPath, type: 'folder', items: 0 });
        continue;
      }

      const fullPath = `/${obj.key}`;
      const segments = obj.key.split('/');
      const fileName = segments.pop() ?? obj.key;
      const ext = fileName.includes('.') ? (fileName.split('.').pop() ?? '') : '';

      const sizeToRender = obj.size !== undefined ? formatBytes(obj.size) : undefined;
      const fileTypeToRender = ext.toLocaleUpperCase() || 'File';

      items.push({
        name: fileName,
        path: fullPath,
        type: fileTypeToRender,
        size: sizeToRender,
        details: {
          ...(obj.last_modified && {
            'Last Modified': (
              <Timestamp
                date={new Date(obj.last_modified)}
                tooltip={{
                  variant: TimestampTooltipVariant.default,
                }}
              >
                {relativeTime(Date.now(), new Date(obj.last_modified).getTime())}
              </Timestamp>
            ),
          }),
          // ...(obj.etag && { ETag: obj.etag }), // TODO [ Gustavo ] Omitting this metadata from rendering. Doesn't seem useful for AutoX use case
          // ...(obj.storage_class && { 'Storage Class': obj.storage_class }), // TODO [ Gustavo ] Omitting this metadata from rendering. Doesn't seem useful for AutoX use case
          ...(obj.size !== undefined && { Size: sizeToRender }),
          ...{ Type: fileTypeToRender },
        },
      });
    }
  }

  return items.toSorted((a, b) => a.name.localeCompare(b.name));
};

/** Builds the ordered breadcrumb trail from root to the given path. */
const getBreadcrumbTrail = (targetPath: string): Folder[] => {
  if (targetPath === '/') {
    return [];
  }
  const segments = targetPath.split('/').filter(Boolean);
  const trail: Folder[] = [];
  let accumulated = '';
  for (const seg of segments) {
    accumulated += `/${seg}`;
    trail.push({ name: seg, path: accumulated, type: 'folder', items: 0 });
  }
  return trail;
};

// Components ----------------------------------------------------------------->

interface S3FileExplorerProps {
  /** Optional unique identifier for the S3FileExplorer. */
  id?: string;

  /** Flag indicating whether the S3FileExplorer is open. */
  isOpen: boolean;

  /** Callback fired when the modal is closed via dismiss or cancel. */
  onClose: (_event: KeyboardEvent | React.MouseEvent | void) => void;

  /** Callback fired when the user confirms a file selection via the primary action. */
  onSelectFiles?: (files: Files) => void;

  /** The Kubernetes namespace used to scope S3 connection lookups. */
  namespace: string;

  /** The connection secret that provides S3 credentials and endpoint configuration. */
  s3Secret?: ConnectionSecret;
}
const S3FileExplorer: React.FC<S3FileExplorerProps> = ({
  id,
  isOpen,
  onClose,
  onSelectFiles,
  namespace,
  s3Secret,
}) => {
  // State -------------------------------------------------------------------->

  const secretName = s3Secret?.name;
  const bucket = '';

  const [filesToRender, setFilesToRender] = useState<Files>([]);
  const [foldersToRender, setFoldersToRender] = useState<Folder[]>([]);
  const sourceToRender: Source | undefined = s3Secret ? { name: s3Secret.name, bucket } : undefined;

  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [loadingToRender, setLoadingToRender] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [pageToRender, setPageToRender] = useState<number | undefined>(1);
  const [perPageToRender, setPerPageToRender] = useState<number | undefined>(DEFAULT_PER_PAGE);
  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');

  // Track continuation tokens per page for forward/backward navigation
  const continuationTokensRef = useRef<Map<number, string>>(new Map());
  const lastResultRef = useRef<S3ListObjectsResult | null>(null);
  const fetchIdRef = useRef(0);

  // Effects ------------------------------------------------------------------>

  const fetchPath = useCallback(
    (path: string, perPage: number, page: number, search?: string, continuationToken?: string) => {
      if (!secretName) {
        return;
      }
      setLoadingToRender(true);

      // Strip leading slash and ensure trailing slash so S3 treats it as a prefix
      const apiPath = path === '/' ? undefined : path.replace(/^\//, '').replace(/\/?$/, '/');
      const opts: { path?: string; search?: string; limit?: number; next?: string } = {
        limit: perPage,
      };
      if (apiPath) {
        opts.path = apiPath;
      }
      if (search) {
        opts.search = search;
      }
      if (continuationToken) {
        opts.next = continuationToken;
      }

      const requestId = ++fetchIdRef.current;

      getFiles('')(
        namespace,
        secretName,
        bucket,
        opts,
      )({ signal: new AbortController().signal })
        .then((result) => {
          if (fetchIdRef.current !== requestId) {
            return;
          }
          lastResultRef.current = result;
          const items = mapResultToItems(result);
          setFilesToRender(items);
          setHasNextPage(!!result.next_continuation_token);
          setFetchError(null);
          setLoadingToRender(false);
        })
        .catch((error: unknown) => {
          // TODO [ Gustavo ] Handle errors gracefully
          if (fetchIdRef.current !== requestId) {
            return;
          }
          setFilesToRender([]);
          setHasNextPage(false);
          setFetchError(error instanceof Error ? error : new Error('Unknown error'));
          setLoadingToRender(false);
        });
    },
    [namespace, secretName, bucket],
  );

  // Initial fetch on mount / when connection changes
  const connectionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!secretName) {
      return;
    }

    const connectionKey = `${namespace}/${secretName}`;
    if (connectionKeyRef.current === connectionKey) {
      return;
    }
    connectionKeyRef.current = connectionKey;

    // Reset state for the new connection
    setCurrentPath('/');
    setFoldersToRender([]);
    setSearchQuery('');
    setPageToRender(1);
    setPerPageToRender(DEFAULT_PER_PAGE);
    continuationTokensRef.current = new Map();
    lastResultRef.current = null;

    fetchPath('/', DEFAULT_PER_PAGE, 1);
  }, [secretName, namespace, fetchPath]);

  // Helpers ------------------------------------------------------------------>

  const navigateTo = (path: string, perPage: number) => {
    setCurrentPath(path);
    setFoldersToRender(getBreadcrumbTrail(path));
    setSearchQuery('');
    setPageToRender(1);
    continuationTokensRef.current = new Map();
    fetchPath(path, perPage, 1);
  };

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        const perPage = perPageToRender ?? DEFAULT_PER_PAGE;
        setPageToRender(1);
        continuationTokensRef.current = new Map();
        fetchPath(currentPath, perPage, 1, query || undefined);
      }, 300),
    [currentPath, perPageToRender, fetchPath],
  );

  // Cancel debounce on unmount
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  // Rendering ---------------------------------------------------------------->

  // TODO [ Gustavo ] Add an empty state if s3Connection is not passed in

  const errorEmptyState: { isEmpty: boolean; emptyStateProps?: FileExplorerEmptyStateConfig } =
    useMemo(() => {
      if (!fetchError) {
        return { isEmpty: false };
      }

      const { message } = fetchError;
      const secretNameToRender = <strong>{secretName ?? 'unknown'}</strong>;

      // TODO [ Gustavo ] Generally weak error handling: Add CommonErrorHandling strategy to AutoX BFF+UI

      if (message.includes('bucket is required')) {
        return {
          isEmpty: true,
          emptyStateProps: {
            status: 'danger',
            titleText: 'Bucket not configured',
            body: (
              <>
                A bucket is required for retrieving files from the connection. Configure{' '}
                {secretNameToRender} with a bucket.
              </>
            ),
          },
        };
      }

      if (message.includes('not found')) {
        return {
          isEmpty: true,
          emptyStateProps: {
            status: 'danger',
            titleText: 'Connection not found',
            body: (
              <>
                The connection {secretNameToRender} could not be found. Verify the connection exists
                and try again.
              </>
            ),
          },
        };
      }

      return {
        isEmpty: true,
        emptyStateProps: {
          status: 'danger',
          titleText: 'Something went wrong',
          body: <>An error occurred while retrieving files from connection: {secretNameToRender}</>,
        },
      };
    }, [fetchError, secretName]);

  return (
    <FileExplorer
      id={id}
      files={filesToRender}
      source={sourceToRender}
      folders={foldersToRender}
      isEmpty={errorEmptyState.isEmpty}
      emptyStateProps={errorEmptyState.emptyStateProps}
      loading={loadingToRender}
      page={pageToRender}
      perPage={perPageToRender}
      hasNextPage={hasNextPage}
      selection="radio"
      isOpen={isOpen}
      onClose={onClose}
      onFolderClick={(folder) => {
        navigateTo(folder.path, perPageToRender ?? DEFAULT_PER_PAGE);
      }}
      onNavigate={(folder) => {
        navigateTo(folder.path, perPageToRender ?? DEFAULT_PER_PAGE);
      }}
      onNavigateRoot={() => {
        navigateTo('/', perPageToRender ?? DEFAULT_PER_PAGE);
      }}
      onSearch={(query) => {
        setSearchQuery(query);
        debouncedSearch(query);
      }}
      onSetPage={(newPage) => {
        const perPage = perPageToRender ?? DEFAULT_PER_PAGE;
        const currentPage = pageToRender ?? 1;

        if (newPage > currentPage) {
          // Going forward: store the current result's next token for this page transition
          const nextToken = lastResultRef.current?.next_continuation_token;
          if (nextToken) {
            continuationTokensRef.current.set(newPage, nextToken);
          }
        }

        setPageToRender(newPage);

        if (newPage === 1) {
          // First page: no continuation token needed
          fetchPath(currentPath, perPage, newPage, searchQuery || undefined);
        } else {
          const token = continuationTokensRef.current.get(newPage);
          fetchPath(currentPath, perPage, newPage, searchQuery || undefined, token);
        }
      }}
      onPerPageSelect={(newPerPage) => {
        setPerPageToRender(newPerPage);
        setPageToRender(1);
        continuationTokensRef.current = new Map();
        fetchPath(currentPath, newPerPage, 1, searchQuery || undefined);
      }}
      onPrimary={(files) => {
        onSelectFiles?.(files);
      }}
    />
  );
};

// Public --------------------------------------------------------------------->

export default S3FileExplorer;

// Private -------------------------------------------------------------------->
