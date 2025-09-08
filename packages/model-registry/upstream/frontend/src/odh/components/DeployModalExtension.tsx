import React from 'react';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isModelRegistryDeployModalExtension } from '~/odh/extension-points';
import MRDeployFormDataLoader from '~/odh/components/MRDeployFormDataLoader';
import { ModelVersion } from '~/app/types';
import { getDeployButtonState } from '~/odh/utils';

type DeployModalExtensionProps = {
  mv: ModelVersion;
  render: (
    buttonState: { enabled?: boolean; tooltip?: string },
    onOpenModal: () => void,
    isModalAvailable: boolean,
  ) => React.ReactNode;
};

const DeployModalExtension: React.FC<DeployModalExtensionProps> = ({ mv, render }) => {
  const [extensions, extensionsLoaded] = useResolvedExtensions(isModelRegistryDeployModalExtension);
  const hookStateActionProvider = React.useMemo(
    () => extensionsLoaded && extensions?.[0]?.properties.useAvailablePlatformIds,
    [extensionsLoaded, extensions],
  );

  const ModalComponent = React.useMemo(
    () => extensionsLoaded && extensions?.[0]?.properties.modalComponent,
    [extensionsLoaded, extensions],
  );

  const [openModal, setOpenModal] = React.useState(false);

  const [availablePlatformIds, setAvailablePlatformIds] = React.useState<string[]>([]);
  const buttonState = getDeployButtonState(availablePlatformIds);

  const onOpenModal = React.useCallback(() => {
    setOpenModal(true);
  }, [setOpenModal]);

  const isModalAvailable = React.useMemo(
    () => extensionsLoaded && extensions.length > 0,
    [extensionsLoaded, extensions],
  );

  return (
    <>
      {hookStateActionProvider ? (
        <HookNotify
          useHook={hookStateActionProvider}
          onNotify={(value) => setAvailablePlatformIds(value ?? [])}
        />
      ) : null}
      {render(buttonState, onOpenModal, isModalAvailable)}
      {openModal && ModalComponent ? (
        <MRDeployFormDataLoader
          mv={mv}
          renderData={(modelDeployPrefill, onSubmit) => (
            <ModalComponent
              modelDeployPrefill={modelDeployPrefill}
              onSubmit={onSubmit}
              onClose={() => setOpenModal(false)}
            />
          )}
        />
      ) : null}
    </>
  );
};

export default DeployModalExtension;
