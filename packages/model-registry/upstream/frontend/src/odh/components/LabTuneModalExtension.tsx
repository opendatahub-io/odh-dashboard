import React from 'react';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isModelRegistryLabTuneModalExtension } from '~/odh/extension-points/lab-tune';
import { ModelVersion } from '~/app/types';

type LabTuneModalExtensionProps = {
  mv: ModelVersion;
  render: (
    buttonState: { enabled: boolean; tooltip?: string },
    onOpenModal: () => void,
    isModalAvailable: boolean,
  ) => React.ReactNode;
};

const LabTuneModalExtension: React.FC<LabTuneModalExtensionProps> = ({ mv, render }) => {
  const [extensions, extensionsLoaded] = useResolvedExtensions(isModelRegistryLabTuneModalExtension);
  
  const ModalComponent = React.useMemo(() => {
    return extensionsLoaded && extensions?.[0]?.properties.modalComponent;
  }, [extensionsLoaded, extensions]);

  const [openModal, setOpenModal] = React.useState(false);
  const [availability] = React.useState<{ enabled: boolean; tooltip?: string }>({
    enabled: true,
  });

  const onOpenModal = React.useCallback(() => {
    setOpenModal(true);
  }, []);

  const isModalAvailable = React.useMemo(() => {
    return extensionsLoaded && extensions.length > 0;
  }, [extensionsLoaded, extensions]);

  const handleSubmit = React.useCallback(
    (selectedProject: string) => {
      // The LabTuneModal handles navigation internally
      // We just need to pass through to it
    },
    [],
  );

  return (
    <>
      {render(
        { enabled: true }, 
        onOpenModal, 
        isModalAvailable
      )}
      {openModal && ModalComponent ? (
        <ModalComponent
          modelVersion={{
            id: mv.id,
            name: mv.name,
            registeredModelId: mv.registeredModelId,
          }}
          onSubmit={(selectedProject: string) => {
            // Let the LabTuneModal handle the navigation
            handleSubmit(selectedProject);
            setOpenModal(false);
          }}
          onClose={() => setOpenModal(false)}
          loaded={true}
          loadError={null}
        />
      ) : null}
    </>
  );
};

export default LabTuneModalExtension;
