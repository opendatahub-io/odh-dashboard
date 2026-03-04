import '@patternfly/react-core/dist/styles/base.css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@patternfly/react-core';
import FileExplorer, { Files } from './FileExplorer';

const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => setIsOpen(true)}>Open FileExplorer</Button>
      {selectedFiles.length > 0 && <p>Selected: {selectedFiles.map((f) => f.name).join(', ')}</p>}
      <FileExplorer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={(files) => {
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
