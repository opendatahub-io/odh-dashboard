// Modules -------------------------------------------------------------------->

import '@patternfly/react-core/dist/styles/base.css';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, CardTitle, CardBody, Flex, FlexItem, Switch } from '@patternfly/react-core';
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

const createFile = (
  name: string,
  path: string,
  type: string,
  size: string,
  details?: object,
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
  createFile('output-001.json', '/data/processed/output-001.json', 'json', '890000', { schema: 'v3', records: 4200 }),
  createFile('output-002.json', '/data/processed/output-002.json', 'json', '1200000', { schema: 'v3', records: 5800 }),
  createFile('changelog.md', '/changelog.md', 'markdown', '3400', { encoding: 'utf-8', lastModified: '2026-03-01T08:00:00Z' }),
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
