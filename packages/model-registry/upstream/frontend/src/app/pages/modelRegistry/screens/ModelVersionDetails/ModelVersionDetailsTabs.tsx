import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { ExtensibleDetailTabs } from '@odh-dashboard/plugin-core/helpers/ui';
import { ModelVersion, ModelArtifactList, RegisteredModel } from '~/app/types';
import { isModelRegistryVersionDetailsTabExtension } from '~/odh/extension-points/details';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { DEPLOYMENTS_TAB_EXTENSION_ID } from '~/odh/const';
import ModelVersionDetailsView from './ModelVersionDetailsView';
import { ModelVersionDetailsTabTitle, ModelVersionDetailsTab } from './const';

type ModelVersionDetailTabsProps = {
  tab: string;
  registeredModel: RegisteredModel | null;
  modelVersion: ModelVersion;
  isArchiveVersion?: boolean;
  refresh: () => void;
  modelArtifacts: ModelArtifactList;
  modelArtifactsLoaded: boolean;
  modelArtifactsLoadError: Error | undefined;
};

const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps> = ({
  tab,
  registeredModel,
  modelVersion: mv,
  isArchiveVersion,
  refresh,
  modelArtifacts,
  modelArtifactsLoaded,
  modelArtifactsLoadError,
}) => {
  const navigate = useNavigate();
  const tabExtensions = useExtensions(isModelRegistryVersionDetailsTabExtension);
  const { registeredModelId: rmId } = useParams();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  const filterExtension = React.useMemo(
    () =>
      isArchiveVersion
        ? (ext: (typeof tabExtensions)[number]) =>
            ext.properties.id !== DEPLOYMENTS_TAB_EXTENSION_ID
        : undefined,
    [isArchiveVersion],
  );

  return (
    <ExtensibleDetailTabs
      activeKey={tab}
      onSelect={(tabKey) => navigate(`../${tabKey}`, { relative: 'path' })}
      staticTabs={[
        {
          id: ModelVersionDetailsTab.DETAILS,
          title: ModelVersionDetailsTabTitle.DETAILS,
          content: (
            <ModelVersionDetailsView
              registeredModel={registeredModel}
              modelVersion={mv}
              refresh={refresh}
              isArchiveVersion={isArchiveVersion}
              modelArtifacts={modelArtifacts}
              modelArtifactsLoaded={modelArtifactsLoaded}
              modelArtifactsLoadError={modelArtifactsLoadError}
            />
          ),
        },
      ]}
      extensionTabs={tabExtensions}
      componentProps={{ rmId, mvId: mv.id, mrName: preferredModelRegistry?.name }}
      ariaLabel="Model versions details page tabs"
      testId="model-versions-details-page-tabs"
      filterExtension={filterExtension}
    />
  );
};

export default ModelVersionDetailsTabs;
