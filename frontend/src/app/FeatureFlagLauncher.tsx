import React from 'react';
import { Dropdown, DropdownGroup, DropdownItem, MenuToggle, Tooltip } from '@patternfly/react-core';
import { FlagIcon, PencilAltIcon, RedoIcon } from '@patternfly/react-icons';
import { FeatureFlagProps } from '~/types';
import { DashboardCommonConfig } from '~/k8sTypes';
import FeatureFlagModal from './FeatureFlags/FeatureFlagModal';
import './AppLauncher.scss';

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

  const toggle = (
    <MenuToggle
      aria-label="Feature Flag Launcher"
      variant="plain"
      onClick={() => setIsOpen(!isOpen)}
      isExpanded={isOpen}
      style={{ width: 'auto' }}
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
        toggle={(toggleRef) => (
          <Tooltip content="Feature Flags" triggerRef={toggleRef} position="bottom">
            {React.cloneElement(toggle, { ref: toggleRef })}
          </Tooltip>
        )}
        shouldFocusToggleOnSelect
        popperProps={{ position: 'right', appendTo: 'inline' }}
      >
        <DropdownGroup label="Feature Flags" data-testid="application-dev-feature-flag-group">
          <DropdownItem
            key="edit"
            onClick={() => {
              setModalOpen(true);
            }}
            className="odh-launcher__dropdown-item"
            icon={<PencilAltIcon />}
          >
            Edit Flags
          </DropdownItem>
          <DropdownItem
            key="restore"
            onClick={() => {
              resetDevFeatureFlags();
            }}
            className="odh-launcher__dropdown-item"
            icon={<RedoIcon />}
          >
            Restore Flags to default values
          </DropdownItem>
        </DropdownGroup>
      </Dropdown>
      {isModalOpen ? (
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
