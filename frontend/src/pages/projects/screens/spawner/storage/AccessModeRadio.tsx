import { Radio, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { ACCESS_MODE_RADIO_NAMES } from './constants';

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
  if (isDisabled) {
    return (
      <Tooltip
        content={`${ACCESS_MODE_RADIO_NAMES[accessMode]} isn't enabled in the selected storage class.`}
      >
        <Radio
          id={id}
          name={name}
          data-testid={id}
          isDisabled={isDisabled}
          isChecked={isChecked}
          onChange={onChange}
          label={ACCESS_MODE_RADIO_NAMES[accessMode]}
        />
      </Tooltip>
    );
  }
  return (
    <Radio
      id={id}
      name={name}
      data-testid={id}
      isDisabled={isDisabled}
      isChecked={isChecked}
      onChange={onChange}
      label={ACCESS_MODE_RADIO_NAMES[accessMode]}
    />
  );
};

export default AccessModeRadio;
