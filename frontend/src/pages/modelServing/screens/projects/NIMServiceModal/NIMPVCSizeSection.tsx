import React from 'react';
import { HelperText, HelperTextItem, StackItem } from '@patternfly/react-core';
import PVSizeField from '#~/pages/projects/components/PVSizeField';
import { MEMORY_UNITS_FOR_SELECTION } from '#~/utilities/valueUnits';

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
      options={MEMORY_UNITS_FOR_SELECTION.filter((option) => option.unit !== 'Mi')} // Filtering out 'Mi'
    />
    <HelperText>
      <HelperTextItem>
        Specify the size of the cluster storage instance that will be created to store the
        downloaded NVIDIA NIM.
      </HelperTextItem>
      <HelperTextItem>
        Make sure your storage size is greater than the NIM size specified by NVIDIA.
      </HelperTextItem>
    </HelperText>
  </StackItem>
);

export default NIMPVCSizeSection;
