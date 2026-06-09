import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { ExtensibleDetailTabs } from '@odh-dashboard/plugin-core/helpers/ui';
import ModelDetailsView from '~/app/pages/modelRegistry/screens/ModelVersions/ModelDetailsView';
import { ModelVersion, RegisteredModel } from '~/app/types';
import {
  ModelVersionsTab,
  ModelVersionsTabTitle,
} from '~/app/pages/modelRegistry/screens/ModelVersions/const';
import ModelVersionListView from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersionListView';
import { isModelRegistryDetailsTabExtension } from '~/odh/extension-points/details';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { DEPLOYMENTS_TAB_EXTENSION_ID } from '~/odh/const';

type ModelVersionsTabProps = {
  tab: ModelVersionsTab | string;
  registeredModel: RegisteredModel;
  modelVersions: ModelVersion[];
  isArchiveModel?: boolean;
  refresh: () => void;
  mvRefresh: () => void;
};

const ModelVersionsTabs: React.FC<ModelVersionsTabProps> = ({
  tab,
  registeredModel: rm,
  modelVersions,
  refresh,
  isArchiveModel,
  mvRefresh,
}) => {
  const navigate = useNavigate();
  const tabExtensions = useExtensions(isModelRegistryDetailsTabExtension);
  const { registeredModelId: rmId } = useParams();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  const filterExtension = React.useMemo(
    () =>
      isArchiveModel
        ? (ext: (typeof tabExtensions)[number]) =>
            ext.properties.id !== DEPLOYMENTS_TAB_EXTENSION_ID
        : undefined,
    [isArchiveModel],
  );

  return (
    <ExtensibleDetailTabs
      activeKey={tab}
      onSelect={(tabKey) => navigate(`../${tabKey}`, { relative: 'path' })}
      staticTabs={[
        {
          id: ModelVersionsTab.OVERVIEW,
          title: ModelVersionsTabTitle.OVERVIEW,
          content: (
            <ModelDetailsView
              registeredModel={rm}
              refresh={refresh}
              isArchiveModel={isArchiveModel}
            />
          ),
        },
        {
          id: ModelVersionsTab.VERSIONS,
          title: ModelVersionsTabTitle.VERSIONS,
          content: (
            <ModelVersionListView
              isArchiveModel={isArchiveModel}
              modelVersions={modelVersions}
              registeredModel={rm}
              refresh={mvRefresh}
            />
          ),
        },
      ]}
      extensionTabs={tabExtensions}
      componentProps={{ rmId, mrName: preferredModelRegistry?.name }}
      ariaLabel="Model versions page tabs"
      testId="model-versions-page-tabs"
      filterExtension={filterExtension}
    />
  );
};
export default ModelVersionsTabs;
