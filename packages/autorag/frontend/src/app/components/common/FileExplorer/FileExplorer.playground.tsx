import '@patternfly/react-core/dist/styles/base.css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Flex } from '@patternfly/react-core';
import { clone } from 'es-toolkit';
import FileExplorer from './FileExplorer';
import type { Directory, File, Files, Source, Sources } from './FileExplorer.tsx';

const App: React.FC = () => {
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
    type: 'markdown',
    size: '1000000000',
  };

  const mock20Files: Files = new Array(20).fill(null).map((_, index) => {
    const newFile = clone(mockFile);
    newFile.name = newFile.name.replace('000', String(index + 1));
    return newFile;
  });
  const mock100Files: Files = new Array(100).fill(null).map((_, index) => {
    const newFile = clone(mockFile);
    newFile.name = newFile.name.replace('000', String(index + 1));
    return newFile;
  });
  const mock1000Files: Files = new Array(1000).fill(null).map((_, index) => {
    const newFile = clone(mockFile);
    newFile.name = newFile.name.replace('000', String(index + 1));
    return newFile;
  });

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

  const [isOpen, setIsOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [filesToRender, setFilesToRender] = useState<Files>(mock20Files);
  const [directoriesToRender, setDirectoriesToRender] = useState<Directory[]>(mockDirectories);
  const [sourceToRender, setSourceToRender] = useState<Source | undefined>(mockSource);
  const [sourcesToRender, setSourcesToRender] = useState<Sources | undefined>(undefined);

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
        <Button
          onClick={() => {
            setFilesToRender(mock20Files);
            setDirectoriesToRender(mockDirectories);
            setSourceToRender(mockSource);
            setSourcesToRender(undefined);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (20 files)
        </Button>
        <Button
          onClick={() => {
            setFilesToRender(mock100Files);
            setDirectoriesToRender(mockDirectories);
            setSourceToRender(mockSource);
            setSourcesToRender(undefined);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (100 files)
        </Button>
        <Button
          onClick={() => {
            setFilesToRender(mock1000Files);
            setDirectoriesToRender(mockDirectories);
            setSourceToRender(mockSource);
            setSourcesToRender(undefined);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (1000 files)
        </Button>
        <Button
          onClick={() => {
            setFilesToRender(mock20Files);
            setDirectoriesToRender(mock10Directories);
            setSourceToRender(mockSource);
            setSourcesToRender(undefined);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (10 nested levels)
        </Button>
        <Button
          onClick={() => {
            setFilesToRender(mock20Files);
            setDirectoriesToRender(mockDirectories);
            setSourceToRender(undefined);
            setSourcesToRender(mockSources);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (multiple sources, none selected)
        </Button>
        <Button
          onClick={() => {
            setFilesToRender(mock20Files);
            setDirectoriesToRender(mockDirectories);
            setSourceToRender(mockSource);
            setSourcesToRender(undefined);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (source selected)
        </Button>
        <Button
          onClick={() => {
            setFilesToRender(mock20Files);
            setDirectoriesToRender(mockDirectories);
            setSourceToRender(undefined);
            setSourcesToRender(undefined);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (no source, no sources)
        </Button>
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
