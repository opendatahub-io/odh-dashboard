import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { BYONImage } from '~/types';
import { updateBYONImage } from '~/services/imagesService';
import useNotification from '~/utilities/useNotification';

type BYONImageStatusToggleProps = {
  image: BYONImage;
};

const BYONImageStatusToggle: React.FC<BYONImageStatusToggleProps> = ({ image }) => {
  const [isLoading, setLoading] = React.useState(false);
  const [isEnabled, setEnabled] = React.useState(image.visible);
  const notification = useNotification();
  const handleChange = (checked: boolean) => {
    setLoading(true);
    updateBYONImage({
      name: image.name,
      visible: checked,
      packages: image.packages,
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
      onChange={handleChange}
      isDisabled={isLoading}
    />
  );
};

export default BYONImageStatusToggle;
