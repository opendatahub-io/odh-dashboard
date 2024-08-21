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
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { ArchiveRegisteredModelModal } from '~/pages/modelRegistry/screens/components/ArchiveRegisteredModelModal';
import { registeredModelsUrl } from '~/pages/modelRegistry/screens/routeUtils';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { RegisteredModel, ModelState } from '~/concepts/modelRegistry/types';

interface ModelVersionsHeaderActionsProps {
  rm: RegisteredModel;
}

const ModelVersionsHeaderActions: React.FC<ModelVersionsHeaderActionsProps> = ({ rm }) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  const navigate = useNavigate();
  const [isOpen, setOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);

  return (
    <>
      <Flex>
        <FlexItem>
          <Dropdown
            isOpen={isOpen}
            onSelect={() => setOpen(false)}
            onOpenChange={(open) => setOpen(open)}
            popperProps={{ position: 'end' }}
            toggle={(toggleRef) => (
              <MenuToggle
                variant="primary"
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
              <DropdownItem
                id="archive-model-button"
                aria-label="Archive model"
                key="archive-model-button"
                onClick={() => setIsArchiveModalOpen(true)}
                ref={tooltipRef}
              >
                Archive model
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </FlexItem>
      </Flex>
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
            .then(() => navigate(registeredModelsUrl(preferredModelRegistry?.metadata.name)))
        }
        isOpen={isArchiveModalOpen}
        registeredModelName={rm.name}
      />
    </>
  );
};

export default ModelVersionsHeaderActions;
