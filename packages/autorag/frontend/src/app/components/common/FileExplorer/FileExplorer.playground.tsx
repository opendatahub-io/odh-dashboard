// Modules -------------------------------------------------------------------->

import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/patternfly/utilities/_index.css';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button,
  Card,
  CardTitle,
  CardBody,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Switch,
} from '@patternfly/react-core';
import FileExplorer from './FileExplorer';
import type { Folder, File, Files, Source, Sources } from './FileExplorer';

// Mocks ---------------------------------------------------------------------->

const mockSource: Source = {
  name: 'Foo connection',
  bucket: 'mock-bucket',
  count: 999999999,
};

const mockSources: Sources = [
  { name: 'Connection Alpha', count: 42 },
  { name: 'Connection Beta', count: 7 },
  { name: 'Connection Gamma', count: 1337 },
];

const createFile = (
  name: string,
  path: string,
  type: string,
  size: string,
  details?: File['details'],
): File => ({
  name,
  path,
  type,
  size,
  details,
});

const createFiles = (count: number, basePath = ''): Files =>
  new Array(count).fill(null).map((_, index) => {
    const name = `FooFile.${index + 1}.md`;
    return createFile(name, `${basePath}/${name}`, 'markdown', '1000000000', {
      encoding: 'utf-8',
      lastModified: '2026-01-15T10:30:00Z',
    });
  });

const sortFiles = (files: Files) => files.toSorted((fA, fB) => fA.name.localeCompare(fB.name));

// Navigation helpers --------------------------------------------------------->

interface BrowsableDataset {
  allFolders: Folder[];
  allFiles: Files;
}

/** Returns the direct children (subFolders + files) at the given path. */
const getChildItems = (dataset: BrowsableDataset, parentPath: string): Files => {
  const parent = parentPath === '/' ? '' : parentPath;
  const allItems: Files = [...dataset.allFolders, ...dataset.allFiles];
  return allItems.filter((item) => {
    const itemParent = item.path.substring(0, item.path.lastIndexOf('/'));
    return itemParent === parent;
  });
};

