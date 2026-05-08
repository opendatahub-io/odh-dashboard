import * as React from 'react';
import { Popover, Spinner, Content, Tooltip, Flex, ContentVariants } from '@patternfly/react-core';
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import {
  getEffectiveCapacityGiB,
  getPvcPercentageUsed,
  getPvcRequestSize,
  getPvcTotalSize,
} from '#~/pages/projects/utils';
import { usePVCFreeAmount } from '#~/api';
import { bytesAsRoundedGiB } from '#~/utilities/number';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import ProgressBarWithLabels from '#~/components/ProgressBarWithLabels';

type StorageSizeBarProps = {
  pvc: PersistentVolumeClaimKind;
};

const StorageSizeBar: React.FC<StorageSizeBarProps> = ({ pvc }) => {
  const [{ usedInBytes: inUseInBytes, capacityInBytes }, loaded, error] = usePVCFreeAmount(pvc);
  const pvcMaxValue = getPvcTotalSize(pvc);
  const requestedValue = getPvcRequestSize(pvc);

  if (pvc.status?.conditions?.find((c) => c.type === 'FileSystemResizePending')) {
    return (
      <Flex>
        <Content component="small">Max {requestedValue}</Content>
        <Popover
          bodyContent="To complete the storage size update, you must connect and run a workbench."
          data-testid="size-warning-popover-text"
        >
          <DashboardPopupIconButton
            icon={<ExclamationTriangleIcon />}
            aria-label="Size warning"
            data-testid="size-warning-popover"
            iconProps={{ status: 'warning' }}
          />
        </Popover>
      </Flex>
    );
  }

  const percentage =
    !error && !Number.isNaN(inUseInBytes)
      ? getPvcPercentageUsed(pvc, inUseInBytes, capacityInBytes)
      : NaN;

  if (loaded && !error && Number.isNaN(percentage)) {
    return (
      <div>
        <Tooltip content="No active storage information at this time, check back later">
          <Content component="small">Max {pvcMaxValue}</Content>
        </Tooltip>
      </div>
    );
  }

  const effectiveCapGiB = getEffectiveCapacityGiB(pvc, capacityInBytes);
  const maxValue = Number.isNaN(effectiveCapGiB)
    ? pvcMaxValue
    : `${bytesAsRoundedGiB(effectiveCapGiB * 1024 ** 3)}GiB`;

  const inUseValue = `${bytesAsRoundedGiB(inUseInBytes)}GiB`;
  const progressValue = Number.isNaN(percentage) ? 0 : percentage;
  const percentageLabel =
    error || !loaded || Number.isNaN(percentage) ? '' : `Storage is ${percentage.toFixed(2)}% full`;

  let inUseRender: React.ReactNode;
  if (error) {
    inUseRender = (
      <Tooltip content={`Unable to get storage data. ${error.message}`}>
        <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
      </Tooltip>
    );
  } else if (!loaded) {
    inUseRender = <Spinner size="sm" />;
  } else {
    inUseRender = inUseValue;
  }

  const progressBar = (
    <ProgressBarWithLabels
      inUseLabel={inUseRender}
      contentComponentVariant={ContentVariants.small}
      maxValueLabel={maxValue}
      aria-label={percentageLabel || 'Storage progress bar'}
      value={progressValue}
    />
  );

  return percentageLabel ? <Tooltip content={percentageLabel}>{progressBar}</Tooltip> : progressBar;
};

export default StorageSizeBar;
