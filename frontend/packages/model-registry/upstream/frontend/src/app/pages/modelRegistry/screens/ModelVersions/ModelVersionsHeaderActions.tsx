import * as React from 'react';
import {
  Dropdown,
  DropdownList,
  MenuToggle,
  DropdownItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ModelState, RegisteredModel } from '~/app/types';
import { ModelRegistryContext } from '~/app/context/ModelRegistryContext';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ArchiveRegisteredModelModal } from '~/app/pages/modelRegistry/screens/components/ArchiveRegisteredModelModal';
import { registeredModelsUrl } from '~/app/pages/modelRegistry/screens/routeUtils';
import ArchiveButtonDropdownItem from '~/odh/components/ArchiveButtonDropdownItem';

interface ModelVersionsHeaderActionsProps {
  rm: RegisteredModel;
  hasDeployments?: boolean;
}

const ModelVersionsHeaderActions: React.FC<ModelVersionsHeaderActionsProps> = ({
  rm,
  hasDeployments = false,
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  const navigate = useNavigate();
  const [isOpen, setOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);

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
              <ArchiveButtonDropdownItem setIsArchiveModalOpen={setIsArchiveModalOpen} />
            </DropdownList>
          </Dropdown>
        </FlexItem>
      </Flex>
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
              .then(() => navigate(registeredModelsUrl(preferredModelRegistry?.name)))
          }
          registeredModelName={rm.name}
        />
      ) : null}
    </>
  );
};

export default ModelVersionsHeaderActions;
