import * as React from 'react';
import {
  Dropdown,
  DropdownList,
  MenuToggle,
  DropdownItem,
  Flex,
  FlexItem,
  Divider,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ModelState, RegisteredModel, ModelVersion } from '~/app/types';
import { ModelRegistryContext } from '~/app/context/ModelRegistryContext';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ArchiveRegisteredModelModal } from '~/app/pages/modelRegistry/screens/components/ArchiveRegisteredModelModal';
import { registeredModelsUrl } from '~/app/pages/modelRegistry/screens/routeUtils';
import ArchiveButtonDropdownItem from '~/odh/components/ArchiveButtonDropdownItem';
import DeployModalExtension from '~/odh/components/DeployModalExtension';
import '../RegisteredModels/RegisteredModelTableRow.scss';

interface ModelVersionsHeaderActionsProps {
  rm: RegisteredModel;
  latestModelVersion?: ModelVersion;
  hasDeployments?: boolean;
}

const ModelVersionsHeaderActions: React.FC<ModelVersionsHeaderActionsProps> = ({
  rm,
  latestModelVersion,
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
                      <>
                        <DropdownItem
                          isDisabled
                          className="model-registry-section-header"
                        >
                          Latest version actions
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => {
                            onOpenModal();
                            setOpen(false);
                          }}
                          isAriaDisabled={!buttonState.enabled}
                          tooltipProps={buttonState.tooltip ? { content: buttonState.tooltip } : undefined}
                        >
                          Deploy <strong>{latestModelVersion.name}</strong>
                        </DropdownItem>
                        <Divider />
                      </>
                    )}
                    <ArchiveButtonDropdownItem setIsArchiveModalOpen={setIsArchiveModalOpen} />
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
                  aria-label="Model action toggle"
                  data-testid="model-action-toggle"
                >
                  Actions
                </MenuToggle>
              )}
            >
              <DropdownList>
                <ArchiveButtonDropdownItem setIsArchiveModalOpen={setIsArchiveModalOpen} />
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
