import React from 'react';
import { Dropdown, DropdownItem, MenuToggle, Tooltip } from '@patternfly/react-core';
import { FlagIcon } from '@patternfly/react-icons';
import { FeatureFlagProps } from '~/types';
import FeatureFlagModal from './FeatureFlags/FeatureFlagModal';

const FeatureFlagLauncher: React.FC<FeatureFlagProps> = ({
  dashboardConfig,
  devFeatureFlags,
  setDevFeatureFlag,
  resetDevFeatureFlags,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isModalOpen, setModalOpen] = React.useState(false);

  console.log('in LAUNCHER: devFeatureFlags', devFeatureFlags, dashboardConfig);

  const checkLoading = () =>
    dashboardConfig === null ||

    (typeof dashboardConfig === 'object' && Object.keys(dashboardConfig).length === 0);

  const [isLoading, setIsLoading] = React.useState(checkLoading);

  React.useEffect(() => {
    setIsLoading(checkLoading());
    console.log('sigh; in useEffect:', dashboardConfig);
  }, [dashboardConfig]);

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
            <Tooltip content="Loading feature flags..." triggerRef={toggleRef}>
              {React.cloneElement(toggle, { ref: toggleRef })}
            </Tooltip>
          ) : (
            React.cloneElement(toggle, { ref: toggleRef })
          )
        }
        shouldFocusToggleOnSelect
        popperProps={{ position: 'right', appendTo: 'inline' }}
      >
        <DropdownItem
          key="edit"
          onClick={() => {
            setModalOpen(true);
            console.log('edit flags here TODO');
          }}
          isDisabled={isLoading}
        >
          Edit Flags
        </DropdownItem>
        <DropdownItem
          key="restore"
          onClick={() => {
            resetDevFeatureFlags();
          }}
          isDisabled={isLoading}
        >
          Restore Flags to default values
        </DropdownItem>
      </Dropdown>
      {isModalOpen && devFeatureFlags ? (
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
