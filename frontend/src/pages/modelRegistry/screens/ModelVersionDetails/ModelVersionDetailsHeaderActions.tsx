import * as React from 'react';
import {
  Dropdown,
  DropdownList,
  MenuToggle,
  DropdownItem,
  Button,
  ButtonVariant,
  ActionList,
  ActionListItem,
  ActionListGroup,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ArchiveModelVersionModal } from '~/pages/modelRegistry/screens/components/ArchiveModelVersionModal';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { ModelVersion, ModelState, RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import {
  modelVersionDeploymentsUrl,
  modelVersionListUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import DeployRegisteredModelModal from '~/pages/modelRegistry/screens/components/DeployRegisteredModelModal';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import StartRunModal from '~/pages/pipelines/global/modelCustomization/startRunModal/StartRunModal';
import { useModelVersionTuningData } from '~/concepts/modelRegistry/hooks/useModelVersionTuningData';
import { getModelCustomizationPath } from '~/routes/pipelines/modelCustomization';

interface ModelVersionsDetailsHeaderActionsProps {
  mv: ModelVersion;
  registeredModel: RegisteredModel | null;
  hasDeployment?: boolean;
  refresh: () => void;
}

const ModelVersionsDetailsHeaderActions: React.FC<ModelVersionsDetailsHeaderActionsProps> = ({
  mv,
  registeredModel,
  hasDeployment = false,
  refresh,
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const navigate = useNavigate();
  const [isOpenActionDropdown, setOpenActionDropdown] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
  const [isLabTuneModalOpen, setIsLabTuneModalOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  const isFineTuningEnabled = useIsAreaAvailable(SupportedArea.FINE_TUNING).status;

  const { tuningData, loaded, loadError } = useModelVersionTuningData(
    isLabTuneModalOpen ? mv.id : null,
    mv,
    registeredModel,
  );

  if (!preferredModelRegistry) {
    return null;
  }

  return (
    <ActionList className="pf-v5-u-display-flex">
      <ActionListGroup className="pf-v5-u-flex-1">
        <ActionListItem>
          <Button
            id="deploy-button"
            aria-label="Deploy version"
            ref={tooltipRef}
            variant={ButtonVariant.primary}
            onClick={() => setIsDeployModalOpen(true)}
          >
            Deploy
          </Button>
        </ActionListItem>
        {isFineTuningEnabled && (
          <ActionListItem
            className="pf-v5-u-w-100"
            data-testid="lab-tune-button"
            aria-label="Lab tune version"
          >
            <Button variant="secondary" onClick={() => setIsLabTuneModalOpen(true)}>
              LAB tune
            </Button>
          </ActionListItem>
        )}
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
              <DropdownItem
                isAriaDisabled={hasDeployment}
                id="archive-version-button"
                aria-label="Archive model version"
                key="archive-version-button"
                onClick={() => setIsArchiveModalOpen(true)}
                tooltipProps={
                  hasDeployment
                    ? { content: 'Deployed model versions cannot be archived' }
                    : undefined
                }
                ref={tooltipRef}
              >
                Archive model version
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </ActionListItem>
      </ActionListGroup>
      {isLabTuneModalOpen ? (
        <StartRunModal
          onCancel={() => setIsLabTuneModalOpen(false)}
          onSubmit={(selectedProject) => {
            navigate(getModelCustomizationPath(selectedProject), { state: tuningData });
          }}
          loaded={loaded}
          loadError={loadError}
        />
      ) : null}
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
      )}
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
                navigate(
                  modelVersionListUrl(mv.registeredModelId, preferredModelRegistry.metadata.name),
                ),
              )
          }
          modelVersionName={mv.name}
        />
      )}
    </ActionList>
  );
};

export default ModelVersionsDetailsHeaderActions;
