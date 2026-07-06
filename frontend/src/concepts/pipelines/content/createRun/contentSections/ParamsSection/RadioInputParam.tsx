import React from 'react';
import { Flex, Radio } from '@patternfly/react-core';
import { InputParamProps } from './types';

const RadioValue = {
  True: true,
  False: false,
};

export const RadioInputParam: React.FC<InputParamProps> = ({ id, value: radioValue, onChange }) => (
  <Flex>
    {Object.entries(RadioValue).map(([label, value]) => (
      <Radio
        data-testid={`radio-${id}-${value}`}
        key={label}
        label={label}
        id={`radio-${id}-${value}`}
        isChecked={radioValue === value}
        name={`radio-${id}-${value}`}
        onChange={(event) => {
          onChange(event, value);
        }}
      />
    ))}
  </Flex>
);
