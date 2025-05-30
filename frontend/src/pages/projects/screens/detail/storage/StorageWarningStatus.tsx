import * as React from 'react';
import { Bullseye, Button, Icon, Popover } from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { usePVCFreeAmount } from '#~/api';
import { getPvcTotalSize } from '#~/pages/projects/utils';
import { bytesAsRoundedGiB } from '#~/utilities/number';
import { getFullStatusFromPercentage } from './utils';
import useStorageStatusAlert from './useStorageStatusAlert';

type StorageWarningStatusProps = {
  obj: PersistentVolumeClaimKind;
  onAddPVC: () => void;
  onEditPVC: (pvc: PersistentVolumeClaimKind) => void;
};

const StorageWarningStatus: React.FC<StorageWarningStatusProps> = ({
  obj,
  onEditPVC,
  onAddPVC,
}) => {
  const [inUseInBytes, loaded] = usePVCFreeAmount(obj);
  const percentage = loaded
    ? Number(
        ((bytesAsRoundedGiB(inUseInBytes) / parseFloat(getPvcTotalSize(obj))) * 100).toFixed(2),
      )
    : NaN;
  useStorageStatusAlert(obj, percentage);

  const percentageStatus = getFullStatusFromPercentage(percentage);

  if (!percentageStatus) {
    return null;
  }

  let renderIcon: React.ReactNode;
  let popoverHeader: React.ReactNode;
  let popoverBody: React.ReactNode;
  if (percentageStatus === 'error') {
    renderIcon = (
      <Icon status="danger">
        <ExclamationCircleIcon />
      </Icon>
    );
    popoverHeader = `Storage full`;
    popoverBody = 'Save actions will fail and you can no longer write new data.';
  } else {
    popoverHeader = `Storage ${percentage}% full`;
    popoverBody =
      'Once storage is 100% full, you will no longer be able to write new data and save actions will fail.';
    if (percentageStatus === 'warning') {
      renderIcon = (
        <Icon status="warning">
          <ExclamationTriangleIcon />
        </Icon>
      );
    } else {
      renderIcon = (
        <Icon status="info">
          <InfoCircleIcon />
        </Icon>
      );
    }
  }

  return (
    <Popover
      position="right"
      headerIcon={<Bullseye>{renderIcon}</Bullseye>}
      headerContent={popoverHeader}
      bodyContent={popoverBody}
      footerContent={(hide) => (
        <>
          To increase available storage, delete files,{' '}
          <Button
            isInline
            variant="link"
            onClick={() => {
              hide();
              onEditPVC(obj);
            }}
          >
            edit storage size
          </Button>
          , or{' '}
          <Button
            isInline
            variant="link"
            onClick={() => {
              hide();
              onAddPVC();
            }}
          >
            add new cluster storage
          </Button>
          .
        </>
      )}
    >
      <Bullseye>{renderIcon}</Bullseye>
    </Popover>
  );
};

export default StorageWarningStatus;
