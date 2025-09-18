import { Button, Content, ContentVariants, FlexItem, Truncate } from '@patternfly/react-core';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExtensions, LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { ModelRegistryContext } from '~/app/context/ModelRegistryContext';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ArchiveRegisteredModelModal } from '~/app/pages/modelRegistry/screens/components/ArchiveRegisteredModelModal';
import ModelLabels from '~/app/pages/modelRegistry/screens/components/ModelLabels';
import ModelTimestamp from '~/app/pages/modelRegistry/screens/components/ModelTimestamp';
import { RestoreRegisteredModelModal } from '~/app/pages/modelRegistry/screens/components/RestoreRegisteredModel';
import {
  archiveModelVersionDetailsUrl,
  archiveModelVersionListUrl,
  modelVersionListUrl,
  modelVersionUrl,
  registeredModelArchiveDetailsUrl,
  registeredModelUrl,
} from '~/app/pages/modelRegistry/screens/routeUtils';
import { ModelState, ModelVersion, RegisteredModel } from '~/app/types';
import { isModelRegistryTableColumnExtension } from '~/odh/extension-points/table';

type ExtendedRegisteredModelTableRowProps = {
  registeredModel: RegisteredModel;
  latestModelVersion: ModelVersion | undefined;
  isArchiveRow?: boolean;
  hasDeploys?: boolean;
  refresh: () => void;
};

const ExtendedRegisteredModelTableRow: React.FC<ExtendedRegisteredModelTableRowProps> = ({
  registeredModel: rm,
  latestModelVersion,
  isArchiveRow,
  hasDeploys = false,
  refresh,
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const rmUrl = registeredModelUrl(rm.id, preferredModelRegistry?.name);

  const columnExtensions = useExtensions(isModelRegistryTableColumnExtension);

  const actions: IAction[] = [
    {
      title: 'Overview',
      onClick: () => {
        navigate(
          isArchiveRow
            ? registeredModelArchiveDetailsUrl(rm.id, preferredModelRegistry?.name)
            : rmUrl,
        );
      },
    },
    {
      title: 'Versions',
      onClick: () => {
        navigate(
          isArchiveRow
            ? archiveModelVersionListUrl(rm.id, preferredModelRegistry?.name)
            : modelVersionListUrl(rm.id, preferredModelRegistry?.name),
        );
      },
    },

    { isSeparator: true },
    ...(isArchiveRow
      ? [
          {
            title: 'Restore model',
            onClick: () => setIsRestoreModalOpen(true),
          },
        ]
      : [
          {
            title: 'Archive model',
            onClick: () => {
                            if (!hasDeploys) {
                              setIsArchiveModalOpen(true);
                            }
                          },
            isAriaDisabled: hasDeploys,
            tooltipProps: hasDeploys
              ? { content: 'Models with deployed versions cannot be archived.' }
              : undefined,
          },
        ]),
  ];

  const handleModelNameNavigation = (rmId: string) =>
    isArchiveRow
      ? navigate(registeredModelArchiveDetailsUrl(rmId, preferredModelRegistry?.name))
      : navigate(rmUrl);

  const handleVersionNameNavigation = (mv: ModelVersion) =>
    isArchiveRow
      ? navigate(
          archiveModelVersionDetailsUrl(mv.id, mv.registeredModelId, preferredModelRegistry?.name),
        )
      : navigate(modelVersionUrl(mv.id, mv.registeredModelId, preferredModelRegistry?.name));

  const renderExtensionColumns = () => {
    if (columnExtensions.length === 0) {
      return null;
    }

    return columnExtensions.map((extension, index) => (
      <Td key={`extension-${index}`}>
        <LazyCodeRefComponent
          component={extension.properties.component}
          props={{ registeredModel: rm }}
        />
      </Td>
    ));
  };

  return (
    <Tr>
      <Td dataLabel="Model name">
        <div id="model-name" data-testid="model-name">
          <FlexItem>
            <Button variant="link" isInline onClick={() => handleModelNameNavigation(rm.id)}>
              <Truncate content={rm.name} />
            </Button>
          </FlexItem>
        </div>
        {rm.description && (
          <Content data-testid="description" component={ContentVariants.small}>
            <Truncate content={rm.description} />
          </Content>
        )}
      </Td>
      <Td dataLabel="Latest version">
        {latestModelVersion ? (
          <div id="latest-version" data-testid="latest-version">
            <FlexItem>
              <Button
                variant="link"
                isInline
                onClick={() => handleVersionNameNavigation(latestModelVersion)}
              >
                <Truncate content={latestModelVersion.name} />
              </Button>
            </FlexItem>
          </div>
        ) : (
          '-'
        )}
      </Td>
      {renderExtensionColumns()}
      <Td dataLabel="Labels">
        <ModelLabels customProperties={rm.customProperties} name={rm.name} />
      </Td>
      <Td dataLabel="Last modified">
        <ModelTimestamp timeSinceEpoch={rm.lastUpdateTimeSinceEpoch} />
      </Td>
      <Td dataLabel="Owner">
        <Content component="p" data-testid="registered-model-owner">
          {rm.owner || '-'}
        </Content>
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
                .then(() => navigate(registeredModelUrl(rm.id, preferredModelRegistry?.name)))
            }
            registeredModelName={rm.name}
          />
        ) : null}
      </Td>
    </Tr>
  );
};

export default ExtendedRegisteredModelTableRow;
