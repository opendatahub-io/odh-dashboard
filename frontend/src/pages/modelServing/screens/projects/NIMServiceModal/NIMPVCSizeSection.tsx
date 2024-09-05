import React from 'react';
import { HelperText, HelperTextItem, StackItem } from '@patternfly/react-core';
import PVSizeField from '~/pages/projects/components/PVSizeField';

type NIMPVCSizeSectionProps = {
  pvcSize: string;
  setPvcSize: (value: string) => void;
};

const NIMPVCSizeSection: React.FC<NIMPVCSizeSectionProps> = ({ pvcSize, setPvcSize }) => (
  <StackItem>
    <PVSizeField
      fieldID="pvc-size"
      size={pvcSize}
      setSize={(value: string) => setPvcSize(value)}
      label="NVIDIA NIM storage size"
    />
    <HelperText>
      <HelperTextItem>
        Specify the size of the cluster storage instance that will be created to store the
        downloaded NVIDIA NIM.
      </HelperTextItem>
    </HelperText>
  </StackItem>
);

export default NIMPVCSizeSection;
