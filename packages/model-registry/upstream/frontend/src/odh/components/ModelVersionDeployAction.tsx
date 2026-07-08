import React from 'react';
import { Button, ButtonVariant, DropdownItem, FlexItem, Tooltip } from '@patternfly/react-core';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isModelRegistryDeployModalExtension } from '~/odh/extension-points';
import MRDeployFormDataLoader from '~/odh/components/MRDeployFormDataLoader';
import { ModelVersion } from '~/app/types';
import { getDeployButtonState } from '~/odh/utils';

type ModelVersionDeployActionProps = {
  mv: ModelVersion;
  renderAs?: 'button' | 'dropdown-item';
  onRenderModal?: (modal: React.ReactNode) => void;
};

/**
 * Self-contained deploy action component registered as `core.action`.
 *
 * Internally discovers the `model-registry.model-version/deploy-modal`
 * extension (provided by model-serving) to get platform availability
 * and the deploy modal. Renders nothing when no deploy extension is available.
 *
 * Accepts `renderAs` via componentProps to control rendering style:
 * - `'button'` (default) — standalone primary button with tooltip
 * - `'dropdown-item'` — `<DropdownItem>` + `<Divider>` for use inside a `<DropdownList>`
 */
const ModelVersionDeployAction: React.FC<ModelVersionDeployActionProps> = ({
  mv,
  renderAs = 'button',
  onRenderModal,
}) => {
  const [extensions, extensionsLoaded] = useResolvedExtensions(isModelRegistryDeployModalExtension);
  const [openModal, setOpenModal] = React.useState(false);
  const [availablePlatformIds, setAvailablePlatformIds] = React.useState<string[]>([]);
  const buttonState = getDeployButtonState(availablePlatformIds);

  const isAvailable = extensionsLoaded && extensions.length > 0;

  if (!isAvailable) {
    return null;
  }

  const hookNotifiers = extensions.map((extension) => (
    <HookNotify
      key={extension.uid}
      useHook={extension.properties.useAvailablePlatformIds}
      onNotify={(value) => setAvailablePlatformIds(value ?? [])}
    />
  ));

  const createModal = (onClose: () => void) =>
    extensions.map((extension) => (
      <MRDeployFormDataLoader
        key={extension.uid}
        mv={mv}
        renderData={(modelDeployPrefill) => (
          <extension.properties.modalComponent
            modelDeployPrefill={modelDeployPrefill}
            onClose={onClose}
          />
        )}
      />
    ));

  const modal = openModal && createModal(() => setOpenModal(false));

  if (renderAs === 'dropdown-item') {
    const handleDropdownClick = () => {
      if (onRenderModal) {
        onRenderModal(createModal(() => onRenderModal(null)));
      } else {
        setOpenModal(true);
      }
    };

    return (
      <>
        {hookNotifiers}
        <DropdownItem
          onClick={handleDropdownClick}
          isAriaDisabled={!buttonState.enabled}
          tooltipProps={buttonState.tooltip ? { content: buttonState.tooltip } : undefined}
          data-testid="deploy-action-dropdown-item"
        >
          Deploy <strong>{mv.name}</strong>
        </DropdownItem>
        {!onRenderModal && modal}
      </>
    );
  }

  const deployButton = (
    <Button
      id="deploy-button"
      aria-label="Deploy version"
      variant={ButtonVariant.primary}
      onClick={() => setOpenModal(true)}
      isAriaDisabled={!buttonState.enabled}
      data-testid="deploy-button"
    >
      Deploy
    </Button>
  );

  return (
    <>
      {hookNotifiers}
      <FlexItem>
        {buttonState.tooltip ? (
          <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
        ) : (
          deployButton
        )}
      </FlexItem>
      {modal}
    </>
  );
};

export default ModelVersionDeployAction;
