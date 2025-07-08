import * as React from 'react';
import {
  Dropdown,
  MenuToggle,
  ButtonVariant,
  ActionList,
  ActionListGroup,
  ActionListItem,
  DropdownList,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ModelState, ModelVersion } from '~/app/types';
import { ModelRegistryContext } from '~/app/context/ModelRegistryContext';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ArchiveModelVersionModal } from '~/app/pages/modelRegistry/screens/components/ArchiveModelVersionModal';
import { modelVersionListUrl } from '~/app/pages/modelRegistry/screens/routeUtils';
import { useExtensions } from '@openshift/dynamic-plugin-sdk';
import { isArchiveModelVersionButtonExtension } from '~/odh/extension-points';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';

interface ModelVersionsDetailsHeaderActionsProps {
  mv: ModelVersion;
  refresh: () => void;
  mrName?: string;
}

const ModelVersionsDetailsHeaderActions: React.FC<ModelVersionsDetailsHeaderActionsProps> = ({
  mv,
  // TODO: [Model Serving] Uncomment when model serving is available
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  refresh,
  mrName,
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const navigate = useNavigate();
  const [isOpenActionDropdown, setOpenActionDropdown] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  // TODO: [Model Serving] Uncomment when model serving is available
  // const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);
  const extensions = useExtensions(isArchiveModelVersionButtonExtension);

  if (!preferredModelRegistry) {
    return null;
  }

  return (
    <ActionList className="pf-v5-u-display-flex">
      <ActionListGroup className="pf-v5-u-flex-1">
        {/* // TODO: [Model Serving] Uncomment when model serving is available */}
        {/* <ActionListItem>
          <Button
            id="deploy-button"
            aria-label="Deploy version"
            ref={tooltipRef}
            variant={ButtonVariant.primary}
            onClick={() => setIsDeployModalOpen(true)}
          >
            Deploy
          </Button>
        </ActionListItem> */}
        <ActionListItem>
          <Dropdown
            isOpen={isOpenActionDropdown}
            onSelect={() => setOpenActionDropdown(false)}
            onOpenChange={(open) => setOpenActionDropdown(open)}
            popperProps={{ position: 'right', appendTo: 'inline' }}
            toggle={(toggleRef) => (
              <MenuToggle
                variant={ButtonVariant.secondary}
                ref={toggleRef}
                onClick={() => setOpenActionDropdown(!isOpenActionDropdown)}
                isExpanded={isOpenActionDropdown}
                aria-label="Model version details action toggle"
                data-testid="model-version-details-action-button"
              >
                Actions
              </MenuToggle>
            )}
          >
            <DropdownList>
              {extensions.map((extension) =>
                <LazyCodeRefComponent
                  key={extension.properties.id}
                  component={extension.properties.component}
                  props={{
                    mv,
                    setIsArchiveModalOpen,
                    ref: tooltipRef,
                    mrName,
                  }}
                />
              )}
            </DropdownList>
          </Dropdown>
        </ActionListItem>
      </ActionListGroup>
      {/* // TODO: [Model Serving] Uncomment when model serving is available
      {isDeployModalOpen && (
        <DeployRegisteredModelModal
          onSubmit={() => {
            refresh();
            navigate(
              modelVersionDeploymentsUrl(
                mv.id,
                mv.registeredModelId,
                preferredModelRegistry.metadata.name,
              ),
            );
          }}
          onCancel={() => setIsDeployModalOpen(false)}
          modelVersion={mv}
        />
      )}  */}
      {isArchiveModalOpen && (
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
              .then(() =>
                navigate(modelVersionListUrl(mv.registeredModelId, preferredModelRegistry.name)),
              )
          }
          modelVersionName={mv.name}
        />
      )}
    </ActionList>
  );
};

export default ModelVersionsDetailsHeaderActions;
