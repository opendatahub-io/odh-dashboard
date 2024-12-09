import * as React from 'react';
import {
  Dropdown,
  DropdownList,
  MenuToggle,
  DropdownItem,
  Button,
  ButtonVariant,
  ActionList,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ArchiveModelVersionModal } from '~/pages/modelRegistry/screens/components/ArchiveModelVersionModal';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { ModelVersion, ModelState } from '~/concepts/modelRegistry/types';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import {
  modelVersionDeploymentsUrl,
  modelVersionListUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import DeployRegisteredModelModal from '~/pages/modelRegistry/screens/components/DeployRegisteredModelModal';

interface ModelVersionsDetailsHeaderActionsProps {
  mv: ModelVersion;
  hasDeployment?: boolean;
  refresh: () => void;
}

const ModelVersionsDetailsHeaderActions: React.FC<ModelVersionsDetailsHeaderActionsProps> = ({
  mv,
  hasDeployment = false,
  refresh,
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  const navigate = useNavigate();
  const [isOpenActionDropdown, setOpenActionDropdown] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  return (
    <ActionList>
      <Button
        id="deploy-button"
        aria-label="Deploy version"
        ref={tooltipRef}
        variant={ButtonVariant.primary}
        onClick={() => setIsDeployModalOpen(true)}
      >
        Deploy
      </Button>
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
          <DropdownItem
            isAriaDisabled={hasDeployment}
            id="archive-version-button"
            aria-label="Archive model version"
            key="archive-version-button"
            onClick={() => setIsArchiveModalOpen(true)}
            tooltipProps={
              hasDeployment ? { content: 'Deployed model versions cannot be archived' } : undefined
            }
            ref={tooltipRef}
          >
            Archive model version
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {isDeployModalOpen ? (
        <DeployRegisteredModelModal
          onSubmit={() => {
            refresh();
            navigate(
              modelVersionDeploymentsUrl(
                mv.id,
                mv.registeredModelId,
                preferredModelRegistry?.metadata.name,
              ),
            );
          }}
          onCancel={() => setIsDeployModalOpen(false)}
          modelVersion={mv}
        />
      ) : null}
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
              .then(() =>
                navigate(
                  modelVersionListUrl(mv.registeredModelId, preferredModelRegistry?.metadata.name),
                ),
              )
          }
          modelVersionName={mv.name}
        />
      ) : null}
    </ActionList>
  );
};

export default ModelVersionsDetailsHeaderActions;
