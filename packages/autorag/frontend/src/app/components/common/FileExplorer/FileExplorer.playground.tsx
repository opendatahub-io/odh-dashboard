import '@patternfly/react-core/dist/styles/base.css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Flex } from '@patternfly/react-core';
import { clone } from 'es-toolkit';
import FileExplorer from './FileExplorer';
import type { File, Files, Source } from './FileExplorer.tsx';

const App: React.FC = () => {
  const mockSource: Source = {
    name: 'Foo connection',
    count: 999999999,
  };

  const mockFile: File = {
    path: '',
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

  const [isOpen, setIsOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [filesToRender, setFilesToRender] = useState<Files>(mock20Files);

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
            setIsOpen(true);
          }}
        >
          Open FileExplorer (20 files)
        </Button>
        <Button
          onClick={() => {
            setFilesToRender(mock100Files);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (100 files)
        </Button>
        <Button
          onClick={() => {
            setFilesToRender(mock1000Files);
            setIsOpen(true);
          }}
        >
          Open FileExplorer (1000 files)
        </Button>
      </Flex>

      <FileExplorer
        files={filesToRender}
        source={mockSource}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectSource={(source) => {
          setSelectedSource(source);
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
