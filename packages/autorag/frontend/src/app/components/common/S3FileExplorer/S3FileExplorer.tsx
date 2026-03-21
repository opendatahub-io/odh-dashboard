/* eslint-disable @typescript-eslint/no-unused-vars */

// Modules -------------------------------------------------------------------->

import React, { useState, useCallback } from 'react';
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

// TODO [ Gustavo ] Imported from playground example. Remove the mock
const mockSource: Source = {
  name: 'Foo connection',
  bucket: 'mock-bucket',
  count: 999999999,
};

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

  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [lastNavigatedDir, setLastNavigatedDir] = useState<Directory | null>(null);
  const [lastDirectoryClicked, setLastDirectoryClicked] = useState<Directory | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
  const [filesToRender, setFilesToRender] = useState<Files>([]);
  const [directoriesToRender, setDirectoriesToRender] = useState<Directory[]>([]);
  const [sourceToRender, setSourceToRender] = useState<Source | undefined>(mockSource);
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

  // TODO [ Gustavo ] Add an effect on detecting that the isOpen is set to true. If set to true call GET /api/v1/s3/files?namespace={{namespace}}&secretName={{secret_name}}&bucket={{bucket}}
  const secretName = s3Secret?.name;
  const bucket = '';

  const callback = useCallback<FetchStateCallbackPromise<S3ListObjectsResult[]>>(
    (opts: APIOptions) => {
      if (!secretName) {
        return Promise.reject(new NotReadyError('No secret provided'));
      }
      return getFiles('')(namespace, secretName, bucket)(opts);
    },
    [namespace, secretName],
  );

  const [listObjectsResult, loaded, error, refresh] = useFetchState<S3ListObjectsResult[]>(
    callback,
    [],
  );

  // Helpers ------------------------------------------------------------------>

  const sortFiles = (files: Files) => files.toSorted((fA, fB) => fA.name.localeCompare(fB.name));

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
    const children = sortFiles(getChildItems(dataset, path));
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
