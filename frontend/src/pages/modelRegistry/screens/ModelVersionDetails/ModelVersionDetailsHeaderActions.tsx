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
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import StartRunModal from '~/pages/pipelines/global/modelCustomization/startRunModal/StartRunModal';
import { useModelVersionTuningData } from '~/concepts/modelRegistry/hooks/useModelVersionTuningData';
import { getModelCustomizationPath } from '~/routes/pipelines/modelCustomization';

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
  const [isLabTuneModalOpen, setIsLabTuneModalOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  const isKServeOciEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_OCI);
  const isFineTuningEnabled = useIsAreaAvailable(SupportedArea.FINE_TUNING);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const isLabTuneEnabled = isKServeOciEnabled && isFineTuningEnabled;

  const { tuningData, loaded, loadError } = useModelVersionTuningData(
    isLabTuneModalOpen ? mv.id : null,
    mv,
  );

  if (!preferredModelRegistry) {
    return null;
  }

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
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {isLabTuneEnabled && (
        <Button
          id="lab-tune-button"
          aria-label="Lab tune version"
          variant={ButtonVariant.secondary}
          onClick={() => setIsLabTuneModalOpen(true)}
          data-testid="lab-tune-button"
        >
          Lab tune
        </Button>
      )}
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
      {isLabTuneModalOpen ? (
        <StartRunModal
          onCancel={() => setIsLabTuneModalOpen(false)}
          onSubmit={(selectedProject) => {
            navigate(
              `${getModelCustomizationPath(selectedProject)}?${new URLSearchParams(
                tuningData!,
              ).toString()}`,
            );
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
