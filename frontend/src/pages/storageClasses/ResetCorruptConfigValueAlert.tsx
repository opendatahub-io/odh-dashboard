import React from 'react';

import { AlertProps, Button } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';

import { StorageClassConfig, StorageClassKind } from '#~/k8sTypes';
import { updateStorageClassConfig } from '#~/api';
import { CorruptedMetadataAlert } from './CorruptedMetadataAlert';

interface ResetCorruptConfigValueAlertProps extends Pick<AlertProps, 'variant'> {
  storageClassName: string;
  storageClassConfig: StorageClassConfig;
  onSuccess: () => Promise<void | StorageClassKind[]>;
  popoverText?: string;
}

export const ResetCorruptConfigValueAlert: React.FC<ResetCorruptConfigValueAlertProps> = ({
  storageClassName,
  storageClassConfig,
  variant,
  popoverText = 'Refresh the field to correct the corrupted metadata.',
  onSuccess,
}) => {
  const [error, setError] = React.useState<string>();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const onClick = React.useCallback(async () => {
    setIsUpdating(true);

    try {
      await updateStorageClassConfig(storageClassName, storageClassConfig);
      await onSuccess();
    } catch {
      setError('Failed to refresh the field. Try again later.');
    } finally {
      setIsUpdating(false);
    }
  }, [storageClassName, storageClassConfig, onSuccess]);

  return (
    <CorruptedMetadataAlert
      variant={variant}
      popoverText={popoverText}
      errorText={error}
      action={
        <Button
          icon={<SyncAltIcon />}
          variant="plain"
          aria-label="Corrupt metadata default reset button"
          isDisabled={isUpdating}
          onClick={onClick}
        />
      }
    />
  );
};
