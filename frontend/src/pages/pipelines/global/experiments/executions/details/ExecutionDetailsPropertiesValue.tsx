import React from 'react';
import { MlmdMetadataValueType } from '~/pages/pipelines/global/experiments/executions/utils';
import { MaxHeightCodeEditor } from '~/components/MaxHeightCodeEditor';

type ExecutionDetailsPropertiesValueProps = {
  value: MlmdMetadataValueType;
};

const ExecutionDetailsPropertiesValueCode = ({ code }: { code: string }) => (
  <MaxHeightCodeEditor isReadOnly code={code} maxHeight={300} />
);

const ExecutionDetailsPropertiesValue: React.FC<ExecutionDetailsPropertiesValueProps> = ({
  value,
}) => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    try {
      const jsonValue = JSON.parse(value);
      return <ExecutionDetailsPropertiesValueCode code={JSON.stringify(jsonValue, null, 2)} />;
    } catch {
      // not JSON, return directly
      return value;
    }
  }
  if (typeof value === 'number') {
    return value;
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
