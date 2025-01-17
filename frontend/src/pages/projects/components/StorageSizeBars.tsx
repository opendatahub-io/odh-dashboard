import * as React from 'react';
import {
  Bullseye,
  Popover,
  Progress,
  ProgressMeasureLocation,
  Spinner,
  Split,
  SplitItem,
  Content,
  Tooltip,
  Flex,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import { getPvcRequestSize, getPvcTotalSize } from '~/pages/projects/utils';
import { usePVCFreeAmount } from '~/api';
import { bytesAsRoundedGiB } from '~/utilities/number';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

type StorageSizeBarProps = {
  pvc: PersistentVolumeClaimKind;
};

const StorageSizeBar: React.FC<StorageSizeBarProps> = ({ pvc }) => {
  const [inUseInBytes, loaded, error] = usePVCFreeAmount(pvc);
  const maxValue = getPvcTotalSize(pvc);
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

  if (!error && Number.isNaN(inUseInBytes)) {
    return (
      <div>
        <Tooltip content="No active storage information at this time, check back later">
          <Content component="small">Max {maxValue}</Content>
        </Tooltip>
      </div>
    );
  }

  const inUseValue = `${bytesAsRoundedGiB(inUseInBytes)}GiB`;
  const percentage = ((parseFloat(inUseValue) / parseFloat(maxValue)) * 100).toFixed(2);
  const percentageLabel = error ? '' : `Storage is ${percentage}% full`;

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
    <Progress
      aria-label={percentageLabel || 'Storage progress bar'}
      measureLocation={ProgressMeasureLocation.none}
      value={Number(percentage)}
      style={{ gridGap: 0 }} // PF issue with split & measureLocation
    />
  );

  return (
    <Split hasGutter>
      <SplitItem>
        <Bullseye>
          <Content component="small">{inUseRender}</Content>
        </Bullseye>
      </SplitItem>
      <SplitItem isFilled style={{ maxWidth: 200 }}>
        {percentageLabel ? <Tooltip content={percentageLabel}>{progressBar}</Tooltip> : progressBar}
      </SplitItem>
      <SplitItem>
        <Bullseye>
          <Content component="small">{maxValue}</Content>
        </Bullseye>
      </SplitItem>
    </Split>
  );
};

export default StorageSizeBar;
