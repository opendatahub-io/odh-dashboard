import React from 'react';
import { TextArea } from '@patternfly/react-core';
import { InputParamProps } from './types';

export const JsonInputParam: React.FC<InputParamProps> = ({ id, value, onChange }) => {
  const [jsonValue, setJsonValue] = React.useState(value ? JSON.stringify(value) : '');

  return (
    <TextArea
      id={id}
      data-testid={id}
      autoResize
      resizeOrientation="vertical"
      value={jsonValue}
      onChange={(event, newValue) => {
        setJsonValue(newValue);
        onChange(event, newValue);
      }}
    />
  );
};
