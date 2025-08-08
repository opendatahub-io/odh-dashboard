import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { BYONImage } from '#~/types';
import useNotification from '#~/utilities/useNotification';
import { updateBYONImageStream } from '#~/api/k8s/imageStreams.ts';
import { useDashboardNamespace } from '#~/redux/selectors';

type BYONImageStatusToggleProps = {
  image: BYONImage;
};

const BYONImageStatusToggle: React.FC<BYONImageStatusToggleProps> = ({ image }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [isLoading, setLoading] = React.useState(false);
  const [isEnabled, setEnabled] = React.useState(!image.error && image.visible);
  const notification = useNotification();

  React.useEffect(() => {
    if (image.error) {
      setEnabled(false);
    }
  }, [image.error]);

  const handleChange = (checked: boolean) => {
    setLoading(true);
    updateBYONImageStream(dashboardNamespace, {
      name: image.name,
      visible: checked,
    })
      .then(() => {
        setEnabled(checked);
      })
      .catch((e) => {
        notification.error(
          `Error ${checked ? 'enable' : 'disable'} the serving runtime`,
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
      onChange={(e, value) => handleChange(value)}
      isDisabled={!!image.error || isLoading}
    />
  );
};

export default BYONImageStatusToggle;
