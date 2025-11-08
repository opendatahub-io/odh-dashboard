import React from 'react';
import { Dropdown, DropdownGroup, DropdownItem, MenuToggle, Tooltip } from '@patternfly/react-core';
import { FlagIcon, PencilAltIcon, RedoIcon } from '@patternfly/react-icons';
import type { FeatureFlagProps } from '#~/types';
import { DashboardCommonConfig } from '#~/k8sTypes';
import FeatureFlagModal from '#~/app/featureFlags/FeatureFlagModal';

// import './AppLauncher.scss';

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

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(isOpenChange) => setIsOpen(isOpenChange)}
        onSelect={() => setIsOpen(false)}
        toggle={(toggleRef) => (
          <Tooltip content="Feature Flags" triggerRef={toggleRef} position="bottom">
            <MenuToggle
              aria-label="Feature Flag Launcher"
              variant="plain"
              ref={toggleRef}
              onClick={() => setIsOpen(!isOpen)}
              isExpanded={isOpen}
            >
              <FlagIcon />
            </MenuToggle>
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
            icon={<PencilAltIcon />}
          >
            Edit Flags
          </DropdownItem>
          <DropdownItem
            key="restore"
            onClick={() => {
              resetDevFeatureFlags(true);
            }}
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
