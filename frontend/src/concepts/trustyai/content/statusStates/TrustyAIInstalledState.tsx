import * as React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import DeleteTrustyAIModal from '#~/concepts/trustyai/content/DeleteTrustyAIModal';

const NO_PERMISSION_TOOLTIP =
  "You don't have permission to configure TrustyAI in this project. To request access, contact your project administrator.";

type TrustyAIInstalledStateProps = {
  uninstalling?: boolean;
  onDelete: () => Promise<void>;
  permissionDenied?: boolean;
};

const TrustyAIInstalledState: React.FC<TrustyAIInstalledStateProps> = ({
  uninstalling,
  onDelete,
  permissionDenied,
}) => {
  const [openModal, setOpenModal] = React.useState(false);

  const button = (
    <Button
      data-testid="trustyai-uninstall-button"
      variant="tertiary"
      isAriaDisabled={permissionDenied || uninstalling}
      isLoading={uninstalling}
      onClick={() => setOpenModal(true)}
    >
      {uninstalling ? 'Uninstalling' : 'Uninstall'} TrustyAI service
    </Button>
  );

  return (
    <>
      {permissionDenied ? <Tooltip content={NO_PERMISSION_TOOLTIP}>{button}</Tooltip> : button}
      {openModal && <DeleteTrustyAIModal onDelete={onDelete} onClose={() => setOpenModal(false)} />}
    </>
  );
};

export default TrustyAIInstalledState;
