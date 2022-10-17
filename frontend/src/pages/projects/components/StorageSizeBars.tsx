import * as React from 'react';
import {
  Bullseye,
  Progress,
  ProgressMeasureLocation,
  Split,
  SplitItem,
  Text,
} from '@patternfly/react-core';
import { PersistentVolumeClaimKind } from '../../../k8sTypes';
import { getPvcTotalSize } from '../utils';

type StorageSizeBarProps = {
  pvc: PersistentVolumeClaimKind;
};

const StorageSizeBar: React.FC<StorageSizeBarProps> = ({ pvc }) => {
  const inUseValue = '0Gi'; // TODO: Setup prometheus query for info
  const maxValue = getPvcTotalSize(pvc);
  const percentage = (parseFloat(inUseValue) / parseFloat(maxValue)) * 100;

  return (
    <Split hasGutter>
      <SplitItem>
        <Bullseye>
          <Text component="small">{inUseValue}</Text>
        </Bullseye>
      </SplitItem>
      <SplitItem isFilled style={{ maxWidth: 200 }}>
        <Progress
          aria-label={`Storage is ${percentage} full`}
          measureLocation={ProgressMeasureLocation.none}
          value={percentage}
          style={{ gridGap: 0 }} // PF issue with split & measureLocation
        />
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
