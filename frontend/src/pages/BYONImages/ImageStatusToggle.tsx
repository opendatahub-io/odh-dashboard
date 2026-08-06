import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { BYONImage } from '#~/types';
import useNotification from '#~/utilities/useNotification';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import DisableLastImageModal from './DisableLastImageModal';
import { isImageEffectivelyEnabled } from './utils';

type ImageStatusToggleProps = {
  image: BYONImage;
  images: BYONImage[];
  onToggle: (visible: boolean) => Promise<void>;
  isDisabledByError?: boolean;
  claimSessionToggleIndex: () => number;
};

const ImageStatusToggle: React.FC<ImageStatusToggleProps> = ({
  image,
  images,
  onToggle,
  isDisabledByError = false,
  claimSessionToggleIndex,
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
    const currentToggleIndex = claimSessionToggleIndex();
    try {
      await onToggle(visible);
      setEnabled(visible);

      const hiddenOotbCountAfter =
        images.filter((img) => img.isOOTB && !img.visible).length +
        (image.isOOTB ? (visible ? -1 : 1) : 0);

      try {
        fireFormTrackingEvent('Workbench Image Visibility Toggled', {
          outcome: TrackingOutcome.submit,
          success: true,
          imageType: image.isOOTB ? 'pre-installed' : 'custom',
          provider: image.provider,
          imageStreamName: image.name,
          toggleDirection: visible ? 'enabled' : 'disabled',
          sessionToggleIndex: currentToggleIndex,
          hiddenOotbCountAfter,
        });
      } catch {
        // noop
      }
    } catch (e) {
      try {
        fireFormTrackingEvent('Workbench Image Visibility Toggled', {
          outcome: TrackingOutcome.submit,
          success: false,
          imageType: image.isOOTB ? 'pre-installed' : 'custom',
          provider: image.provider,
          imageStreamName: image.name,
          toggleDirection: visible ? 'enabled' : 'disabled',
          sessionToggleIndex: currentToggleIndex,
          errorCategory: 'toggle_request_failed',
        });
      } catch {
        // noop
      }
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
