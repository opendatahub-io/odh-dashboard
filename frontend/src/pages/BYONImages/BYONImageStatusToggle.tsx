import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { BYONImage } from '#~/types';
import { updateBYONImage } from '#~/services/imagesService';
import useNotification from '#~/utilities/useNotification';

type BYONImageStatusToggleProps = {
  image: BYONImage;
};

const BYONImageStatusToggle: React.FC<BYONImageStatusToggleProps> = ({ image }) => {
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
    updateBYONImage({
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
