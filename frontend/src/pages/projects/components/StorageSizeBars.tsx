import * as React from 'react';
import {
  Bullseye,
  Progress,
  ProgressMeasureLocation,
  Spinner,
  Split,
  SplitItem,
  Text,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { PersistentVolumeClaimKind } from '../../../k8sTypes';
import { getPvcTotalSize } from '../utils';
import { usePVCFreeAmount } from '../../../api';
import { bytesAsGB } from '../../../utilities/number';

type StorageSizeBarProps = {
  pvc: PersistentVolumeClaimKind;
};

const StorageSizeBar: React.FC<StorageSizeBarProps> = ({ pvc }) => {
  const [inUseInBytes, loaded, error] = usePVCFreeAmount(pvc);
  const maxValue = getPvcTotalSize(pvc);

  if (!error && isNaN(inUseInBytes)) {
    return (
      <div>
        <Tooltip
          removeFindDomNode
          content="No active storage information at this time, check back later"
        >
          <Text component="small">Max {maxValue}</Text>
        </Tooltip>
      </div>
    );
  }

  const inUseValue = `${bytesAsGB(inUseInBytes)}Gi`;
  const percentage = ((parseFloat(inUseValue) / parseFloat(maxValue)) * 100).toFixed(2);
  const percentageLabel = error ? '' : `Storage is ${percentage}% full`;

  let inUseRender: React.ReactNode;
  if (error) {
    inUseRender = (
      <Tooltip removeFindDomNode content={`Unable to get storage data. ${error.message}`}>
        <ExclamationCircleIcon color="var(--pf-global--danger-color--100)" />
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
          <Text component="small">{inUseRender}</Text>
        </Bullseye>
      </SplitItem>
      <SplitItem isFilled style={{ maxWidth: 200 }}>
        {percentageLabel ? (
          <Tooltip removeFindDomNode content={percentageLabel}>
            {progressBar}
          </Tooltip>
        ) : (
          progressBar
        )}
      </SplitItem>
      <SplitItem>
        <Bullseye>
          <Text component="small">{maxValue}</Text>
        </Bullseye>
      </SplitItem>
    </Split>
  );
};

export default StorageSizeBar;
