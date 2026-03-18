import React from 'react';
import { Button } from '@patternfly/react-core';
import { mockBinaryArtifact } from '~/app/mocks/mockModelArtifact';
import AutomlModelDetailsModal from './AutomlModelDetailsModal/AutomlModelDetailsModal';

function AutomlResults(): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const artifact = React.useMemo(() => mockBinaryArtifact(), []);

  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => setIsModalOpen(true)}
        data-testid="view-model-details"
      >
        View model details
      </Button>
      <AutomlModelDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        model={artifact}
        rank={1}
      />
    </div>
  );
}

export default AutomlResults;
