import React, { ComponentProps } from 'react';
import { TextArea } from '@patternfly/react-core';
import { InputParamProps } from './types';

interface JsonInputParamProps extends InputParamProps {
  validated?: ComponentProps<typeof TextArea>['validated'];
}

export const JsonInputParam: React.FC<JsonInputParamProps> = ({
  id,
  value,
  onChange,
  validated,
}) => {
  const [jsonValue, setJsonValue] = React.useState(value ? JSON.stringify(value) : '');

  return (
    <TextArea
      id={id}
      data-testid={id}
      autoResize
      resizeOrientation="vertical"
      value={jsonValue}
      validated={validated}
      onChange={(event, newValue) => {
        setJsonValue(newValue);
        onChange(event, newValue);
      }}
    />
  );
};
