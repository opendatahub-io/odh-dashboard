// Modules -------------------------------------------------------------------->

import '@patternfly/react-core/dist/styles/base.css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Flex } from '@patternfly/react-core';
import { clone } from 'es-toolkit';
import FileExplorer from './FileExplorer';
import type { Directory, File, Files, Source, Sources } from './FileExplorer';

// Mocks ---------------------------------------------------------------------->

const mockSource: Source = {
  name: 'Foo connection',
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
  { name: 'path-level-1', path: '/path-level-1' },
  { name: 'path-level-2', path: '/path-level-1/path-level-2' },
  { name: 'path-level-3', path: '/path-level-1/path-level-2/path-level-3' },
];

const mock10Directories: Directory[] = new Array(10).fill(null).map((_, index) => {
  const level = index + 1;
  const path = new Array(level)
    .fill(null)
    .map((__, i) => `path-level-${i + 1}`)
    .join('/');
  return { name: `path-level-${level}`, path: `/${path}` };
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
  { name: 'docs', path: '/docs', items: 6 },
  { name: 'guides', path: '/docs/guides', items: 3 },
  { name: 'api', path: '/docs/api', items: 2 },
  { name: 'reports', path: '/reports', items: 4 },
  { name: '2024', path: '/reports/2024', items: 3 },
  { name: 'data', path: '/data', items: 5 },
  { name: 'raw', path: '/data/raw', items: 3 },
  { name: 'processed', path: '/data/processed', items: 2 },
];
const realisticFiles: Files = [
  { name: 'getting-started.md', path: '/docs/guides/getting-started.md', type: 'markdown', size: '4200' },
  { name: 'deployment.md', path: '/docs/guides/deployment.md', type: 'markdown', size: '8900' },
  { name: 'troubleshooting.md', path: '/docs/guides/troubleshooting.md', type: 'markdown', size: '6100' },
  { name: 'endpoints.md', path: '/docs/api/endpoints.md', type: 'markdown', size: '12400' },
  { name: 'authentication.md', path: '/docs/api/authentication.md', type: 'markdown', size: '5300' },
  { name: 'README.md', path: '/docs/README.md', type: 'markdown', size: '2100' },
  { name: 'q1-summary.pdf', path: '/reports/2024/q1-summary.pdf', type: 'pdf', size: '1048576' },
  { name: 'q2-summary.pdf', path: '/reports/2024/q2-summary.pdf', type: 'pdf', size: '2097152' },
  { name: 'q3-summary.pdf', path: '/reports/2024/q3-summary.pdf', type: 'pdf', size: '1572864' },
  { name: 'annual-overview.pdf', path: '/reports/annual-overview.pdf', type: 'pdf', size: '5242880' },
  { name: 'dataset-001.csv', path: '/data/raw/dataset-001.csv', type: 'csv', size: '34500000' },
  { name: 'dataset-002.csv', path: '/data/raw/dataset-002.csv', type: 'csv', size: '28700000' },
  { name: 'dataset-003.csv', path: '/data/raw/dataset-003.csv', type: 'csv', size: '41200000' },
  { name: 'output-001.json', path: '/data/processed/output-001.json', type: 'json', size: '890000' },
  { name: 'output-002.json', path: '/data/processed/output-002.json', type: 'json', size: '1200000' },
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
    files: realisticFiles,
    directories: realisticDirectories,
    source: mockSource,
  },
];

// App ----------------------------------------------------------------------

const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [filesToRender, setFilesToRender] = useState<Files>(mock20Files);
  const [directoriesToRender, setDirectoriesToRender] = useState<Directory[]>(mockDirectories);
  const [sourceToRender, setSourceToRender] = useState<Source | undefined>(mockSource);
  const [sourcesToRender, setSourcesToRender] = useState<Sources | undefined>(undefined);

  const openScenario = (scenario: Scenario) => {
    setFilesToRender(scenario.files);
    setDirectoriesToRender(scenario.directories);
    setSourceToRender(scenario.source);
    setSourcesToRender(scenario.sources);
    setIsOpen(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <Flex
        style={{ width: 'fit-content' }}
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsMd' }}
      >
        {selectedFiles.length > 0 && (
          <p>Selected files: {selectedFiles.map((f) => f.name).join(', ')}</p>
        )}
        {selectedSource && <p>Selected source: {JSON.stringify(selectedSource)}</p>}
        {scenarios.map((scenario) => (
          <Button key={scenario.label} onClick={() => openScenario(scenario)}>
            Open FileExplorer ({scenario.label})
          </Button>
        ))}
      </Flex>

      <FileExplorer
        files={filesToRender}
        source={sourceToRender}
        sources={sourcesToRender}
        directories={directoriesToRender}
        rootLabel="mock-bucket (root)"
        bucket="mock-bucket"
        path="/documents/reports/2024"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectSource={(source) => {
          setSelectedSource(source);
        }}
        onNavigate={(dir) => {
          // eslint-disable-next-line no-console
          console.log('Navigate to:', dir.path);
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
