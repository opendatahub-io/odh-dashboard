import React from 'react';
import { Dropdown, DropdownGroup, DropdownItem, MenuToggle, Tooltip } from '@patternfly/react-core';
import { FlagIcon, PencilAltIcon, RedoIcon } from '@patternfly/react-icons';
import { FeatureFlagProps } from '~/types';
import { DashboardCommonConfig } from '~/k8sTypes';
import FeatureFlagModal from './FeatureFlags/FeatureFlagModal';

export type FeatureFlagLauncherProps = FeatureFlagProps & {
  dashboardConfig: Partial<DashboardCommonConfig>;
};

const FeatureFlagLauncher: React.FC<FeatureFlagLauncherProps> = ({
  dashboardConfig,
  devFeatureFlags,
  setDevFeatureFlag,
  resetDevFeatureFlags,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isModalOpen, setModalOpen] = React.useState(false);

  const checkLoading = React.useCallback(
    () => typeof dashboardConfig === 'object' && Object.keys(dashboardConfig).length === 0,
    [dashboardConfig],
  );

  const [isLoading, setIsLoading] = React.useState(checkLoading);

  React.useEffect(() => {
    setIsLoading(checkLoading());
  }, [dashboardConfig, checkLoading]);

  const toggle = (
    <MenuToggle
      aria-label="Feature Flag Launcher"
      variant="plain"
      onClick={() => !isLoading && setIsOpen(!isOpen)}
      isExpanded={isOpen}
      style={{ width: 'auto' }}
      isDisabled={isLoading}
    >
      <FlagIcon />
    </MenuToggle>
  );

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(isOpenChange) => setIsOpen(isOpenChange)}
        onSelect={() => setIsOpen(false)}
        toggle={(toggleRef) =>
          isLoading ? (
            <Tooltip content="Loading feature flags..." triggerRef={toggleRef} position="bottom">
              {React.cloneElement(toggle, { ref: toggleRef })}
            </Tooltip>
          ) : (
            <Tooltip content="Feature Flags" triggerRef={toggleRef} position="bottom">
              {React.cloneElement(toggle, { ref: toggleRef })}
            </Tooltip>
          )
        }
        shouldFocusToggleOnSelect
        popperProps={{ position: 'right', appendTo: 'inline' }}
      >
        <DropdownGroup label="Feature Flags" data-testid="application-feature-flag-group">
          <DropdownItem
            key="edit"
            onClick={() => {
              setModalOpen(true);
            }}
            isDisabled={isLoading}
          >
            <PencilAltIcon /> Edit Flags
          </DropdownItem>
          <DropdownItem
            key="restore"
            onClick={() => {
              resetDevFeatureFlags();
            }}
            isDisabled={isLoading}
          >
            <RedoIcon /> Restore Flags to default values
          </DropdownItem>
        </DropdownGroup>
      </Dropdown>
      {isModalOpen && !isLoading ? (
        <FeatureFlagModal
          dashboardConfig={dashboardConfig}
          devFeatureFlags={devFeatureFlags}
          setDevFeatureFlag={setDevFeatureFlag}
          resetDevFeatureFlags={resetDevFeatureFlags}
          onClose={() => {
            setModalOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

export default FeatureFlagLauncher;

// TODO:  inhale the devfeatureflags banner:  take the modal into it's own component;
// and use the same component for the launcher.  also:  show this to katie edwards for ux feedback
