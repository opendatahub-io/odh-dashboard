import * as React from 'react';
import {
  Dropdown,
  DropdownGroup,
  DropdownList,
  MenuToggle,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isActionExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ExtensibleActions } from '@odh-dashboard/plugin-core/helpers/ui';
import { ModelState, RegisteredModel, ModelVersion } from '~/app/types';
import { ModelRegistryContext } from '~/app/context/ModelRegistryContext';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ArchiveRegisteredModelModal } from '~/app/pages/modelRegistry/screens/components/ArchiveRegisteredModelModal';
import { modelRegistryUrl } from '~/app/pages/modelRegistry/screens/routeUtils';
import ArchiveButtonDropdownItem from '~/odh/components/ArchiveButtonDropdownItem';

const MODEL_VERSION_DEPLOY_GROUP = 'model-registry.version-deploy';

interface ModelVersionsHeaderActionsProps {
  rm: RegisteredModel;
  latestModelVersion?: ModelVersion;
}

const ModelVersionsHeaderActions: React.FC<ModelVersionsHeaderActionsProps> = ({
  rm,
  latestModelVersion,
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const navigate = useNavigate();
  const [isOpen, setOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [deployModal, setDeployModal] = React.useState<React.ReactNode>(null);
  const actionExtensions = useExtensions(isActionExtension);

  return (
    <>
      <Flex>
        <FlexItem>
          <Dropdown
            isOpen={isOpen}
            onSelect={() => setOpen(false)}
            onOpenChange={(open) => setOpen(open)}
            popperProps={{ position: 'end', appendTo: 'inline' }}
            toggle={(toggleRef) => (
              <MenuToggle
                variant="secondary"
                ref={toggleRef}
                onClick={() => setOpen(!isOpen)}
                isExpanded={isOpen}
                aria-label="Model version action toggle"
                data-testid="model-version-action-toggle"
              >
                Actions
              </MenuToggle>
            )}
          >
            <DropdownList>
              {latestModelVersion && (
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
              <ArchiveButtonDropdownItem setIsArchiveModalOpen={setIsArchiveModalOpen} />
            </DropdownList>
          </Dropdown>
        </FlexItem>
      </Flex>
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
              .then(() => navigate(modelRegistryUrl(preferredModelRegistry?.name)))
          }
          registeredModelName={rm.name}
        />
      ) : null}
    </>
  );
};

export default ModelVersionsHeaderActions;
