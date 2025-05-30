import React from 'react';
import { Value } from '#~/third_party/mlmd';
import { MaxHeightCodeEditor } from '#~/components/MaxHeightCodeEditor';
import { NoValue } from '#~/components/NoValue';

interface MlmdPropertyValueProps {
  values: Value.AsObject;
  testId?: string;
}

export const MlmdPropertyDetailsValue: React.FC<MlmdPropertyValueProps> = ({ values, testId }) => {
  let value: React.ReactNode =
    values.stringValue || values.intValue || values.doubleValue || values.boolValue || '';

  if (values.structValue || values.protoValue) {
    value = (
      <MaxHeightCodeEditor
        isReadOnly
        code={JSON.stringify(values.structValue || values.protoValue, null, 2)}
        maxHeight={300}
        data-testid={testId}
      />
    );
  }

  if (!value && value !== 0) {
    return <NoValue />;
  }

  return value;
};
