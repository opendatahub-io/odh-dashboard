import * as React from 'react';
import { Button } from '@patternfly/react-core';
import DeleteTrustyAIModal from '#~/concepts/trustyai/content/DeleteTrustyAIModal';

type TrustyAIInstalledStateProps = {
  uninstalling?: boolean;
  onDelete: () => Promise<void>;
};

const TrustyAIInstalledState: React.FC<TrustyAIInstalledStateProps> = ({
  uninstalling,
  onDelete,
}) => {
  const [openModal, setOpenModal] = React.useState(false);

  return (
    <>
      <Button
        data-testid="trustyai-uninstall-button"
        variant="tertiary"
        isDisabled={uninstalling}
        isLoading={uninstalling}
        onClick={() => setOpenModal(true)}
      >
        {uninstalling ? 'Uninstalling' : 'Uninstall'} TrustyAI service
      </Button>
      {openModal && <DeleteTrustyAIModal onDelete={onDelete} onClose={() => setOpenModal(false)} />}
    </>
  );
};

export default TrustyAIInstalledState;
