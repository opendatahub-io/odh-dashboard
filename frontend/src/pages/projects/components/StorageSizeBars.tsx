import * as React from 'react';
import {
  Bullseye,
  Progress,
  ProgressMeasureLocation,
  Spinner,
  Split,
  SplitItem,
  Content,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import { getPvcTotalSize } from '~/pages/projects/utils';
import { usePVCFreeAmount } from '~/api';
import { bytesAsRoundedGiB } from '~/utilities/number';

type StorageSizeBarProps = {
  pvc: PersistentVolumeClaimKind;
};

const StorageSizeBar: React.FC<StorageSizeBarProps> = ({ pvc }) => {
  const [inUseInBytes, loaded, error] = usePVCFreeAmount(pvc);
  const maxValue = getPvcTotalSize(pvc);

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
        <ExclamationCircleIcon
          color="var(--pf-t--global--icon--color--status--danger--default)"
          aria-label="error icon" // Note from PatternFly: icon most likely shouldn't have arialabel
          tabIndex={0}
        />
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
