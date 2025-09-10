import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [extensions, extensionsLoaded] = useResolvedExtensions(isModelRegistryDeployModalExtension);

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

  const handleSubmit = React.useCallback(() => {
    setOpenModal(false);
    // Redirect to deployments page after successful deployment
    navigate('/modelServing');
  }, [navigate]);

  return (
    <>
      {extensions.map((extension) => {
        return extension.properties.useAvailablePlatformIds && (
          <HookNotify
            key={extension.uid}
            useHook={extension.properties.useAvailablePlatformIds}
            onNotify={(value) => setAvailablePlatformIds(value ?? [])}
          />
        )
      })}
      {render(buttonState, onOpenModal, isModalAvailable)}
      {openModal && extensions.map((extension) => {
        return extension.properties.modalComponent && (
          <MRDeployFormDataLoader
            key={extension.uid}
            mv={mv}
            renderData={(modelDeployPrefill, onSubmit) => (
              <extension.properties.modalComponent.default
                modelDeployPrefill={modelDeployPrefill}
                onSubmit={() => {
                  onSubmit();
                  handleSubmit();
                }}
                onClose={() => setOpenModal(false)}
              />
            )}
          />
        )
      })}
    </>
  );
};

export default DeployModalExtension;
