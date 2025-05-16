import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Content, ContentVariants, Truncate, FlexItem } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import { ModelVersion, ModelState, RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import ModelLabels from '~/pages/modelRegistry/screens/components/ModelLabels';
import ModelTimestamp from '~/pages/modelRegistry/screens/components/ModelTimestamp';
import {
  modelVersionDeploymentsRoute,
  modelVersionRoute,
} from '~/routes/modelRegistry/modelVersions';
import { archiveModelVersionDetailsRoute } from '~/routes/modelRegistry/modelArchive';
import { modelVersionArchiveDetailsRoute } from '~/routes/modelRegistry/modelVersionArchive';
import { ArchiveModelVersionModal } from '~/pages/modelRegistry/screens/components/ArchiveModelVersionModal';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { RestoreModelVersionModal } from '~/pages/modelRegistry/screens/components/RestoreModelVersionModal';
import DeployRegisteredVersionModal from '~/pages/modelRegistry/screens/components/DeployRegisteredVersionModal';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import StartRunModal from '~/pages/pipelines/global/modelCustomization/startRunModal/StartRunModal';
import { useModelVersionTuningData } from '~/concepts/modelRegistry/hooks/useModelVersionTuningData';
import { getModelCustomizationPath } from '~/routes/pipelines/modelCustomization';
import { isOciModelUri } from '~/pages/modelServing/utils';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import useDeployButtonState from '~/pages/modelServing/screens/projects/useDeployButtonState';

type ModelVersionsTableRowProps = {
  modelVersion: ModelVersion;
  registeredModel: RegisteredModel;
  isArchiveRow?: boolean;
  isArchiveModel?: boolean;
  hasDeployment?: boolean;
  refresh: () => void;
};

const ModelVersionsTableRow: React.FC<ModelVersionsTableRowProps> = ({
  modelVersion: mv,
  registeredModel,
  isArchiveRow,
  isArchiveModel,
  hasDeployment = false,
  refresh,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { apiState } = React.useContext(ModelRegistryContext);
  const isFineTuningEnabled = useIsAreaAvailable(SupportedArea.FINE_TUNING).status;

  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
  const [tuningModelVersionId, setTuningModelVersionId] = React.useState<string | null>(null);

  const [modelArtifacts] = useModelArtifactsByVersionId(mv.id);
  const isOciModel = isOciModelUri(modelArtifacts.items.map((artifact) => artifact.uri)[0]);
  const deployButtonState = useDeployButtonState(isOciModel);

  const { tuningData, loaded, loadError } = useModelVersionTuningData(
    tuningModelVersionId,
    tuningModelVersionId === mv.id ? mv : null,
    registeredModel,
  );

  if (!preferredModelRegistry) {
    return null;
  }

  const deployAction = deployButtonState.visible
    ? [
        {
          title: 'Deploy',
          onClick: () => setIsDeployModalOpen(true),
          isAriaDisabled: !deployButtonState.enabled,
          tooltipProps: !deployButtonState.enabled
            ? { content: deployButtonState.tooltip }
            : undefined,
        },
      ]
    : [];

  const actions: IAction[] = isArchiveRow
    ? [
        {
          title: 'Restore model version',
          onClick: () => setIsRestoreModalOpen(true),
        },
      ]
    : [
        ...deployAction,
        ...(isFineTuningEnabled
          ? [
              {
                title: 'LAB-tune',
                onClick: () => setTuningModelVersionId(mv.id),
              },
            ]
          : []),
        { isSeparator: true },
        {
          title: 'Archive model version',
          onClick: () => setIsArchiveModalOpen(true),
          isAriaDisabled: hasDeployment,
          tooltipProps: hasDeployment
            ? { content: 'Deployed versions cannot be archived' }
            : undefined,
        },
      ];

  return (
    <Tr>
      <Td dataLabel="Version name">
        <div id="model-version-name" data-testid="model-version-name">
          <FlexItem>
            <Link
              to={
                isArchiveModel
                  ? archiveModelVersionDetailsRoute(
                      mv.id,
                      mv.registeredModelId,
                      preferredModelRegistry.metadata.name,
                    )
                  : isArchiveRow
                  ? modelVersionArchiveDetailsRoute(
                      mv.id,
                      mv.registeredModelId,
                      preferredModelRegistry.metadata.name,
                    )
                  : modelVersionRoute(
                      mv.id,
                      mv.registeredModelId,
                      preferredModelRegistry.metadata.name,
                    )
              }
            >
              <Truncate content={mv.name} />
            </Link>
          </FlexItem>
        </div>
        {mv.description && (
          <Content data-testid="model-version-description" component={ContentVariants.small}>
            <Truncate content={mv.description} />
          </Content>
        )}
      </Td>
      <Td dataLabel="Last modified">
        <ModelTimestamp timeSinceEpoch={mv.lastUpdateTimeSinceEpoch} />
      </Td>
      <Td dataLabel="Author">{mv.author}</Td>
      <Td dataLabel="Labels">
        <ModelLabels customProperties={mv.customProperties} name={mv.name} />
      </Td>
      {!isArchiveModel && (
        <Td isActionCell>
          <ActionsColumn items={actions} />
          {isArchiveModalOpen ? (
            <ArchiveModelVersionModal
              onCancel={() => setIsArchiveModalOpen(false)}
              onSubmit={() =>
                apiState.api
                  .patchModelVersion(
                    {},
                    {
                      state: ModelState.ARCHIVED,
                    },
                    mv.id,
                  )
                  .then(refresh)
              }
              modelVersionName={mv.name}
            />
          ) : null}
          {isDeployModalOpen ? (
            <DeployRegisteredVersionModal
              onSubmit={() => {
                navigate(
                  modelVersionDeploymentsRoute(
                    mv.id,
                    mv.registeredModelId,
                    preferredModelRegistry.metadata.name,
                  ),
                );
              }}
              onCancel={() => setIsDeployModalOpen(false)}
              modelVersion={mv}
            />
          ) : null}
          {isRestoreModalOpen ? (
            <RestoreModelVersionModal
              onCancel={() => setIsRestoreModalOpen(false)}
              onSubmit={() =>
                apiState.api
                  .patchModelVersion(
                    {},
                    {
                      state: ModelState.LIVE,
                    },
                    mv.id,
                  )
                  .then(() =>
                    navigate(
                      modelVersionRoute(
                        mv.id,
                        mv.registeredModelId,
                        preferredModelRegistry.metadata.name,
                      ),
                    ),
                  )
              }
              modelVersionName={mv.name}
            />
          ) : null}
          {tuningModelVersionId && (
            <StartRunModal
              onCancel={() => setTuningModelVersionId(null)}
              onSubmit={(selectedProject) => {
                navigate(getModelCustomizationPath(selectedProject), { state: tuningData });
              }}
              loaded={loaded}
              loadError={loadError}
            />
          )}
        </Td>
      )}
    </Tr>
  );
};

export default ModelVersionsTableRow;
