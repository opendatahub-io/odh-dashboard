import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { asEnumMember } from '@odh-dashboard/foundation';
import { ServingRuntimeAPIProtocol } from '@odh-dashboard/model-serving/shared';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';

type CustomServingRuntimeAPIProtocolSelectorProps = {
  selectedAPIProtocol: ServingRuntimeAPIProtocol | undefined;
  setSelectedAPIProtocol: (apiProtocol: ServingRuntimeAPIProtocol) => void;
};

const CustomServingRuntimeAPIProtocolSelector: React.FC<
  CustomServingRuntimeAPIProtocolSelectorProps
> = ({ selectedAPIProtocol, setSelectedAPIProtocol }) => {
  const options: SimpleSelectOption[] = [
    {
      key: ServingRuntimeAPIProtocol.REST,
      label: ServingRuntimeAPIProtocol.REST,
    },
    {
      key: ServingRuntimeAPIProtocol.GRPC,
      label: ServingRuntimeAPIProtocol.GRPC,
    },
  ];

  return (
    <FormGroup
      label="Select the API protocol this runtime supports"
      fieldId="custom-serving-api-protocol-selection"
      isRequired
    >
      <SimpleSelect
        dataTestId="custom-serving-api-protocol-selection"
        aria-label="Select a model serving api protocol"
        placeholder="Select a value"
        options={options}
        value={selectedAPIProtocol}
        onChange={(key) => {
          const enumValue = asEnumMember(key, ServingRuntimeAPIProtocol);
          if (enumValue !== null) {
            setSelectedAPIProtocol(enumValue);
          }
        }}
        popperProps={{ maxWidth: undefined }}
      />
    </FormGroup>
  );
};

export default CustomServingRuntimeAPIProtocolSelector;
