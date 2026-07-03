/**
 * @module S3FileExplorer
 *
 * S3-specific wrapper around the generic {@link FileExplorer} modal.
 *
 * This component owns all S3 data-fetching, pagination-token management, search
 * debouncing, and error-to-empty-state mapping. It translates S3 list-objects
 * responses into the {@link File}/{@link Folder} shapes that FileExplorer expects
 * and forwards user interactions (navigation, search, page changes) back to the
 * S3 BFF API.
 *
 * Consumers provide an `apiPath` (the BFF route prefix) and Kubernetes coordinates
 * (`namespace`, `s3SecretName`, optional `bucket`). S3FileExplorer handles the rest.
 *
 * @see {@link FileExplorer} for the underlying presentation component.
 */

// Modules -------------------------------------------------------------------->

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { debounce } from 'lodash-es';
import FileExplorer, { isFolder } from '#~/concepts/fileExplorer/FileExplorer/FileExplorer.tsx';
import type {
  ExplorerFiles,
  Source,
  Folder,
  FileExplorerEmptyStateConfig,
  S3ListObjectsResponse,
} from '#~/concepts/fileExplorer/types';
import { getFiles, type GetFilesOptions } from '#~/concepts/fileExplorer/api/s3.ts';
import { mapResultToItems } from '#~/concepts/fileExplorer/utils.tsx';

// Globals -------------------------------------------------------------------->

const DEFAULT_PER_PAGE = 10;

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

  /** The path of the S3 BFF API that should be called. Example: `/autorag/api/v1/s3` or `/automl/api/v1/s3` */
  apiPath: string;

  /** Flag indicating whether the S3FileExplorer is open. */
  isOpen: boolean;

  /** Callback fired when the modal is closed via dismiss or cancel. */
  onClose: (_event?: KeyboardEvent | React.MouseEvent) => void;

  /** Callback fired when the user confirms a file selection via the primary action. */
  onSelectFiles: (files: ExplorerFiles) => void;

  /** The Kubernetes namespace used to scope S3 connection lookups. */
  namespace: string;

  /** The name of the Kubernetes Secret that provides S3 credentials and endpoint configuration. */
  s3SecretName?: string;

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
  apiPath,
  isOpen,
  onClose,
  onSelectFiles,
  namespace,
  s3SecretName,
  bucket = '',
  allowFolderSelection = true,
  selectableExtensions,
  unselectableReason,
}) => {
  // State -------------------------------------------------------------------->

  // TODO [ Gustavo ] From self-review:
  //  This component manages 10+ useState + 7 useRef + multiple useEffect + useMemo + useCallback.
  //  Consider using useReducer to consolidate the related state (filesToRender, foldersToRender, fetchError,
  //  loadingToRender, hasNextPage, pageToRender, perPageToRender, currentPath, searchQuery, selectedFolder)
  //  into a single reducer. This would make state transitions more predictable and easier to reason about,
  //  especially the "reset" transitions that currently require touching 10+ setState calls.
  //  This should be done once S3FileExplorer finds a common home.
  const [filesToRender, setFilesToRender] = useState<ExplorerFiles>([]);
  const [foldersToRender, setFoldersToRender] = useState<Folder[]>([]);
  const sourceToRender: Source | undefined = useMemo(
    () => (s3SecretName ? { name: s3SecretName, bucket } : undefined),
    [s3SecretName, bucket],
  );

  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [loadingToRender, setLoadingToRender] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [pageToRender, setPageToRender] = useState(1);
  const [perPageToRender, setPerPageToRender] = useState(DEFAULT_PER_PAGE);
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
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;
  const perPageToRenderRef = useRef(perPageToRender);
  perPageToRenderRef.current = perPageToRender;

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
      if (!s3SecretName) {
        return;
      }
      setLoadingToRender(true);

      // Strip leading slash and ensure trailing slash so S3 treats it as a prefix
      const parsedPath = path === '/' ? undefined : path.replace(/^\//, '').replace(/\/?$/, '/');
      const getFilesOptions: GetFilesOptions = {
        apiPath,
        namespace,
        secretName: s3SecretName,
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
    [apiPath, namespace, s3SecretName, bucket],
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
    if (!isOpen || !s3SecretName) {
      // Clear session state so re-selecting the same secret forces a fresh fetch
      if (connectionKeyRef.current) {
        resetState();
      }
      return;
    }

    const connectionKey = `${apiPath}/${namespace}/${s3SecretName}/${bucket}`;
    if (connectionKeyRef.current === connectionKey) {
      return;
    }
    resetState();
    connectionKeyRef.current = connectionKey;

    fetchPath('/', DEFAULT_PER_PAGE, 1);
  }, [apiPath, isOpen, s3SecretName, namespace, bucket, fetchPath, resetState]);

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        appliedSearchRef.current = query;
        setPageToRender(1);
        continuationTokensRef.current = new Map();
        fetchPath(currentPathRef.current, perPageToRenderRef.current, 1, query || undefined);
      }, 300),
    [fetchPath],
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
      if (!s3SecretName) {
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
      const secretNameToRender = <strong>{s3SecretName}</strong>;

      // TODO [ Gustavo ] Generally weak error handling: Add CommonErrorHandling strategy to AutoX BFF+UI

      if (message.includes('bucket') && message.includes('is required')) {
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

      if (message.includes('endpoint URL must use HTTPS scheme') && message.includes('got: http')) {
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

      if (message.includes('Unable to connect to the S3 storage endpoint')) {
        return {
          isEmpty: true,
          emptyStateProps: {
            status: 'danger',
            titleText: 'S3 endpoint unreachable',
            body: (
              <>
                The S3 storage endpoint for connection {secretNameToRender} could not be reached.
                The endpoint may be unreachable from this cluster. If this is a disconnected or
                air-gapped environment, verify the S3 endpoint URL in the data connection secret
                points to a storage service accessible within the cluster network.
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
    }, [s3SecretName, fetchError]);

  const viewingASelectedFoldersChildren =
    selectedFolder && filesWithSelection.some((file) => file.forceShowAsSelected);

  let unselectableReasonToRender = unselectableReason;
  if (viewingASelectedFoldersChildren) {
    unselectableReasonToRender = `The ${selectedFolder.name} parent folder has been selected already`;
  }

  // Callbacks ---------------------------------------------------------------->

  const handleSelectFile = useCallback((file: ExplorerFiles[number], selected: boolean) => {
    if (selected && isFolder(file)) {
      setSelectedFolder(file);
    } else {
      setSelectedFolder(null);
    }
  }, []);

  const handleNavigate = useCallback(
    (folder: Folder) => {
      navigateTo(folder.path, perPageToRender);
    },
    [navigateTo, perPageToRender],
  );

  const handleNavigateRoot = useCallback(() => {
    navigateTo('/', perPageToRender);
  }, [navigateTo, perPageToRender]);

  const handleSearch = useCallback(
    (query: string) => {
      debouncedSearch(query);
    },
    [debouncedSearch],
  );

  const handleSetPage = useCallback(
    (newPage: number) => {
      const perPage = perPageToRender;
      const currentPage = pageToRender;

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
