import React from 'react';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isModelRegistryDeployModalExtension } from '~/odh/extension-points';
import MRDeployFormDataLoader from '~/odh/components/MRDeployFormDataLoader';
import { ModelVersion } from '~/app/types';

const useDeployModalExtension = ({
  mv,
  mvLoaded,
  mvError,
}: {
  mv: ModelVersion;
  mvLoaded: boolean;
  mvError: Error | undefined;
}) => {
  const [extensions, extensionsLoaded] = useResolvedExtensions(isModelRegistryDeployModalExtension);
  const hookStateActionProvider = React.useMemo(
    () => extensionsLoaded && extensions?.[0]?.properties.useDeployButtonState,
    [extensionsLoaded, extensions],
  );
  const ModalComponent = React.useMemo(
    () => extensionsLoaded && extensions?.[0]?.properties.modalComponent,
    [extensionsLoaded, extensions],
  );

  const [openModal, setOpenModal] = React.useState(false);

  const [buttonState, setButtonState] = React.useState<{
    visible: boolean;
    enabled?: boolean;
    tooltip?: string;
  }>();

  const hookNotifyComponent = React.useMemo(
    () =>
      hookStateActionProvider ? (
        <HookNotify useHook={hookStateActionProvider} onNotify={(value) => setButtonState(value)} />
      ) : null,
    [hookStateActionProvider],
  );

  const deployModalComponent = React.useMemo(
    () =>
      openModal && ModalComponent ? (
        <MRDeployFormDataLoader
          mv={mv}
          mvLoaded={mvLoaded}
          mvError={mvError}
          renderData={(data) => <ModalComponent data={data} onClose={() => setOpenModal(false)} />}
        />
      ) : null,
    [openModal, ModalComponent, mv, mvLoaded, mvError],
  );

  const deployModal = React.useMemo(
    () => (
      <>
        {hookNotifyComponent}
        {deployModalComponent}
      </>
    ),
    [hookNotifyComponent, deployModalComponent],
  );

  return {
    deployModal,
    setOpenModal,
    buttonState,
  };
};

export default useDeployModalExtension;
