import { Radio, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { toAccessModeFullName } from '#~/pages/projects/screens/detail/storage/AccessModeFullName';

type AccessModeRadioProps = {
  id: string;
  name: string;
  accessMode: AccessMode;
  isDisabled: boolean;
  isChecked: boolean;
  tooltipContent?: string;
  onChange: () => void;
};

const AccessModeRadio: React.FC<AccessModeRadioProps> = ({
  id,
  name,
  accessMode,
  isDisabled,
  isChecked,
  tooltipContent,
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
      <>{tooltipContent ? <Tooltip content={tooltipContent}>{radioField}</Tooltip> : radioField}</>
    );
  }
  return radioField;
};

export default AccessModeRadio;
