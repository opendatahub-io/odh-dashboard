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
import { ArchiveRegisteredModelModal } from '~/pages/modelRegistry/screens/components/ArchiveRegisteredModelModal';
import { registeredModelsRoute } from '~/routes/modelRegistry/registeredModels';
import { RegisteredModel, ModelState } from '~/concepts/modelRegistry/types';
import { ModelRegistriesContext } from '~/concepts/modelRegistry/context/ModelRegistriesContext';
import { ModelRegistryPageContext } from '~/concepts/modelRegistry/context/ModelRegistryPageContext';

interface ModelVersionsHeaderActionsProps {
  rm: RegisteredModel;
  hasDeployments?: boolean;
}

const ModelVersionsHeaderActions: React.FC<ModelVersionsHeaderActionsProps> = ({
  rm,
  hasDeployments = false,
}) => {
  const { apiState } = React.useContext(ModelRegistryPageContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);

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
              <DropdownItem
                id="archive-model-button"
                aria-label="Archive model"
                key="archive-model-button"
                onClick={() => setIsArchiveModalOpen(true)}
                ref={tooltipRef}
                isAriaDisabled={hasDeployments}
                tooltipProps={
                  hasDeployments
                    ? { content: 'Models with deployed versions cannot be archived.' }
                    : undefined
                }
              >
                Archive model
              </DropdownItem>
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
              .then(() => navigate(registeredModelsRoute(preferredModelRegistry?.metadata.name)))
          }
          registeredModelName={rm.name}
        />
      ) : null}
    </>
  );
};

export default ModelVersionsHeaderActions;
