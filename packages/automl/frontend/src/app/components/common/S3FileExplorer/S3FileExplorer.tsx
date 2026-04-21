// Modules -------------------------------------------------------------------->

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import { debounce } from 'es-toolkit';
import FileExplorer, { isFolder } from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import type {
  Files,
  Source,
  Folder,
  FileExplorerEmptyStateConfig,
} from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import type { SecretListItem as ConnectionSecret, S3ListObjectsResponse } from '~/app/types.ts';
import { getFiles, type GetFilesOptions } from '~/app/api/s3.ts';

// Globals -------------------------------------------------------------------->

const DEFAULT_PER_PAGE = 10;

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Maps an S3ListObjectsResponse to FileExplorer-compatible items. */
export const mapResultToItems = (
  result: S3ListObjectsResponse,
  options?: { allowFolderSelection?: boolean; selectableExtensions?: string[] },
): Files => {
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
        selectable: options?.allowFolderSelection,
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
        items.push({
          name: '/',
          path: '/',
          type: 'folder',
          selectable: options?.allowFolderSelection,
          items: 0,
          hidden: true,
        });
        continue;
      }
      // Skip keys that end with / (folder markers)
      if (obj.key.endsWith('/')) {
        const dirPath = `/${obj.key.replace(/\/$/, '')}`;
        const name = dirPath.split('/').filter(Boolean).pop() ?? dirPath;
        items.push({
          name,
          path: dirPath,
          type: 'folder',
          selectable: options?.allowFolderSelection,
          items: 0,
        });
        continue;
      }

      const fullPath = `/${obj.key}`;
      const segments = obj.key.split('/');
      const fileName = segments.pop() ?? obj.key;
      const ext = fileName.includes('.') ? (fileName.split('.').pop() ?? '') : '';

      const sizeToRender = formatBytes(obj.size);
      const fileTypeToRender = ext.toLocaleUpperCase() || 'File';

      items.push({
        name: fileName,
        path: fullPath,
        type: fileTypeToRender,
        size: sizeToRender,
        selectable:
          !options?.selectableExtensions ||
          options.selectableExtensions.some((se) => se.toLowerCase() === ext.toLowerCase()),
        forceShowAsSelected: false,
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
          ...{ Size: sizeToRender },
          ...{ Type: fileTypeToRender },
        },
      });
    }
  }

  return items.toSorted((a, b) => a.name.localeCompare(b.name));
};

