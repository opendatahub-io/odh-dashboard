import * as React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import InstallTrustyModal from '#~/concepts/trustyai/content/InstallTrustyModal';
import { UseManageTrustyAICRReturnType } from '#~/concepts/trustyai/useManageTrustyAICR';

const NO_PERMISSION_TOOLTIP =
  "You don't have permission to configure TrustyAI in this project. To request access, contact your project administrator.";

type TrustyAIUninstalledStateProps = {
  namespace: string;
  onInstallExistingDB: UseManageTrustyAICRReturnType['installCRForExistingDB'];
  onInstallNewDB: UseManageTrustyAICRReturnType['installCRForNewDB'];
  permissionDenied?: boolean;
};

const TrustyAIUninstalledState: React.FC<TrustyAIUninstalledStateProps> = ({
  namespace,
  onInstallExistingDB,
  onInstallNewDB,
  permissionDenied,
}) => {
  const [openModal, setOpenModal] = React.useState(false);

  const button = (
    <Button
      data-testid="trustyai-configure-button"
      variant="tertiary"
      isAriaDisabled={permissionDenied}
      onClick={() => setOpenModal(true)}
    >
      Configure TrustyAI service
    </Button>
  );

  return (
    <>
      {permissionDenied ? <Tooltip content={NO_PERMISSION_TOOLTIP}>{button}</Tooltip> : button}
      {openModal && (
        <InstallTrustyModal
          namespace={namespace}
          onInstallExistingDB={onInstallExistingDB}
          onInstallNewDB={onInstallNewDB}
          onClose={() => setOpenModal(false)}
        />
      )}
    </>
  );
};

export default TrustyAIUninstalledState;
