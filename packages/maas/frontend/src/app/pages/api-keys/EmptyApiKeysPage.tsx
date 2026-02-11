import * as React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { Button } from '@patternfly/react-core';
import CreateApiKeyModal from './CreateApiKeyModal';

const EmptyApiKeysPage: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <EmptyDetailsView
        title="No API keys"
        description="To get started, create an API key."
        imageAlt="create an API key"
        createButton={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Create API key
          </Button>
        }
      />
      <CreateApiKeyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          onRefresh();
        }}
      />
    </>
  );
};

export default EmptyApiKeysPage;
