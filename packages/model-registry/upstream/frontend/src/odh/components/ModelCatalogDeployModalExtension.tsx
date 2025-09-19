import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isModelCatalogDeployModalExtension } from '~/odh/extension-points';
import { CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
import { getDeployButtonState } from '~/odh/utils';
import { useCatalogModelArtifacts } from '~/app/hooks/modelCatalog/useCatalogModelArtifacts';
import { decodeParams } from '~/app/pages/modelCatalog/utils/modelCatalogUtils';

type ModelCatalogDeployModalExtensionProps = {
  model: CatalogModel;
  render: (
    buttonState: { enabled?: boolean; tooltip?: string },
    onOpenModal: () => void,
    isModalAvailable: boolean,
  ) => React.ReactNode;
};

const ModelCatalogDeployModalExtension: React.FC<ModelCatalogDeployModalExtensionProps> = ({
  model,
  render,
}) => {
  const navigate = useNavigate();
  const [extensions, extensionsLoaded] = useResolvedExtensions(isModelCatalogDeployModalExtension);

  const [openModal, setOpenModal] = React.useState(false);

  const [availablePlatformIds, setAvailablePlatformIds] = React.useState<string[]>([]);
  const buttonState = getDeployButtonState(availablePlatformIds, true);

  const onOpenModal = React.useCallback(() => {
    setOpenModal(true);
  }, [setOpenModal]);

  const isModalAvailable = React.useMemo(
    () => extensionsLoaded && extensions.length > 0,
    [extensionsLoaded, extensions],
  );

  const params = useParams<CatalogModelDetailsParams>();
  const decodedParams = decodeParams(params);
  const [artifacts, artifactLoaded, artifactsLoadError] = useCatalogModelArtifacts(
    decodedParams.sourceId || '',
    encodeURIComponent(`${decodedParams.modelName}`),
  );
  const uri = artifacts.items.length > 0 ? artifacts.items[0].uri : '';
  const loaded = isModalAvailable && artifactLoaded && !artifactsLoadError;


  // Create model deploy prefill info for catalog model
  const modelDeployPrefill = React.useMemo(() => {
    // For catalog models, we need to create a ModelDeployPrefillInfo
    // The model.url should contain the model artifact URI
    return {
      data: {
        modelName: model.name,
        modelArtifactUri: uri,
        connectionTypeName: uri?.includes('oci://') ? 'oci' : 's3',
      },
      loaded: true,
      error: undefined,
    };
  }, [model]);

  const handleSubmit = React.useCallback(() => {
    setOpenModal(false);
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
      {render(buttonState, onOpenModal, loaded)}
      {openModal && extensions.map((extension) => {
        return extension.properties.modalComponent && (
          <extension.properties.modalComponent
            key={extension.uid}
            modelDeployPrefill={modelDeployPrefill}
            onSubmit={handleSubmit}
            onClose={() => setOpenModal(false)}
          />
        )
      })}
    </>
  );
};

export default ModelCatalogDeployModalExtension;