/** Builds the ordered breadcrumb trail from root to the given path. */
const getBreadcrumbTrail = (allDirs: Folder[], targetPath: string): Folder[] => {
  if (targetPath === '/') {
    return [];
  }
  const segments = targetPath.split('/').filter(Boolean);
  const trail: Folder[] = [];
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

const mock20Files = createFiles(20);
const mock100Files = createFiles(100);
const mock1000Files = createFiles(1000);

const mockFolders: Folder[] = [
  { name: 'path-level-1', path: '/path-level-1', type: 'folder', items: 5 },
  { name: 'path-level-2', path: '/path-level-1/path-level-2', type: 'folder', items: 3 },
  {
    name: 'path-level-3',
    path: '/path-level-1/path-level-2/path-level-3',
    type: 'folder',
    items: 1,
  },
];

const mock10Folders: Folder[] = new Array(10).fill(null).map((_, index) => {
  const level = index + 1;
  const path = new Array(level)
    .fill(null)
    .map((__, i) => `path-level-${i + 1}`)
    .join('/');
  return {
    name: `path-level-${level}`,
    path: `/${path}`,
    type: 'folder' as const,
    items: level,
  };
});

/* eslint-disable prettier/prettier -- No need to make file size crazy-long just for mock data*/
/*
 * Realistic project structure:
 * /
 * ├── docs/
 * │   ├── guides/
 * │   │   ├── getting-started.md
 * │   │   ├── deployment.md
 * │   │   └── troubleshooting.md
 * │   ├── api/
 * │   │   ├── endpoints.md
 * │   │   └── authentication.md
 * │   └── README.md
 * ├── reports/
 * │   ├── 2024/
 * │   │   ├── q1-summary.pdf
 * │   │   ├── q2-summary.pdf
 * │   │   └── q3-summary.pdf
 * │   └── annual-overview.pdf
 * ├── data/
 * │   ├── raw/
 * │   │   ├── dataset-001.csv
 * │   │   ├── dataset-002.csv
 * │   │   ├── dataset-003.csv
 * │   │   └── <200 generated test files (dataset-004.csv … dataset-203.csv)>
 * │   └── processed/
 * │       ├── output-001.json
 * │       └── output-002.json
 * └── changelog.md
 */
const realisticFolders: Folder[] = [
  { name: 'docs', path: '/docs', type: 'folder', items: 6 },
  { name: 'guides', path: '/docs/guides', type: 'folder', items: 3 },
  { name: 'api', path: '/docs/api', type: 'folder', items: 2 },
  { name: 'reports', path: '/reports', type: 'folder', items: 4 },
  { name: '2024', path: '/reports/2024', type: 'folder', items: 3 },
  { name: 'data', path: '/data', type: 'folder', items: 205 },
  { name: 'raw', path: '/data/raw', type: 'folder', items: 203 },
  { name: 'processed', path: '/data/processed', type: 'folder', items: 2 },
];
const realisticFiles: Files = [
  createFile('getting-started.md', '/docs/guides/getting-started.md', 'markdown', '4200', { encoding: 'utf-8', author: 'jdoe' }),
  createFile('deployment.md', '/docs/guides/deployment.md', 'markdown', '8900', { encoding: 'utf-8', author: 'asmith' }),
  createFile('troubleshooting.md', '/docs/guides/troubleshooting.md', 'markdown', '6100', { encoding: 'utf-8', author: 'jdoe' }),
  createFile('endpoints.md', '/docs/api/endpoints.md', 'markdown', '12400', { encoding: 'utf-8', version: '2.1' }),
  createFile('authentication.md', '/docs/api/authentication.md', 'markdown', '5300', { encoding: 'utf-8', version: '1.4' }),
  createFile('README.md', '/docs/README.md', 'markdown', '2100', { encoding: 'utf-8' }),
  createFile('q1-summary.pdf', '/reports/2024/q1-summary.pdf', 'pdf', '1048576', { pages: 24, author: 'finance-team' }),
  createFile('q2-summary.pdf', '/reports/2024/q2-summary.pdf', 'pdf', '2097152', { pages: 31, author: 'finance-team' }),
  createFile('q3-summary.pdf', '/reports/2024/q3-summary.pdf', 'pdf', '1572864', { pages: 28, author: 'finance-team' }),
  createFile('annual-overview.pdf', '/reports/annual-overview.pdf', 'pdf', '5242880', { pages: 96, author: 'exec-team' }),
  createFile('dataset-001.csv', '/data/raw/dataset-001.csv', 'csv', '34500000', { rows: 150000, columns: 12 }),
  createFile('dataset-002.csv', '/data/raw/dataset-002.csv', 'csv', '28700000', { rows: 125000, columns: 12 }),
  createFile('dataset-003.csv', '/data/raw/dataset-003.csv', 'csv', '41200000', { rows: 180000, columns: 12 }),
  ...createFiles(200, '/data/raw').map((f, i) => {
    const num = String(i + 4).padStart(3, '0');
    return createFile(`dataset-${num}.csv`, `/data/raw/dataset-${num}.csv`, 'csv', `${20000000 + i * 100000}`, { rows: 80000 + i * 500, columns: 12 });
  }),
  createFile('output-001.json', '/data/processed/output-001.json', 'json', '890000', { schema: 'v3', records: 4200 }),
  createFile('output-002.json', '/data/processed/output-002.json', 'json', '1200000', { schema: 'v3', records: 5800 }),
  createFile('changelog.md', '/changelog.md', 'markdown', '3400', { encoding: 'utf-8', lastModified: '2026-03-01T08:00:00Z' }),
];
/* eslint-enable prettier/prettier */

// Scenarios ------------------------------------------------------------------>

interface Scenario {
  label: string;
  files: Files;
  folders: Folder[];
  source?: Source;
  sources?: Sources;
  selection?: 'radio' | 'checkbox';
  loading?: boolean;
  searchResultsCount?: number;
  page?: number;
  perPage?: number;
  itemCount?: number;
  /** When set, enables interactive folder navigation for this scenario. */
  browsable?: BrowsableDataset;
}

const scenarioGroups: Record<string, Scenario[]> = {
  'File counts': [
    { label: '20 files', files: mock20Files, folders: mockFolders, source: mockSource },
    { label: '100 files', files: mock100Files, folders: mockFolders, source: mockSource },
    { label: '1000 files', files: mock1000Files, folders: mockFolders, source: mockSource },
  ],
  'Folder structure': [
    {
      label: '10 nested levels',
      files: mock20Files,
      folders: mock10Folders,
      source: mockSource,
    },
    {
      label: 'realistic nested structure (browsable)',
      files: getChildItems({ allFolders: realisticFolders, allFiles: realisticFiles }, '/'),
      folders: [],
      source: mockSource,
      browsable: { allFolders: realisticFolders, allFiles: realisticFiles },
    },
  ],
  Sources: [
    {
      label: 'multiple sources, none selected',
      files: mock20Files,
      folders: mockFolders,
      sources: mockSources,
    },
    {
      label: 'source selected',
      files: mock20Files,
      folders: mockFolders,
      source: mockSource,
    },
    {
      label: 'no source, no sources',
      files: mock20Files,
      folders: mockFolders,
    },
  ],
  Pagination: [
    {
      label: 'page 1 of 10',
      files: mock100Files.slice(0, 10),
      folders: mockFolders,
      source: mockSource,
      page: 1,
      perPage: 10,
      itemCount: 100,
    },
    {
      label: 'page 5 of 10',
      files: mock100Files.slice(40, 50),
      folders: mockFolders,
      source: mockSource,
      page: 5,
      perPage: 10,
      itemCount: 100,
    },
    {
      label: '25 per page',
      files: mock1000Files.slice(0, 25),
      folders: mockFolders,
      source: mockSource,
      page: 1,
      perPage: 25,
      itemCount: 1000,
    },
  ],
  Selection: [
    {
      label: 'checkbox multi-select',
      files: mock20Files,
      folders: mockFolders,
      source: mockSource,
      selection: 'checkbox',
    },
  ],
  States: [
    {
      label: 'loading',
      files: [],
      folders: [],
      source: mockSource,
      loading: true,
    },
    {
      label: 'empty files',
      files: [],
      folders: mockFolders,
      source: mockSource,
    },
    {
      label: 'search with results count',
      files: mock20Files,
      folders: mockFolders,
      source: mockSource,
      searchResultsCount: 5,
    },
  ],
};

// App ------------------------------------------------------------------------>

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [lastNavigatedDir, setLastNavigatedDir] = useState<Folder | null>(null);
  const [lastFolderClicked, setLastFolderClicked] = useState<Folder | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
  const [filesToRender, setFilesToRender] = useState<Files>(mock20Files);
  const [foldersToRender, setfoldersToRender] = useState<Folder[]>(mockFolders);
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

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkTheme) {
      htmlElement.classList.add('pf-v6-theme-dark');
    } else {
      htmlElement.classList.remove('pf-v6-theme-dark');
    }
  }, [isDarkTheme]);

  const defaultPerPage = 10;

  const paginateItems = (items: Files, page: number, perPage: number): Files =>
    items.slice((page - 1) * perPage, page * perPage);

  const applyView = (items: Files, page: number, perPage: number) => {
    setPageToRender(page);
    setPerPageToRender(perPage);
    setItemCountToRender(items.length);
    setFilesToRender(paginateItems(items, page, perPage));
  };

  const navigateTo = (dataset: BrowsableDataset, path: string) => {
    const children = sortFiles(getChildItems(dataset, path));
    setCurrentPath(path);
    setAllChildItems(children);
    setFilteredChildItems(children);
    setfoldersToRender(getBreadcrumbTrail(dataset.allFolders, path));
    setSearchResultsCountToRender(undefined);
    applyView(children, 1, defaultPerPage);
  };

  const openScenario = (scenario: Scenario) => {
    setSourceToRender(scenario.source);
    setSourcesToRender(scenario.sources);
    setLoadingToRender(scenario.loading ?? false);
    setSearchResultsCountToRender(scenario.searchResultsCount);
    setSelectionToRender(scenario.selection);
    setActiveDataset(scenario.browsable ?? null);

    if (scenario.browsable) {
      navigateTo(scenario.browsable, '/');
    } else {
      setFilesToRender(sortFiles(scenario.files));
      setfoldersToRender(scenario.folders);
      setPageToRender(scenario.page);
      setPerPageToRender(scenario.perPage);
      setItemCountToRender(scenario.itemCount);
      setCurrentPath('/');
      setAllChildItems([]);
      setFilteredChildItems([]);
    }

    setIsOpen(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <Flex
        style={{ width: 'fit-content' }}
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsMd' }}
      >
        <Card>
          <CardTitle>Controls</CardTitle>
          <CardBody>
            <Switch
              id="theme-toggle"
              label={isDarkTheme ? 'Dark theme' : 'Light theme'}
              isChecked={isDarkTheme}
              onChange={(_event, checked) => setIsDarkTheme(checked)}
            />
          </CardBody>
        </Card>
        <Card>
          <CardTitle>State</CardTitle>
          <CardBody>
            <p>
              Selected files:{' '}
              {selectedFiles.length > 0 ? selectedFiles.map((f) => f.name).join(', ') : '—'}
            </p>
            <p>Selected source: {selectedSource ? JSON.stringify(selectedSource) : '—'}</p>
            <p>Current path: {currentPath}</p>
            <p>Last navigated dir: {lastNavigatedDir ? lastNavigatedDir.path : '—'}</p>
            <p>Last folder clicked: {lastFolderClicked ? lastFolderClicked.path : '—'}</p>
            <p>Last search query: {lastSearchQuery || '—'}</p>
            <p>Page: {pageToRender ?? '—'}</p>
            <p>Per page: {perPageToRender ?? '—'}</p>
            <p>Item count: {itemCountToRender ?? '—'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardTitle>Scenarios</CardTitle>
          <CardBody>
            <Stack>
              {Object.entries(scenarioGroups).map(([groupLabel, scenarios]) => (
                <React.Fragment key={groupLabel}>
                  <StackItem className="pf-v6-u-font-weight-bold pf-v6-u-font-size-md pf-v6-u-mt-sm pf-v6-u-mb-sm">
                    {groupLabel}
                  </StackItem>
                  <StackItem>
                    <Flex>
                      {scenarios.map((scenario) => (
                        <FlexItem key={scenario.label}>
                          <Button
                            variant={scenario.browsable ? 'primary' : 'secondary'}
                            onClick={() => openScenario(scenario)}
                          >
                            {scenario.label}
                          </Button>
                        </FlexItem>
                      ))}
                    </Flex>
                  </StackItem>
                </React.Fragment>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </Flex>

      <FileExplorer
        files={filesToRender}
        source={sourceToRender}
        sources={sourcesToRender}
        folders={foldersToRender}
        loading={loadingToRender}
        searchResultsCount={searchResultsCountToRender}
        page={pageToRender}
        perPage={perPageToRender}
        itemCount={itemCountToRender}
        selection={selectionToRender}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectSource={(source) => {
          setSelectedSource(source);
        }}
        onFolderClick={(folder) => {
          setLastFolderClicked(folder);
          if (activeDataset) {
            navigateTo(activeDataset, folder.path);
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
            applyView(filtered, 1, perPageToRender ?? defaultPerPage);
          }
        }}
        onSetPage={(newPage) => {
          setPageToRender(newPage);
          if (activeDataset) {
            setFilesToRender(
              paginateItems(filteredChildItems, newPage, perPageToRender ?? defaultPerPage),
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
          setIsOpen(false);
        }}
      />
    </div>
  );
};

const container = document.createElement('div');
document.body.appendChild(container);
createRoot(container).render(<App />);
