import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { BYONImage } from '#~/types';
import useNotification from '#~/utilities/useNotification';
import { patchOOTBImageStreamHidden } from '#~/api/k8s/imageStreams';
import { useDashboardNamespace } from '#~/redux/selectors';

type OOTBImageStatusToggleProps = {
  image: BYONImage;
};

const OOTBImageStatusToggle: React.FC<OOTBImageStatusToggleProps> = ({ image }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [isLoading, setLoading] = React.useState(false);
  const [isEnabled, setEnabled] = React.useState(image.visible);
  const notification = useNotification();

  React.useEffect(() => {
    setEnabled(image.visible);
  }, [image.visible]);

  const handleChange = (checked: boolean) => {
    setLoading(true);
    patchOOTBImageStreamHidden(dashboardNamespace, image.name, !checked)
      .then(() => {
        setEnabled(checked);
      })
      .catch((e) => {
        notification.error(
          `Error ${checked ? 'enabling' : 'disabling'} the workbench image`,
          e.message,
        );
        setEnabled(!checked);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Switch
      aria-label={`Enable Switch ${image.name}`}
      data-id={`enabled-disable-${image.id}`}
      isChecked={isEnabled}
      onChange={(_e, value) => handleChange(value)}
      isDisabled={isLoading}
    />
  );
};

export default OOTBImageStatusToggle;
