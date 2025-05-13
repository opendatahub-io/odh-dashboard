import React from 'react';
import { Dropdown, DropdownItem, MenuToggle } from '@patternfly/react-core';
import { FlagIcon } from '@patternfly/react-icons';
import './AppLauncher.scss';
import { FeatureFlagModalProps } from '~/types';
import FeatureFlagModal from './FeatureFlags/FeatureFlagModal';

const FeatureFlagLauncher: React.FCReact.FC<FeatureFlagModalProps> = ({
  dashboardConfig,
  devFeatureFlags,
  setDevFeatureFlag,
  resetDevFeatureFlags,
  onClose,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // TODO:  actually pass the props in!!!!  then retest TODO
  const [isModalOpen, setModalOpen] = React.useState(false);

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(isOpenChange) => setIsOpen(isOpenChange)}
        onSelect={() => setIsOpen(false)}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            aria-label="Feature Flag Launcher"
            variant="plain"
            onClick={() => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            style={{ width: 'auto' }}
          >
            <FlagIcon />
          </MenuToggle>
        )}
        shouldFocusToggleOnSelect
        popperProps={{ position: 'right', appendTo: 'inline' }}
      >
        <DropdownItem
          key="edit"
          onClick={() => {
            /* handle edit flags */
            console.log('edit flags here TODO');
            setModalOpen(true);
          }}
        >
          Edit Flags
        </DropdownItem>
        <DropdownItem
          key="restore"
          onClick={() => {
            /* handle restore flags */
            console.log('restore flags here TODO');
            resetDevFeatureFlags();
          }}
        >
          Restore Flags to default values
        </DropdownItem>
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

// TODO:  inhale the devfeatureflags banner:  take the modal into it's own component;
// and use the same component for the launcher.  also:  show this to katie edwards for ux feedback
