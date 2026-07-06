import React from 'react';
import { MlmdMetadataValueType } from '#~/pages/pipelines/global/experiments/executions/utils';
import { MaxHeightCodeEditor } from '#~/components/MaxHeightCodeEditor';
import { NoValue } from '#~/components/NoValue';

type ExecutionDetailsPropertiesValueProps = {
  value: MlmdMetadataValueType;
};

export const ExecutionDetailsPropertiesValueCode: React.FC<
  Pick<React.ComponentProps<typeof MaxHeightCodeEditor>, 'code'>
> = ({ code }) => (
  <MaxHeightCodeEditor
    isReadOnly
    code={code}
    maxHeight={300}
    data-testid="execution-value-code-editor"
  />
);

const ExecutionDetailsPropertiesValue: React.FC<ExecutionDetailsPropertiesValueProps> = ({
  value,
}) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'number' || (typeof value === 'string' && !Number.isNaN(value))) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const jsonValue = JSON.parse(value);

      if (parseFloat(jsonValue ?? '')) {
        throw value;
      }

      return <ExecutionDetailsPropertiesValueCode code={JSON.stringify(jsonValue, null, 2)} />;
    } catch {
      // not JSON, return directly
      return value || <NoValue />;
    }
  }

  // value is Struct
  const jsObject = value.toJavaScript();
  // When Struct is converted to js object, it may contain a top level "struct"
  // or "list" key depending on its type, but the key is meaningless and we can
  // omit it in visualization.
  return (
    <ExecutionDetailsPropertiesValueCode
      code={JSON.stringify(jsObject.struct || jsObject.list || jsObject, null, 2)}
    />
  );
};

export default ExecutionDetailsPropertiesValue;
