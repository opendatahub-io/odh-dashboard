import { Radio, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { toAccessModeFullName } from '#~/pages/projects/screens/detail/storage/AccessModeFullName.tsx';

type AccessModeRadioProps = {
  id: string;
  name: string;
  accessMode: AccessMode;
  isDisabled: boolean;
  isChecked: boolean;
  onChange: () => void;
};

const AccessModeRadio: React.FC<AccessModeRadioProps> = ({
  id,
  name,
  accessMode,
  isDisabled,
  isChecked,
  onChange,
}) => {
  const radioField = (
    <Radio
      id={id}
      name={name}
      data-testid={id}
      isDisabled={isDisabled}
      isChecked={isChecked}
      onChange={onChange}
      label={toAccessModeFullName(accessMode)}
    />
  );
  if (isDisabled) {
    return (
      <Tooltip
        content={`${toAccessModeFullName(accessMode)} isn't enabled in the selected storage class.`}
      >
        {radioField}
      </Tooltip>
    );
  }
  return radioField;
};

export default AccessModeRadio;
