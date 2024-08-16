import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Text, TextVariants, Truncate, FlexItem } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import { ModelVersion, ModelState } from '~/concepts/modelRegistry/types';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import ModelLabels from '~/pages/modelRegistry/screens/components/ModelLabels';
import ModelTimestamp from '~/pages/modelRegistry/screens/components/ModelTimestamp';
import {
  modelVersionArchiveDetailsUrl,
  modelVersionDeploymentsUrl,
  modelVersionUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import { ArchiveModelVersionModal } from '~/pages/modelRegistry/screens/components/ArchiveModelVersionModal';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { getPatchBodyForModelVersion } from '~/pages/modelRegistry/screens/utils';
import { RestoreModelVersionModal } from '~/pages/modelRegistry/screens/components/RestoreModelVersionModal';
import DeployRegisteredModelModal from '~/pages/modelRegistry/screens/components/DeployRegisteredModelModal';

type ModelVersionsTableRowProps = {
  modelVersion: ModelVersion;
  isArchiveRow?: boolean;
  refresh: () => void;
};

const ModelVersionsTableRow: React.FC<ModelVersionsTableRowProps> = ({
  modelVersion: mv,
  isArchiveRow,
  refresh,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
  const { apiState } = React.useContext(ModelRegistryContext);

  const actions = isArchiveRow
    ? [
        {
          title: 'Restore version',
          onClick: () => setIsRestoreModalOpen(true),
        },
      ]
    : [
        {
          title: 'Deploy',
          onClick: () => setIsDeployModalOpen(true),
        },
        {
          title: 'Archive model version',
          onClick: () => setIsArchiveModalOpen(true),
        },
      ];

  return (
    <Tr>
      <Td dataLabel="Version name">
        <div id="model-version-name" data-testid="model-version-name">
          <FlexItem>
            <Link
              to={
                isArchiveRow
                  ? modelVersionArchiveDetailsUrl(
                      mv.id,
                      mv.registeredModelId,
                      preferredModelRegistry?.metadata.name,
                    )
                  : modelVersionUrl(
                      mv.id,
                      mv.registeredModelId,
                      preferredModelRegistry?.metadata.name,
                    )
              }
            >
              <Truncate content={mv.name} />
            </Link>
          </FlexItem>
        </div>
        {mv.description && (
          <Text data-testid="model-version-description" component={TextVariants.small}>
            <Truncate content={mv.description} />
          </Text>
        )}
      </Td>
      <Td dataLabel="Last modified">
        <ModelTimestamp timeSinceEpoch={mv.lastUpdateTimeSinceEpoch} />
      </Td>
      <Td dataLabel="Author">{mv.author}</Td>
      <Td dataLabel="Labels">
        <ModelLabels customProperties={mv.customProperties} name={mv.name} />
      </Td>
      <Td isActionCell>
        <ActionsColumn items={actions} />
        <ArchiveModelVersionModal
          onCancel={() => setIsArchiveModalOpen(false)}
          onSubmit={() =>
            apiState.api
              .patchModelVersion(
                {},
                // TODO remove the getPatchBody* functions when https://issues.redhat.com/browse/RHOAIENG-6652 is resolved
                getPatchBodyForModelVersion(mv, { state: ModelState.ARCHIVED }),
                mv.id,
              )
              .then(refresh)
          }
          isOpen={isArchiveModalOpen}
          modelVersionName={mv.name}
        />
        <DeployRegisteredModelModal
          onSubmit={() =>
            navigate(
              modelVersionDeploymentsUrl(
                mv.id,
                mv.registeredModelId,
                preferredModelRegistry?.metadata.name,
              ),
            )
          }
          onCancel={() => setIsDeployModalOpen(false)}
          isOpen={isDeployModalOpen}
          modelVersion={mv}
        />
        <RestoreModelVersionModal
          onCancel={() => setIsRestoreModalOpen(false)}
          onSubmit={() =>
            apiState.api
              .patchModelVersion(
                {},
                // TODO remove the getPatchBody* functions when https://issues.redhat.com/browse/RHOAIENG-6652 is resolved
                getPatchBodyForModelVersion(mv, { state: ModelState.LIVE }),
                mv.id,
              )
              .then(() =>
                navigate(
                  modelVersionUrl(
                    mv.id,
                    mv.registeredModelId,
                    preferredModelRegistry?.metadata.name,
                  ),
                ),
              )
          }
          isOpen={isRestoreModalOpen}
          modelVersionName={mv.name}
        />
      </Td>
    </Tr>
  );
};

export default ModelVersionsTableRow;
