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

// Types ---------------------------------------------------------------------->

// TODO [ Gustavo ] Imported from playground example. There might be a better name
interface BrowsableDataset {
  allDirectories: Directory[];
  allFiles: Files;
}

// Globals -------------------------------------------------------------------->

const DEFAULT_PER_PAGE = 10;

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
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
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
  const [pageToRender, setPageToRender] = useState<number | undefined>(undefined);
  const [perPageToRender, setPerPageToRender] = useState<number | undefined>(undefined);
  const [itemCountToRender, setItemCountToRender] = useState<number | undefined>(undefined);
  const [selectionToRender, setSelectionToRender] = useState<'radio' | 'checkbox' | undefined>(
    undefined,
  );
  const [activeDataset, setActiveDataset] = useState<BrowsableDataset | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [allChildItems, setAllChildItems] = useState<Files>([]);
  const [filteredChildItems, setFilteredChildItems] = useState<Files>([]);

  // Effects ------------------------------------------------------------------>

  const callback = useCallback<FetchStateCallbackPromise<S3ListObjectsResult | null>>(
    (opts: APIOptions) => {
      if (!secretName) {
        return Promise.reject(new NotReadyError('No secret provided'));
      }
      return getFiles('')(namespace, secretName, bucket)(opts);
    },
    [namespace, secretName],
  );

  const [listObjectsResult, loaded, error, refresh] = useFetchState<S3ListObjectsResult | null>(
    callback,
    null,
  );

  // Map S3 response to BrowsableDataset when data loads
  const hasBuiltDataset = useRef(false);

  useEffect(() => {
    if (!loaded || hasBuiltDataset.current || !listObjectsResult) {
      return;
    }
    hasBuiltDataset.current = true;

    const result = listObjectsResult;
    const allDirectories: Directory[] = [];
    const allFiles: Files = [];
    const seenDirs = new Set<string>();

    // Map common_prefixes to directories
    if (result.common_prefixes) {
      for (const cp of result.common_prefixes) {
        const prefixPath = `/${cp.prefix.replace(/\/$/, '')}`;
        if (!seenDirs.has(prefixPath)) {
          seenDirs.add(prefixPath);
          const name = prefixPath.split('/').filter(Boolean).pop() ?? prefixPath;
          allDirectories.push({
            name,
            path: prefixPath,
            type: 'directory',
            items: 0,
          });
        }
      }
    }

    // Map contents to files (and synthesize parent directories)
    if (result.contents) {
      for (const obj of result.contents) {
        const fullPath = `/${obj.key}`;
        // Skip keys that end with / (they represent directories)
        if (obj.key.endsWith('/')) {
          const dirPath = fullPath.replace(/\/$/, '');
          if (!seenDirs.has(dirPath)) {
            seenDirs.add(dirPath);
            const name = dirPath.split('/').filter(Boolean).pop() ?? dirPath;
            allDirectories.push({ name, path: dirPath, type: 'directory', items: 0 });
          }
          continue;
        }

        // Synthesize intermediate parent directories
        const segments = obj.key.split('/');
        for (let i = 1; i < segments.length; i++) {
          const dirPath = `/${segments.slice(0, i).join('/')}`;
          if (!seenDirs.has(dirPath)) {
            seenDirs.add(dirPath);
            allDirectories.push({
              name: segments[i - 1],
              path: dirPath,
              type: 'directory',
              items: 0,
            });
          }
        }

        const fileName = segments.pop() ?? obj.key;
        const ext = fileName.includes('.') ? (fileName.split('.').pop() ?? '') : '';

        allFiles.push({
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

    // Compute directory item counts
    for (const dir of allDirectories) {
      const prefix = dir.path === '/' ? '' : dir.path;
      dir.items = [...allDirectories, ...allFiles].filter((item) => {
        const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));
        return parentPath === prefix;
      }).length;
    }

    const dataset: BrowsableDataset = { allDirectories, allFiles };
    setActiveDataset(dataset);
    setLoadingToRender(false);
    navigateTo(dataset, '/');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guarded by hasBuiltDataset ref, runs once
  }, [loaded, listObjectsResult]);

  // Update loading state when fetch is in progress
  useEffect(() => {
    if (!loaded && !error) {
      setLoadingToRender(true);
    }
  }, [loaded, error]);

  // Helpers ------------------------------------------------------------------>

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };

  /** Returns the direct children (subdirectories + files) at the given path. */
  const getChildItems = (dataset: BrowsableDataset, parentPath: string): Files => {
    const parent = parentPath === '/' ? '' : parentPath;
    const allItems: Files = [...dataset.allDirectories, ...dataset.allFiles];
    return allItems.filter((item) => {
      const itemParent = item.path.substring(0, item.path.lastIndexOf('/'));
      return itemParent === parent;
    });
  };

  /** Builds the ordered breadcrumb trail from root to the given path. */
  const getBreadcrumbTrail = (allDirs: Directory[], targetPath: string): Directory[] => {
    if (targetPath === '/') {
      return [];
    }
    const segments = targetPath.split('/').filter(Boolean);
    const trail: Directory[] = [];
    let accumulated = '';
    for (const seg of segments) {
      accumulated += `/${seg}`;
      const dir = allDirs.find((d) => d.path === accumulated);
      if (dir) {
        trail.push(dir);
      }
    }
    return trail;
  };

  const paginateItems = (items: Files, page: number, perPage: number): Files =>
    items.slice((page - 1) * perPage, page * perPage);

  const navigateTo = (dataset: BrowsableDataset, path: string) => {
    const children = getChildItems(dataset, path);
    setCurrentPath(path);
    setAllChildItems(children);
    setFilteredChildItems(children);
    setDirectoriesToRender(getBreadcrumbTrail(dataset.allDirectories, path));
    setSearchResultsCountToRender(undefined);
    applyView(children, 1, DEFAULT_PER_PAGE);
  };

  const applyView = (items: Files, page: number, perPage: number) => {
    setPageToRender(page);
    setPerPageToRender(perPage);
    setItemCountToRender(items.length);
    setFilesToRender(paginateItems(items, page, perPage));
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
      itemCount={itemCountToRender}
      selection={selectionToRender}
      isOpen={isOpen}
      onClose={onClose}
      onSelectSource={(source) => {
        setSelectedSource(source);
      }}
      onDirectoryClick={(directory) => {
        setLastDirectoryClicked(directory);
        if (activeDataset) {
          navigateTo(activeDataset, directory.path);
        }
      }}
      onNavigate={(dir) => {
        setLastNavigatedDir(dir);
        if (activeDataset) {
          navigateTo(activeDataset, dir.path);
        }
      }}
      onNavigateRoot={() => {
        if (activeDataset) {
          navigateTo(activeDataset, '/');
        }
      }}
      onSearch={(query) => {
        setLastSearchQuery(query);
        if (activeDataset) {
          const lowerQuery = query.toLowerCase();
          const filtered = lowerQuery
            ? allChildItems.filter((f) => f.name.toLowerCase().includes(lowerQuery))
            : allChildItems;
          setFilteredChildItems(filtered);
          setSearchResultsCountToRender(lowerQuery ? filtered.length : undefined);
          applyView(filtered, 1, perPageToRender ?? DEFAULT_PER_PAGE);
        }
      }}
      onSetPage={(newPage) => {
        setPageToRender(newPage);
        if (activeDataset) {
          setFilesToRender(
            paginateItems(filteredChildItems, newPage, perPageToRender ?? DEFAULT_PER_PAGE),
          );
        }
      }}
      onPerPageSelect={(newPerPage) => {
        setPerPageToRender(newPerPage);
        setPageToRender(1);
        if (activeDataset) {
          setFilesToRender(paginateItems(filteredChildItems, 1, newPerPage));
        }
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
