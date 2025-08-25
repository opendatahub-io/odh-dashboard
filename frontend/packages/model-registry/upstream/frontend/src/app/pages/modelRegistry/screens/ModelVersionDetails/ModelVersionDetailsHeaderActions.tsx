import * as React from 'react';
import {
  Dropdown,
  DropdownList,
  MenuToggle,
  DropdownItem,
  ButtonVariant,
  ActionList,
  ActionListGroup,
  ActionListItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ModelState, ModelVersion, ModelArtifactList } from '~/app/types';
import { ModelRegistryContext } from '~/app/context/ModelRegistryContext';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ArchiveModelVersionModal } from '~/app/pages/modelRegistry/screens/components/ArchiveModelVersionModal';
import { modelVersionListUrl } from '~/app/pages/modelRegistry/screens/routeUtils';
import { useDeploymentsState } from '~/odh/hooks/useDeploymentsState';
import ArchiveButtonDropdownItem from '~/odh/components/ArchiveButtonDropdownItem';

interface ModelVersionsDetailsHeaderActionsProps {
  mv: ModelVersion;
  refresh: () => void;
  modelArtifacts: ModelArtifactList;
}

const ModelVersionsDetailsHeaderActions: React.FC<ModelVersionsDetailsHeaderActionsProps> = ({
  mv,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  refresh,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  modelArtifacts,
}) => {
  const { deployments } = useDeploymentsState();
  const hasDeployment = deployments && deployments.length > 0;
  const { apiState } = React.useContext(ModelRegistryContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const navigate = useNavigate();
  const [isOpenActionDropdown, setOpenActionDropdown] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);

  if (!preferredModelRegistry) {
    return null;
  }

  return (
    <ActionList className="pf-v5-u-display-flex">
      <ActionListGroup className="pf-v5-u-flex-1">
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
              <ArchiveButtonDropdownItem mv={mv} setIsArchiveModalOpen={setIsArchiveModalOpen} />
            </DropdownList>
          </Dropdown>
        </ActionListItem>
      </ActionListGroup>
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
