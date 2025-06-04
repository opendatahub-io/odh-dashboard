import { Radio, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { toAccessModeLabel } from '#~/pages/projects/screens/detail/storage/AccessModeLabel';

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
        content={`${toAccessModeLabel(accessMode)} isn't enabled in the selected storage class.`}
      >
        <Radio
          id={id}
          name={name}
          data-testid={id}
          isDisabled={isDisabled}
          isChecked={isChecked}
          onChange={onChange}
          label={toAccessModeLabel(accessMode)}
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
      label={toAccessModeLabel(accessMode)}
    />
  );
};

export default AccessModeRadio;
