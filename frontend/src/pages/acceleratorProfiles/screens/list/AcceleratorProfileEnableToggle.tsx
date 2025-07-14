import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import DisableAcceleratorProfileModal from '#~/pages/acceleratorProfiles/screens/list/DisableAcceleratorProfileModal';
import useNotification from '#~/utilities/useNotification';
import { updateAcceleratorProfile } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';

type AcceleratorProfileEnableToggleProps = {
  enabled: boolean;
  name: string;
};

const AcceleratorProfileEnableToggle: React.FC<AcceleratorProfileEnableToggleProps> = ({
  enabled,
  name,
}) => {
  const label = enabled ? 'enabled' : 'stopped';
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isEnabled, setEnabled] = React.useState(enabled);
  const [isLoading, setLoading] = React.useState(false);
  const notification = useNotification();
  const { dashboardNamespace } = useDashboardNamespace();

  const handleChange = (checked: boolean) => {
    setLoading(true);
    updateAcceleratorProfile(name, dashboardNamespace, {
      enabled: checked,
    })
      .then(() => {
        setEnabled(checked);
      })
      .catch((e) => {
        notification.error(
          `Error ${checked ? 'enable' : 'disable'} the accelerator profile`,
          e.message,
        );
        setEnabled(!checked);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <Switch
        aria-label={label}
        data-testid="enable-switch"
        id={`${name}-enable-switch`}
        isChecked={isEnabled}
        isDisabled={isLoading}
        onChange={() => {
          if (isEnabled) {
            setIsModalOpen(true);
          } else {
            handleChange(true);
          }
        }}
      />
      {isModalOpen ? (
        <DisableAcceleratorProfileModal
          data-testid="disable-accelerator-profile-modal"
          onClose={(confirmStatus) => {
            if (confirmStatus) {
              handleChange(false);
            }
            setIsModalOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

export default AcceleratorProfileEnableToggle;
