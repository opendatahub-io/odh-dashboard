import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import {
  Content,
  ContentVariants,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  FlexItem,
  MenuToggle,
  Truncate,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isActionExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ExtensibleActions } from '@odh-dashboard/plugin-core/helpers/ui';
import { ModelState, ModelVersion } from '~/app/types';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ModelRegistryContext } from '~/app/context/ModelRegistryContext';
import {
  archiveModelVersionDetailsUrl,
  modelVersionArchiveDetailsUrl,
  modelVersionUrl,
} from '~/app/pages/modelRegistry/screens/routeUtils';
import ModelTimestamp from '~/app/pages/modelRegistry/screens/components/ModelTimestamp';
import ModelLabels from '~/app/pages/modelRegistry/screens/components/ModelLabels';
import { ArchiveModelVersionModal } from '~/app/pages/modelRegistry/screens/components/ArchiveModelVersionModal';
import { RestoreModelVersionModal } from '~/app/pages/modelRegistry/screens/components/RestoreModelVersionModal';

const MODEL_VERSION_DEPLOY_GROUP = 'model-registry.version-deploy';

type ModelVersionsTableRowProps = {
  modelVersion: ModelVersion;
  isArchiveRow?: boolean;
  isArchiveModel?: boolean;
  hasDeployment?: boolean;
  loaded?: boolean;
  refresh: () => void;
};

const ModelVersionsTableRow: React.FC<ModelVersionsTableRowProps> = ({
  modelVersion: mv,
  isArchiveRow,
  isArchiveModel,
  hasDeployment,
  loaded = true,
  refresh,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { apiState } = React.useContext(ModelRegistryContext);
  const actionExtensions = useExtensions(isActionExtension);

  const [isKebabOpen, setKebabOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [deployModal, setDeployModal] = React.useState<React.ReactNode>(null);

  if (!preferredModelRegistry) {
    return null;
  }

  return (
    <Tr>
      <Td dataLabel="Version name">
        <div id="model-version-name" data-testid="model-version-name">
          <FlexItem>
            <Link
              to={
                isArchiveModel
                  ? archiveModelVersionDetailsUrl(
                      mv.id,
                      mv.registeredModelId,
                      preferredModelRegistry.name,
                    )
                  : isArchiveRow
                    ? modelVersionArchiveDetailsUrl(
                        mv.id,
                        mv.registeredModelId,
                        preferredModelRegistry.name,
                      )
                    : modelVersionUrl(mv.id, mv.registeredModelId, preferredModelRegistry.name)
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
              {!isArchiveRow && (
                <ExtensibleActions
                  actions={actionExtensions}
                  group={MODEL_VERSION_DEPLOY_GROUP}
                  componentProps={{ mv, renderAs: 'dropdown-item', onRenderModal: setDeployModal }}
                />
              )}
              {isArchiveRow ? (
                <DropdownItem
                  data-testid="restore-model-version-action"
                  onClick={() => setIsRestoreModalOpen(true)}
                >
                  Restore model version
                </DropdownItem>
              ) : (
                <>
                  <Divider />
                  <DropdownItem
                    data-testid="archive-model-version-action"
                    onClick={() => setIsArchiveModalOpen(true)}
                    isAriaDisabled={!loaded || hasDeployment}
                    tooltipProps={
                      loaded && hasDeployment
                        ? { content: 'Deployed model versions cannot be archived' }
                        : undefined
                    }
                  >
                    Archive model version
                  </DropdownItem>
                </>
              )}
            </DropdownList>
          </Dropdown>
          {deployModal}
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
                      modelVersionUrl(mv.id, mv.registeredModelId, preferredModelRegistry.name),
                    ),
                  )
              }
              modelVersionName={mv.name}
            />
          ) : null}
        </Td>
      )}
    </Tr>
  );
};

export default ModelVersionsTableRow;