/** Builds the ordered breadcrumb trail from root to the given path. */
export const getBreadcrumbTrail = (targetPath: string): Folder[] => {
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
  onSelectFiles: (files: Files) => void;

  /** The Kubernetes namespace used to scope S3 connection lookups. */
  namespace: string;

  /** The connection secret that provides S3 credentials and endpoint configuration. */
  s3Secret?: ConnectionSecret;

  /** The S3 bucket name to browse. When omitted, the bucket is resolved from the connection secret itself. */
  bucket?: string;

  /** Prevent folders from being selected */
  allowFolderSelection?: boolean;

  /** When provided, only files with these extensions are selectable. Case-insensitive. Example: ["json", "html"] */
  selectableExtensions?: string[];

  /** The reason displayed beside a file that cannot be selected. Example: "Only JSON and HTML files can be selected" */
  unselectableReason?: string;
}
const S3FileExplorer: React.FC<S3FileExplorerProps> = ({
  id,
  isOpen,
  onClose,
  onSelectFiles,
  namespace,
  s3Secret,
  bucket = '',
  allowFolderSelection = true,
  selectableExtensions,
  unselectableReason,
}) => {
  const secretName = s3Secret?.name;

  // State -------------------------------------------------------------------->

  // TODO [ Gustavo ] From self-review:
  //  This component manages 10+ useState + 7 useRef + multiple useEffect + useMemo + useCallback.
  //  Consider using useReducer to consolidate the related state (filesToRender, foldersToRender, fetchError,
  //  loadingToRender, hasNextPage, pageToRender, perPageToRender, currentPath, searchQuery, selectedFolder)
  //  into a single reducer. This would make state transitions more predictable and easier to reason about,
  //  especially the "reset" transitions that currently require touching 10+ setState calls.
  //  This should be done once S3FileExplorer finds a common home.
  const [filesToRender, setFilesToRender] = useState<Files>([]);
  const [foldersToRender, setFoldersToRender] = useState<Folder[]>([]);
  const sourceToRender: Source | undefined = useMemo(
    () => (s3Secret ? { name: s3Secret.name, bucket } : undefined),
    [s3Secret, bucket],
  );

  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [loadingToRender, setLoadingToRender] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [pageToRender, setPageToRender] = useState<number | undefined>(1);
  const [perPageToRender, setPerPageToRender] = useState<number | undefined>(DEFAULT_PER_PAGE);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  // Refs --------------------------------------------------------------------->

  // Track continuation tokens per page for forward/backward navigation
  const continuationTokensRef = useRef<Map<number, string>>(new Map());
  const lastResultRef = useRef<S3ListObjectsResponse | null>(null);
  const fetchIdRef = useRef(0);
  const allowFolderSelectionRef = useRef(allowFolderSelection);
  allowFolderSelectionRef.current = allowFolderSelection;
  const selectableExtensionsRef = useRef(selectableExtensions);
  selectableExtensionsRef.current = selectableExtensions;

  // Track the last search query that was actually sent to the API (after debounce)
  const appliedSearchRef = useRef('');

  // Track connection identity to detect when connection changes
  const connectionKeyRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const debouncedSearchRef = useRef<{ cancel: () => void } | null>(null);

  // Helpers ------------------------------------------------------------------>

  const resetState = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    debouncedSearchRef.current?.cancel();
    setFilesToRender([]);
    setFoldersToRender([]);
    setFetchError(null);
    setLoadingToRender(false);
    setHasNextPage(false);
    setPageToRender(1);
    setPerPageToRender(DEFAULT_PER_PAGE);
    setCurrentPath('/');
    setSelectedFolder(null);
    continuationTokensRef.current = new Map();
    lastResultRef.current = null;
    appliedSearchRef.current = '';
    connectionKeyRef.current = null;
  }, []);

  const fetchPath = useCallback(
    (path: string, perPage: number, page: number, search?: string, continuationToken?: string) => {
      if (!secretName) {
        return;
      }
      setLoadingToRender(true);

      // Strip leading slash and ensure trailing slash so S3 treats it as a prefix
      const parsedPath = path === '/' ? undefined : path.replace(/^\//, '').replace(/\/?$/, '/');
      const getFilesOptions: GetFilesOptions = {
        namespace,
        secretName,
        bucket,
        limit: perPage,
      };
      if (parsedPath) {
        getFilesOptions.path = parsedPath;
      }
      if (search) {
        getFilesOptions.search = search;
      }
      if (continuationToken) {
        getFilesOptions.next = continuationToken;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const requestId = ++fetchIdRef.current;

      getFiles('', { signal: controller.signal }, getFilesOptions)
        .then((result) => {
          if (fetchIdRef.current !== requestId) {
            return;
          }
          lastResultRef.current = result;
          const items = mapResultToItems(result, {
            allowFolderSelection: allowFolderSelectionRef.current,
            selectableExtensions: selectableExtensionsRef.current,
          });
          setFilesToRender(items);
          setHasNextPage(!!result.next_continuation_token);
          setFetchError(null);
          setLoadingToRender(false);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
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

  const navigateTo = useCallback(
    (path: string, perPage: number) => {
      setCurrentPath(path);
      setFoldersToRender(getBreadcrumbTrail(path));
      appliedSearchRef.current = '';
      setPageToRender(1);
      continuationTokensRef.current = new Map();
      fetchPath(path, perPage, 1);
    },
    [fetchPath],
  );

  // Effects ------------------------------------------------------------------>

  // Reset state when the modal is closed
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      resetState();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, resetState]);

  // Initial fetch on mount / when connection changes / when modal reopens after reset
  useEffect(() => {
    if (!isOpen || !secretName) {
      // Clear session state so re-selecting the same secret forces a fresh fetch
      if (connectionKeyRef.current) {
        resetState();
      }
      return;
    }

    const connectionKey = `${namespace}/${secretName}/${bucket}`;
    if (connectionKeyRef.current === connectionKey) {
      return;
    }
    connectionKeyRef.current = connectionKey;

    // Reset state for the new connection
    setFilesToRender([]);
    setFoldersToRender([]);
    setFetchError(null);
    setHasNextPage(false);
    setLoadingToRender(false);
    setSelectedFolder(null);
    setCurrentPath('/');
    setPageToRender(1);
    setPerPageToRender(DEFAULT_PER_PAGE);
    continuationTokensRef.current = new Map();
    lastResultRef.current = null;
    appliedSearchRef.current = '';

    fetchPath('/', DEFAULT_PER_PAGE, 1);
  }, [isOpen, secretName, namespace, bucket, fetchPath, resetState]);

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        appliedSearchRef.current = query;
        const perPage = perPageToRender ?? DEFAULT_PER_PAGE;
        setPageToRender(1);
        continuationTokensRef.current = new Map();
        fetchPath(currentPath, perPage, 1, query || undefined);
      }, 300),
    [currentPath, perPageToRender, fetchPath],
  );
  debouncedSearchRef.current = debouncedSearch;
  // Cancel stale debounce when debouncedSearch is recreated
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  // Abort in-flight requests only on unmount
  useEffect(() => () => controllerRef.current?.abort(), []);

  // Derived state -------------------------------------------------------------->

  const filesWithSelection = useMemo(() => {
    if (!selectedFolder) {
      return filesToRender;
    }
    const folderPrefix = selectedFolder.path.endsWith('/')
      ? selectedFolder.path
      : `${selectedFolder.path}/`;
    return filesToRender.map((file) => {
      const isChild = file.path.startsWith(folderPrefix);
      return isChild ? { ...file, forceShowAsSelected: true, selectable: false } : file;
    });
  }, [filesToRender, selectedFolder]);

  // Rendering ---------------------------------------------------------------->

  const errorEmptyState: { isEmpty: boolean; emptyStateProps?: FileExplorerEmptyStateConfig } =
    useMemo(() => {
      if (!s3Secret) {
        return {
          isEmpty: true,
          emptyStateProps: {
            status: 'warning',
            titleText: 'No connection selected',
            body: <>Select a connection to browse its files.</>,
          },
        };
      }

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

      if (message.includes('endpoint URL must use HTTPS scheme, got: http')) {
        return {
          isEmpty: true,
          emptyStateProps: {
            status: 'danger',
            titleText: 'S3 Connection must use HTTPS',
            body: (
              <>
                The connection {secretNameToRender} is configured using HTTP. Configure the
                connection&apos;s endpoint using HTTPS and try again.
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
    }, [s3Secret, fetchError, secretName]);

  const viewingASelectedFoldersChildren =
    selectedFolder && filesWithSelection.some((file) => file.forceShowAsSelected);

  let unselectableReasonToRender = unselectableReason;
  if (viewingASelectedFoldersChildren) {
    unselectableReasonToRender = `The ${selectedFolder.name} parent folder has been selected already`;
  }

  // Callbacks ---------------------------------------------------------------->

  const handleSelectFile = useCallback((file: Files[number], selected: boolean) => {
    if (selected && isFolder(file)) {
      setSelectedFolder(file);
    } else {
      setSelectedFolder(null);
    }
  }, []);

  const handleNavigate = useCallback(
    (folder: Folder) => {
      navigateTo(folder.path, perPageToRender ?? DEFAULT_PER_PAGE);
    },
    [navigateTo, perPageToRender],
  );

  const handleNavigateRoot = useCallback(() => {
    navigateTo('/', perPageToRender ?? DEFAULT_PER_PAGE);
  }, [navigateTo, perPageToRender]);

  const handleSearch = useCallback(
    (query: string) => {
      debouncedSearch(query);
    },
    [debouncedSearch],
  );

  const handleSetPage = useCallback(
    (newPage: number) => {
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

      const search = appliedSearchRef.current || undefined;
      if (newPage === 1) {
        // First page: no continuation token needed
        fetchPath(currentPath, perPage, newPage, search);
      } else {
        const token = continuationTokensRef.current.get(newPage);
        fetchPath(currentPath, perPage, newPage, search, token);
      }
    },
    [perPageToRender, pageToRender, fetchPath, currentPath],
  );

  const handlePerPageSelect = useCallback(
    (newPerPage: number) => {
      setPerPageToRender(newPerPage);
      setPageToRender(1);
      continuationTokensRef.current = new Map();
      fetchPath(currentPath, newPerPage, 1, appliedSearchRef.current || undefined);
    },
    [fetchPath, currentPath],
  );

  return (
    <FileExplorer
      id={id}
      files={filesWithSelection}
      source={sourceToRender}
      folders={foldersToRender}
      isEmpty={errorEmptyState.isEmpty}
      emptyStateProps={errorEmptyState.emptyStateProps}
      loading={loadingToRender}
      page={pageToRender}
      perPage={perPageToRender}
      hasNextPage={hasNextPage}
      unselectableReason={unselectableReasonToRender}
      selection={viewingASelectedFoldersChildren ? 'checkbox' : 'radio'}
      isOpen={isOpen}
      onClose={onClose}
      onSelectFile={handleSelectFile}
      onFolderClick={handleNavigate}
      onNavigate={handleNavigate}
      onNavigateRoot={handleNavigateRoot}
      onSearch={handleSearch}
      onSetPage={handleSetPage}
      onPerPageSelect={handlePerPageSelect}
      onPrimary={onSelectFiles}
      allowedSearchCharacters={/[^/]/}
      allowedSearchCharactersLabel="Searches are case-sensitive and must match the beginning of the term. Slashes (/) are automatically removed."
    />
  );
};

// Public --------------------------------------------------------------------->

export default S3FileExplorer;

// Private -------------------------------------------------------------------->
