import * as React from 'react';
import { Dropdown, DropdownList, MenuToggle, DropdownItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ArchiveModelVersionModal } from '~/pages/modelRegistry/screens/components/ArchiveModelVersionModal';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { ModelVersion, ModelState } from '~/concepts/modelRegistry/types';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import {
  modelVersionArchiveDetailsUrl,
  modelVersionDeploymentsUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import DeployRegisteredModelModal from '~/pages/modelRegistry/screens/components/DeployRegisteredModelModal';

interface ModelVersionsDetailsHeaderActionsProps {
  mv: ModelVersion;
  refresh: () => void;
}

const ModelVersionsDetailsHeaderActions: React.FC<ModelVersionsDetailsHeaderActionsProps> = ({
  mv,
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
    <>
      <Dropdown
        isOpen={isOpenActionDropdown}
        onSelect={() => setOpenActionDropdown(false)}
        onOpenChange={(open) => setOpenActionDropdown(open)}
        popperProps={{ position: 'right' }}
        toggle={(toggleRef) => (
          <MenuToggle
            variant="primary"
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
            id="deploy-button"
            aria-label="Deploy version"
            key="deploy-button"
            onClick={() => setIsDeployModalOpen(true)}
            ref={tooltipRef}
          >
            Deploy
          </DropdownItem>
          <DropdownItem
            id="archive-version-button"
            aria-label="Archive version"
            key="archive-version-button"
            onClick={() => setIsArchiveModalOpen(true)}
            ref={tooltipRef}
          >
            Archive version
          </DropdownItem>
        </DropdownList>
      </Dropdown>
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
        isOpen={isDeployModalOpen}
        modelVersion={mv}
      />
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
                modelVersionArchiveDetailsUrl(
                  mv.id,
                  mv.registeredModelId,
                  preferredModelRegistry?.metadata.name,
                ),
              ),
            )
        }
        isOpen={isArchiveModalOpen}
        modelVersionName={mv.name}
      />
    </>
  );
};

export default ModelVersionsDetailsHeaderActions;
