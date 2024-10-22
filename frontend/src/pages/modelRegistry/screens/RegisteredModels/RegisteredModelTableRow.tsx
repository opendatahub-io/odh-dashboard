import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { FlexItem, Text, TextVariants, Truncate } from '@patternfly/react-core';
import { ModelState, RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import ModelTimestamp from '~/pages/modelRegistry/screens/components/ModelTimestamp';
import {
  registeredModelArchiveDetailsUrl,
  registeredModelArchiveUrl,
  registeredModelUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import ModelLabels from '~/pages/modelRegistry/screens/components/ModelLabels';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { ArchiveRegisteredModelModal } from '~/pages/modelRegistry/screens/components/ArchiveRegisteredModelModal';
import { RestoreRegisteredModelModal } from '~/pages/modelRegistry/screens/components/RestoreRegisteredModel';
import { ModelVersionsTab } from '~/pages/modelRegistry/screens/ModelVersions/const';

type RegisteredModelTableRowProps = {
  registeredModel: RegisteredModel;
  isArchiveRow?: boolean;
  hasDeploys?: boolean;
  refresh: () => void;
};

const RegisteredModelTableRow: React.FC<RegisteredModelTableRowProps> = ({
  registeredModel: rm,
  isArchiveRow,
  hasDeploys = false,
  refresh,
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const rmUrl = registeredModelUrl(rm.id, preferredModelRegistry?.metadata.name);

  const actions: IAction[] = [
    {
      title: 'View details',
      onClick: () => {
        if (isArchiveRow) {
          navigate(
            `${registeredModelArchiveUrl(preferredModelRegistry?.metadata.name)}/${rm.id}/${
              ModelVersionsTab.DETAILS
            }`,
          );
        } else {
          navigate(`${rmUrl}/${ModelVersionsTab.DETAILS}`);
        }
      },
    },
    ...(isArchiveRow
      ? [
          {
            title: 'Restore model',
            onClick: () => setIsRestoreModalOpen(true),
          },
        ]
      : [
          { isSeparator: true },
          {
            title: 'Archive model',
            onClick: () => setIsArchiveModalOpen(true),
            isAriaDisabled: hasDeploys,
            tooltipProps: hasDeploys
              ? { content: 'Models with deployed versions cannot be archived.' }
              : undefined,
          },
        ]),
  ];

  return (
    <Tr>
      <Td dataLabel="Model name">
        <div id="model-name" data-testid="model-name">
          <FlexItem>
            <Link
              to={
                isArchiveRow
                  ? registeredModelArchiveDetailsUrl(rm.id, preferredModelRegistry?.metadata.name)
                  : rmUrl
              }
            >
              <Truncate content={rm.name} />
            </Link>
          </FlexItem>
        </div>
        {rm.description && (
          <Text data-testid="description" component={TextVariants.small}>
            <Truncate content={rm.description} />
          </Text>
        )}
      </Td>
      <Td dataLabel="Labels">
        <ModelLabels customProperties={rm.customProperties} name={rm.name} />
      </Td>
      <Td dataLabel="Last modified">
        <ModelTimestamp timeSinceEpoch={rm.lastUpdateTimeSinceEpoch} />
      </Td>
      <Td dataLabel="Owner">
        <Text data-testid="registered-model-owner">{rm.owner || '-'}</Text>
      </Td>
      <Td isActionCell>
        <ActionsColumn items={actions} />
        {isArchiveModalOpen ? (
          <ArchiveRegisteredModelModal
            onCancel={() => setIsArchiveModalOpen(false)}
            onSubmit={() =>
              apiState.api
                .patchRegisteredModel(
                  {},
                  {
                    state: ModelState.ARCHIVED,
                  },
                  rm.id,
                )
                .then(refresh)
            }
            registeredModelName={rm.name}
          />
        ) : null}
        {isRestoreModalOpen ? (
          <RestoreRegisteredModelModal
            onCancel={() => setIsRestoreModalOpen(false)}
            onSubmit={() =>
              apiState.api
                .patchRegisteredModel(
                  {},
                  {
                    state: ModelState.LIVE,
                  },
                  rm.id,
                )
                .then(() =>
                  navigate(registeredModelUrl(rm.id, preferredModelRegistry?.metadata.name)),
                )
            }
            registeredModelName={rm.name}
          />
        ) : null}
      </Td>
    </Tr>
  );
};

export default RegisteredModelTableRow;
