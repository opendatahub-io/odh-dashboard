// Modules -------------------------------------------------------------------->

import '@patternfly/react-core/dist/styles/base.css';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, CardTitle, CardBody, Flex, FlexItem, Switch } from '@patternfly/react-core';
import { clone } from 'es-toolkit';
import FileExplorer from './FileExplorer';
import type { Directory, File, Files, Source, Sources } from './FileExplorer';

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

const mockFile: File = {
  name: 'FooFile.000.md',
  path: '/FooFile.000.md',
  type: 'markdown',
  size: '1000000000',
};

const createFiles = (count: number, basePath = ''): Files =>
  new Array(count).fill(null).map((_, index) => {
    const newFile = clone(mockFile);
    const name = newFile.name.replace('000', String(index + 1));
    newFile.name = name;
    newFile.path = `${basePath}/${name}`;
    return newFile;
  });

const mock20Files = createFiles(20);
const mock100Files = createFiles(100);
const mock1000Files = createFiles(1000);

const mockDirectories: Directory[] = [
  { name: 'path-level-1', path: '/path-level-1', type: 'directory', items: 5 },
  { name: 'path-level-2', path: '/path-level-1/path-level-2', type: 'directory', items: 3 },
  {
    name: 'path-level-3',
    path: '/path-level-1/path-level-2/path-level-3',
    type: 'directory',
    items: 1,
  },
];

