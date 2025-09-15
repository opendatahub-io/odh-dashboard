import * as React from 'react';
import {
  Dropdown,
  DropdownGroup,
  DropdownList,
  MenuToggle,
  DropdownItem,
  Flex,
  FlexItem,
  Divider,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ModelState, RegisteredModel, ModelVersion } from '~/app/types';
import { ModelRegistryContext } from '~/app/context/ModelRegistryContext';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ArchiveRegisteredModelModal } from '~/app/pages/modelRegistry/screens/components/ArchiveRegisteredModelModal';
import { registeredModelsUrl } from '~/app/pages/modelRegistry/screens/routeUtils';
import DeployModalExtension from '~/odh/components/DeployModalExtension';

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

  return (
    <>
      <Flex>
        <FlexItem>
          {latestModelVersion ? (
            <DeployModalExtension
              mv={latestModelVersion}
              render={(buttonState, onOpenModal, isModalAvailable) => (
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
                      aria-label="Model action toggle"
                      data-testid="model-action-toggle"
                    >
                      Actions
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    {isModalAvailable && (
                      <DropdownItem
                        onClick={() => {
                          setOpen(false);
                          onOpenModal();
                        }}
                        isAriaDisabled={!buttonState?.enabled}
                        tooltipProps={buttonState?.tooltip ? { content: buttonState.tooltip } : undefined}
                      >
                        Deploy <strong>{latestModelVersion.name}</strong>
                      </DropdownItem>
                    )}
                    {isModalAvailable && <Divider />}
                    <DropdownItem onClick={() => setIsArchiveModalOpen(true)}>Archive model</DropdownItem>
                  </DropdownList>
                </Dropdown>
              )}
            />
          ) : (
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
                <DropdownGroup>
                  <DropdownItem onClick={() => setIsArchiveModalOpen(true)}>Archive model</DropdownItem>
                </DropdownGroup>
              </DropdownList>
            </Dropdown>
          )}
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
