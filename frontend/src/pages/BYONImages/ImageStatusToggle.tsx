import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { BYONImage } from '#~/types';
import useNotification from '#~/utilities/useNotification';
import DisableLastImageModal from './DisableLastImageModal';
import { isImageEffectivelyEnabled } from './utils';

type ImageStatusToggleProps = {
  image: BYONImage;
  images: BYONImage[];
  onToggle: (visible: boolean) => Promise<void>;
  isDisabledByError?: boolean;
};

const ImageStatusToggle: React.FC<ImageStatusToggleProps> = ({
  image,
  images,
  onToggle,
  isDisabledByError = false,
}) => {
  const [isLoading, setLoading] = React.useState(false);
  const [isEnabled, setEnabled] = React.useState(!isDisabledByError && image.visible);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const notification = useNotification();

  React.useEffect(() => {
    if (isDisabledByError) {
      setEnabled(false);
    } else {
      setEnabled(image.visible);
    }
  }, [image.visible, isDisabledByError]);

  const isLastEnabledImage = React.useMemo(() => {
    const enabledCount = images.filter(isImageEffectivelyEnabled).length;
    return isImageEffectivelyEnabled(image) && enabledCount === 1;
  }, [images, image]);

  const performToggle = async (visible: boolean) => {
    setLoading(true);
    try {
      await onToggle(visible);
      setEnabled(visible);
    } catch (e) {
      notification.error(
        `Error ${visible ? 'enabling' : 'disabling'} the workbench image`,
        e instanceof Error ? e.message : String(e),
      );
      setEnabled(!visible);
    } finally {
      setLoading(false);
    }
  };

  const performDisable = () => {
    setShowConfirmModal(false);
    performToggle(false);
  };

  const handleChange = (checked: boolean) => {
    if (!checked && isLastEnabledImage) {
      setShowConfirmModal(true);
      return;
    }
    performToggle(checked);
  };

  return (
    <>
      <Switch
        aria-label={`Enable Switch ${image.name}`}
        data-testid={`enabled-disable-${image.id}`}
        isChecked={isEnabled}
        onChange={(_e, value) => handleChange(value)}
        isDisabled={isDisabledByError || isLoading}
      />
      {showConfirmModal && (
        <DisableLastImageModal
          imageName={image.display_name}
          onConfirm={performDisable}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </>
  );
};

export default ImageStatusToggle;
