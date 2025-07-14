import * as React from 'react';
import { Button } from '@patternfly/react-core';
import InstallTrustyModal from '#~/concepts/trustyai/content/InstallTrustyModal';
import { UseManageTrustyAICRReturnType } from '#~/concepts/trustyai/useManageTrustyAICR';

type TrustyAIUninstalledStateProps = {
  namespace: string;
  onInstallExistingDB: UseManageTrustyAICRReturnType['installCRForExistingDB'];
  onInstallNewDB: UseManageTrustyAICRReturnType['installCRForNewDB'];
};

const TrustyAIUninstalledState: React.FC<TrustyAIUninstalledStateProps> = ({
  namespace,
  onInstallExistingDB,
  onInstallNewDB,
}) => {
  const [openModal, setOpenModal] = React.useState(false);

  return (
    <>
      <Button
        data-testid="trustyai-configure-button"
        variant="tertiary"
        onClick={() => setOpenModal(true)}
      >
        Configure TrustyAI service
      </Button>
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
