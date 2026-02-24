import React, { useState } from 'react';
import { Button } from '@patternfly/react-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FileExplorer from '~/app/components/common/FileExplorer/FileExplorer.tsx';

const MainPage: React.FC = () => {
  const loadError = undefined;
  const loaded = true;

  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(false);

  return (
    <ApplicationsPage
      title="AutoRAG"
      description={
        <p>Automatically configure and optimize your Retrieval-Augmented Generation workflows.</p>
      }
      empty={false}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <Button key="confirm" variant="primary" onClick={() => setIsFileExplorerOpen(true)}>
        Open FileExplorer
      </Button>
      <FileExplorer
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        onSelect={(files) => null /* eslint-disable-line @typescript-eslint/no-unused-vars */}
      />
    </ApplicationsPage>
  );
};

export default MainPage;
