/* eslint-disable @typescript-eslint/no-unused-vars */

// Modules -------------------------------------------------------------------->

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { APIOptions, FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import FileExplorer from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import type {
  Files,
  Source,
  Sources,
  Directory,
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

  if (result.common_prefixes) {
    for (const cp of result.common_prefixes) {
      const prefixPath = `/${cp.prefix.replace(/\/$/, '')}`;
      const name = prefixPath.split('/').filter(Boolean).pop() ?? prefixPath;
      items.push({ name, path: prefixPath, type: 'directory', items: 0 });
    }
  }

  if (result.contents) {
    for (const obj of result.contents) {
      // Skip keys that end with / (directory markers)
      if (obj.key.endsWith('/')) {
        const dirPath = `/${obj.key.replace(/\/$/, '')}`;
        const name = dirPath.split('/').filter(Boolean).pop() ?? dirPath;
        items.push({ name, path: dirPath, type: 'directory', items: 0 });
        continue;
      }

      const fullPath = `/${obj.key}`;
      const segments = obj.key.split('/');
      const fileName = segments.pop() ?? obj.key;
      const ext = fileName.includes('.') ? (fileName.split('.').pop() ?? '') : '';

      items.push({
        name: fileName,
        path: fullPath,
        type: ext || 'file',
        size: obj.size !== undefined ? formatBytes(obj.size) : undefined,
        details: {
          ...(obj.last_modified && { 'Last Modified': obj.last_modified }),
          ...(obj.etag && { ETag: obj.etag }),
          ...(obj.storage_class && { 'Storage Class': obj.storage_class }),
          ...(obj.size !== undefined && { 'Size (bytes)': obj.size }),
        },
      });
    }
  }

  return items;
};

/** Builds the ordered breadcrumb trail from root to the given path. */
const getBreadcrumbTrail = (targetPath: string): Directory[] => {
  if (targetPath === '/') {
    return [];
  }
  const segments = targetPath.split('/').filter(Boolean);
  const trail: Directory[] = [];
  let accumulated = '';
  for (const seg of segments) {
    accumulated += `/${seg}`;
    trail.push({ name: seg, path: accumulated, type: 'directory', items: 0 });
  }
  return trail;
};

// Components ----------------------------------------------------------------->

interface S3FileExplorerProps {
  id?: string;
  isOpen: boolean;
  onClose: (_event: KeyboardEvent | React.MouseEvent | void) => void;

  namespace: string;
  s3Secret?: ConnectionSecret;
}
const S3FileExplorer: React.FC<S3FileExplorerProps> = ({
  id,
  isOpen,
  onClose,
  namespace,
  s3Secret,
}) => {
  // State -------------------------------------------------------------------->

  const secretName = s3Secret?.name;
  const bucket = '';

  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [lastNavigatedDir, setLastNavigatedDir] = useState<Directory | null>(null);
  const [lastDirectoryClicked, setLastDirectoryClicked] = useState<Directory | null>(null);
  const [filesToRender, setFilesToRender] = useState<Files>([]);
  const [directoriesToRender, setDirectoriesToRender] = useState<Directory[]>([]);
  const [sourceToRender, setSourceToRender] = useState<Source | undefined>(
    s3Secret ? { name: s3Secret.name, bucket } : undefined,
  );
  const [sourcesToRender, setSourcesToRender] = useState<Sources | undefined>(undefined);
  const [loadingToRender, setLoadingToRender] = useState(false);
  const [searchResultsCountToRender, setSearchResultsCountToRender] = useState<number | undefined>(
    undefined,
  );
  const [pageToRender, setPageToRender] = useState<number | undefined>(1);
  const [perPageToRender, setPerPageToRender] = useState<number | undefined>(DEFAULT_PER_PAGE);
  const [selectionToRender, setSelectionToRender] = useState<'radio' | 'checkbox' | undefined>(
    undefined,
  );
  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');

  // Track continuation tokens per page for forward/backward navigation
  const continuationTokensRef = useRef<Map<number, string>>(new Map());
  const lastResultRef = useRef<S3ListObjectsResult | null>(null);

  // Effects ------------------------------------------------------------------>

  const fetchPath = useCallback(
    (path: string, perPage: number, page: number, search?: string, continuationToken?: string) => {
      if (!secretName) {
        return;
      }
      setLoadingToRender(true);

      const apiPath = path === '/' ? undefined : path.replace(/^\//, '');
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

      getFiles('')(
        namespace,
        secretName,
        bucket,
        opts,
      )({ signal: new AbortController().signal })
        .then((result) => {
          lastResultRef.current = result;
          const items = mapResultToItems(result);
          setFilesToRender(items);
          setLoadingToRender(false);
        })
        .catch(() => {
          setFilesToRender([]);
          setLoadingToRender(false);
        });
    },
    [namespace, secretName, bucket],
  );

  // Initial fetch on mount / when secret changes
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!secretName || hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;
    fetchPath('/', DEFAULT_PER_PAGE, 1);
  }, [secretName, fetchPath]);

  // Helpers ------------------------------------------------------------------>

  const navigateTo = (path: string, perPage: number) => {
    setCurrentPath(path);
    setDirectoriesToRender(getBreadcrumbTrail(path));
    setSearchQuery('');
    setSearchResultsCountToRender(undefined);
    setPageToRender(1);
    continuationTokensRef.current = new Map();
    fetchPath(path, perPage, 1);
  };

  // Rendering ---------------------------------------------------------------->

  // TODO [ Gustavo ] Add an empty state if s3Connection is not passed in

  return (
    <FileExplorer
      id={id}
      files={filesToRender}
      source={sourceToRender}
      sources={sourcesToRender}
      directories={directoriesToRender}
      loading={loadingToRender}
      searchResultsCount={searchResultsCountToRender}
      page={pageToRender}
      perPage={perPageToRender}
      selection={selectionToRender}
      isOpen={isOpen}
      onClose={onClose}
      onSelectSource={(source) => {
        setSelectedSource(source);
      }}
      onDirectoryClick={(directory) => {
        setLastDirectoryClicked(directory);
        navigateTo(directory.path, perPageToRender ?? DEFAULT_PER_PAGE);
      }}
      onNavigate={(dir) => {
        setLastNavigatedDir(dir);
        navigateTo(dir.path, perPageToRender ?? DEFAULT_PER_PAGE);
      }}
      onNavigateRoot={() => {
        navigateTo('/', perPageToRender ?? DEFAULT_PER_PAGE);
      }}
      onSearch={(query) => {
        setSearchQuery(query);
        setPageToRender(1);
        continuationTokensRef.current = new Map();
        const perPage = perPageToRender ?? DEFAULT_PER_PAGE;
        if (query) {
          setSearchResultsCountToRender(undefined);
          fetchPath(currentPath, perPage, 1, query);
        } else {
          setSearchResultsCountToRender(undefined);
          fetchPath(currentPath, perPage, 1);
        }
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
        setSelectedFiles(files);
        onClose();
      }}
    />
  );
};

// Public --------------------------------------------------------------------->

export default S3FileExplorer;

// Private -------------------------------------------------------------------->
