import React from 'react';

import { AlertProps, Button } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';

import { StorageClassConfig, StorageClassKind } from '~/k8sTypes';
import { updateStorageClassConfig } from '~/services/StorageClassService';
import { CorruptedMetadataAlert } from './CorruptedMetadataAlert';

interface ResetCorruptConfigValueAlertProps extends Pick<AlertProps, 'variant'> {
  storageClassName: string;
  storageClassConfig: StorageClassConfig;
  refresh: () => Promise<void | StorageClassKind[]>;
}

export const ResetCorruptConfigValueAlert: React.FC<ResetCorruptConfigValueAlertProps> = ({
  storageClassName,
  storageClassConfig,
  variant,
  refresh,
}) => {
  const [error, setError] = React.useState<string>();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const onClick = React.useCallback(async () => {
    setIsUpdating(true);

    try {
      await updateStorageClassConfig(storageClassName, storageClassConfig);
      await refresh();
    } catch {
      setError('Failed to refresh the field. Try again later.');
    } finally {
      setIsUpdating(false);
    }
  }, [storageClassName, storageClassConfig, refresh]);

  return (
    <CorruptedMetadataAlert
      variant={variant}
      popoverText="Refresh the field to correct the corrupted metadata."
      errorText={error}
      action={
        <Button
          variant="plain"
          aria-label="Corrupt metadata default reset button"
          isDisabled={isUpdating}
          onClick={onClick}
        >
          <SyncAltIcon />
        </Button>
      }
    />
  );
};
