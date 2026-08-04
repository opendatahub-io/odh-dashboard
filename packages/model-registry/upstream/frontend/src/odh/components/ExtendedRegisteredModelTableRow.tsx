import {
  Button,
  Content,
  ContentVariants,
  Divider,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  FlexItem,
  MenuToggle,
  Truncate,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExtensions, LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import {
  isActionExtension,
  isTableColumnExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { ExtensibleActions } from '@odh-dashboard/plugin-core/helpers/ui';
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

const MODEL_REGISTRY_TABLE_COLUMN_GROUP = 'model-registry.registered-models';

const MODEL_VERSION_DEPLOY_GROUP = 'model-registry.version-deploy';

type ExtendedRegisteredModelTableRowProps = {
  registeredModel: RegisteredModel;
  latestModelVersion: ModelVersion | undefined;
  isArchiveRow?: boolean;
  hasDeploys?: boolean;
  loaded?: boolean;
  refresh: () => void;
};

const ExtendedRegisteredModelTableRow: React.FC<ExtendedRegisteredModelTableRowProps> = ({
  registeredModel: rm,
  latestModelVersion,
  isArchiveRow,
  hasDeploys = false,
  loaded = true,
  refresh,
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [isKebabOpen, setKebabOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [deployModal, setDeployModal] = React.useState<React.ReactNode>(null);
  const rmUrl = registeredModelUrl(rm.id, preferredModelRegistry?.name);

  const allColumnExtensions = useExtensions(isTableColumnExtension);
  const columnExtensions = allColumnExtensions.filter(
    (ext) => ext.properties.group === MODEL_REGISTRY_TABLE_COLUMN_GROUP,
  );
  const isModelServingEnabled = columnExtensions.some((extension) =>
    extension.flags?.required?.includes('model-serving-shell'),
  );

  const actionExtensions = useExtensions(isActionExtension);

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
          props={{
            registeredModel: rm,
            preferredModelRegistryName: preferredModelRegistry?.name,
          }}
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
        <Dropdown
          isOpen={isKebabOpen}
          onSelect={() => setKebabOpen(false)}
          onOpenChange={setKebabOpen}
          popperProps={{ position: 'end' }}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              variant="plain"
              onClick={() => setKebabOpen(!isKebabOpen)}
              isExpanded={isKebabOpen}
              aria-label="Kebab toggle"
            >
              <EllipsisVIcon />
            </MenuToggle>
          )}
        >
          <DropdownList>
            <DropdownGroup label="View model information">
              <DropdownItem
                onClick={() =>
                  navigate(
                    isArchiveRow
                      ? registeredModelArchiveDetailsUrl(rm.id, preferredModelRegistry?.name)
                      : rmUrl,
                  )
                }
              >
                Overview
              </DropdownItem>
              <DropdownItem
                onClick={() =>
                  navigate(
                    isArchiveRow
                      ? archiveModelVersionListUrl(rm.id, preferredModelRegistry?.name)
                      : modelVersionListUrl(rm.id, preferredModelRegistry?.name),
                  )
                }
              >
                Versions
              </DropdownItem>
              {!isArchiveRow && isModelServingEnabled && (
                <DropdownItem onClick={() => navigate(`${rmUrl}/deployments`)}>
                  Deployments
                </DropdownItem>
              )}
            </DropdownGroup>
            {latestModelVersion && !isArchiveRow && (
              <DropdownGroup label="Latest version actions">
                <ExtensibleActions
                  actions={actionExtensions}
                  group={MODEL_VERSION_DEPLOY_GROUP}
                  componentProps={{
                    mv: latestModelVersion,
                    renderAs: 'dropdown-item',
                    onRenderModal: setDeployModal,
                  }}
                />
              </DropdownGroup>
            )}
            <Divider />
            {isArchiveRow ? (
              <DropdownItem onClick={() => setIsRestoreModalOpen(true)}>Restore model</DropdownItem>
            ) : (
              <DropdownItem
                onClick={() => setIsArchiveModalOpen(true)}
                isAriaDisabled={!loaded || hasDeploys}
                tooltipProps={
                  loaded && hasDeploys
                    ? { content: 'Models with deployed versions cannot be archived.' }
                    : undefined
                }
              >
                Archive model
              </DropdownItem>
            )}
          </DropdownList>
        </Dropdown>
        {deployModal}
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