const mock10Directories: Directory[] = new Array(10).fill(null).map((_, index) => {
  const level = index + 1;
  const path = new Array(level)
    .fill(null)
    .map((__, i) => `path-level-${i + 1}`)
    .join('/');
  return {
    name: `path-level-${level}`,
    path: `/${path}`,
    type: 'directory' as const,
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
 * │   │   └── dataset-003.csv
 * │   └── processed/
 * │       ├── output-001.json
 * │       └── output-002.json
 * └── changelog.md
 */
const realisticDirectories: Directory[] = [
  { name: 'docs', path: '/docs', type: 'directory', items: 6 },
  { name: 'guides', path: '/docs/guides', type: 'directory', items: 3 },
  { name: 'api', path: '/docs/api', type: 'directory', items: 2 },
  { name: 'reports', path: '/reports', type: 'directory', items: 4 },
  { name: '2024', path: '/reports/2024', type: 'directory', items: 3 },
  { name: 'data', path: '/data', type: 'directory', items: 5 },
  { name: 'raw', path: '/data/raw', type: 'directory', items: 3 },
  { name: 'processed', path: '/data/processed', type: 'directory', items: 2 },
];
const realisticFiles: Files = [
  {
    name: 'getting-started.md',
    path: '/docs/guides/getting-started.md',
    type: 'markdown',
    size: '4200',
  },
  { name: 'deployment.md', path: '/docs/guides/deployment.md', type: 'markdown', size: '8900' },
  {
    name: 'troubleshooting.md',
    path: '/docs/guides/troubleshooting.md',
    type: 'markdown',
    size: '6100',
  },
  { name: 'endpoints.md', path: '/docs/api/endpoints.md', type: 'markdown', size: '12400' },
  {
    name: 'authentication.md',
    path: '/docs/api/authentication.md',
    type: 'markdown',
    size: '5300',
  },
  { name: 'README.md', path: '/docs/README.md', type: 'markdown', size: '2100' },
  { name: 'q1-summary.pdf', path: '/reports/2024/q1-summary.pdf', type: 'pdf', size: '1048576' },
  { name: 'q2-summary.pdf', path: '/reports/2024/q2-summary.pdf', type: 'pdf', size: '2097152' },
  { name: 'q3-summary.pdf', path: '/reports/2024/q3-summary.pdf', type: 'pdf', size: '1572864' },
  {
    name: 'annual-overview.pdf',
    path: '/reports/annual-overview.pdf',
    type: 'pdf',
    size: '5242880',
  },
  { name: 'dataset-001.csv', path: '/data/raw/dataset-001.csv', type: 'csv', size: '34500000' },
  { name: 'dataset-002.csv', path: '/data/raw/dataset-002.csv', type: 'csv', size: '28700000' },
  { name: 'dataset-003.csv', path: '/data/raw/dataset-003.csv', type: 'csv', size: '41200000' },
  {
    name: 'output-001.json',
    path: '/data/processed/output-001.json',
    type: 'json',
    size: '890000',
  },
  {
    name: 'output-002.json',
    path: '/data/processed/output-002.json',
    type: 'json',
    size: '1200000',
  },
  { name: 'changelog.md', path: '/changelog.md', type: 'markdown', size: '3400' },
];
/* eslint-enable prettier/prettier */

// Scenarios ----------------------------------------------------------------

interface Scenario {
  label: string;
  files: Files;
  directories: Directory[];
  source?: Source;
  sources?: Sources;
  loading?: boolean;
  searchResultsCount?: number;
  page?: number;
  perPage?: number;
  itemCount?: number;
}

const scenarios: Scenario[] = [
  { label: '20 files', files: mock20Files, directories: mockDirectories, source: mockSource },
  { label: '100 files', files: mock100Files, directories: mockDirectories, source: mockSource },
  { label: '1000 files', files: mock1000Files, directories: mockDirectories, source: mockSource },
  {
    label: '10 nested levels',
    files: mock20Files,
    directories: mock10Directories,
    source: mockSource,
  },
  {
    label: 'multiple sources, none selected',
    files: mock20Files,
    directories: mockDirectories,
    sources: mockSources,
  },
  {
    label: 'source selected',
    files: mock20Files,
    directories: mockDirectories,
    source: mockSource,
  },
  {
    label: 'no source, no sources',
    files: mock20Files,
    directories: mockDirectories,
  },
  {
    label: 'realistic nested structure',
    files: [...realisticDirectories, ...realisticFiles].toSorted((fA, fB) =>
      fA.name.localeCompare(fB.name),
    ),
    directories: realisticDirectories,
    source: mockSource,
  },
  {
    label: 'loading state',
    files: [],
    directories: [],
    source: mockSource,
    loading: true,
  },
  {
    label: 'empty files',
    files: [],
    directories: mockDirectories,
    source: mockSource,
  },
  {
    label: 'search with results count',
    files: mock20Files,
    directories: mockDirectories,
    source: mockSource,
    searchResultsCount: 5,
  },
  {
    label: 'paginated (page 1 of 10)',
    files: mock100Files.slice(0, 10),
    directories: mockDirectories,
    source: mockSource,
    page: 1,
    perPage: 10,
    itemCount: 100,
  },
  {
    label: 'paginated (page 5 of 10)',
    files: mock100Files.slice(40, 50),
    directories: mockDirectories,
    source: mockSource,
    page: 5,
    perPage: 10,
    itemCount: 100,
  },
  {
    label: 'paginated (25 per page)',
    files: mock1000Files.slice(0, 25),
    directories: mockDirectories,
    source: mockSource,
    page: 1,
    perPage: 25,
    itemCount: 1000,
  },
];

// App ----------------------------------------------------------------------

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [lastNavigatedDir, setLastNavigatedDir] = useState<Directory | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
  const [filesToRender, setFilesToRender] = useState<Files>(mock20Files);
  const [directoriesToRender, setDirectoriesToRender] = useState<Directory[]>(mockDirectories);
  const [sourceToRender, setSourceToRender] = useState<Source | undefined>(mockSource);
  const [sourcesToRender, setSourcesToRender] = useState<Sources | undefined>(undefined);
  const [loadingToRender, setLoadingToRender] = useState(false);
  const [searchResultsCountToRender, setSearchResultsCountToRender] = useState<number | undefined>(
    undefined,
  );
  const [pageToRender, setPageToRender] = useState<number | undefined>(undefined);
  const [perPageToRender, setPerPageToRender] = useState<number | undefined>(undefined);
  const [itemCountToRender, setItemCountToRender] = useState<number | undefined>(undefined);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkTheme) {
      htmlElement.classList.add('pf-v6-theme-dark');
    } else {
      htmlElement.classList.remove('pf-v6-theme-dark');
    }
  }, [isDarkTheme]);

  const openScenario = (scenario: Scenario) => {
    setFilesToRender(scenario.files);
    setDirectoriesToRender(scenario.directories);
    setSourceToRender(scenario.source);
    setSourcesToRender(scenario.sources);
    setLoadingToRender(scenario.loading ?? false);
    setSearchResultsCountToRender(scenario.searchResultsCount);
    setPageToRender(scenario.page);
    setPerPageToRender(scenario.perPage);
    setItemCountToRender(scenario.itemCount);
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
            <p>Last navigated dir: {lastNavigatedDir ? lastNavigatedDir.path : '—'}</p>
            <p>Last search query: {lastSearchQuery || '—'}</p>
            <p>Page: {pageToRender ?? '—'}</p>
            <p>Per page: {perPageToRender ?? '—'}</p>
            <p>Item count: {itemCountToRender ?? '—'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardTitle>Scenarios</CardTitle>
          <CardBody>
            <Flex>
              {scenarios.map((scenario) => (
                <FlexItem key={scenario.label}>
                  <Button onClick={() => openScenario(scenario)}>{scenario.label}</Button>
                </FlexItem>
              ))}
            </Flex>
          </CardBody>
        </Card>
      </Flex>

      <FileExplorer
        files={filesToRender}
        source={sourceToRender}
        sources={sourcesToRender}
        directories={directoriesToRender}
        rootLabel="mock-bucket (root)" // TODO [ CLAUDE ] FileExplorer shouldn't need this prop. It should use `{source.name} (root)`
        loading={loadingToRender}
        searchResultsCount={searchResultsCountToRender}
        page={pageToRender}
        perPage={perPageToRender}
        itemCount={itemCountToRender}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectSource={(source) => {
          setSelectedSource(source);
        }}
        onNavigate={(dir) => {
          setLastNavigatedDir(dir);
        }}
        onSearch={(query) => {
          setLastSearchQuery(query);
        }}
        onSetPage={(newPage) => {
          setPageToRender(newPage);
        }}
        onPerPageSelect={(newPerPage) => {
          setPerPageToRender(newPerPage);
          setPageToRender(1);
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
