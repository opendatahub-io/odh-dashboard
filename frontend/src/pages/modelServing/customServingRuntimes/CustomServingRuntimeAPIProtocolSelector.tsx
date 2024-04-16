import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';

type CustomServingRuntimeAPIProtocolSelectorProps = {
  selectedAPIProtocol: ServingRuntimeAPIProtocol | undefined;
  setSelectedAPIProtocol: (apiProtocol: ServingRuntimeAPIProtocol) => void;
  selectedPlatforms: ServingRuntimePlatform[];
};

const CustomServingRuntimeAPIProtocolSelector: React.FC<
  CustomServingRuntimeAPIProtocolSelectorProps
> = ({ selectedAPIProtocol, setSelectedAPIProtocol, selectedPlatforms }) => {
  const isOnlyModelMesh =
    selectedPlatforms.includes(ServingRuntimePlatform.MULTI) &&
    !selectedPlatforms.includes(ServingRuntimePlatform.SINGLE);

  React.useEffect(() => {
    if (isOnlyModelMesh) {
      setSelectedAPIProtocol(ServingRuntimeAPIProtocol.REST);
    }
  }, [isOnlyModelMesh, setSelectedAPIProtocol]);

  const options = [
    {
      key: ServingRuntimeAPIProtocol.REST,
      label: ServingRuntimeAPIProtocol.REST,
    },
    ...(isOnlyModelMesh
      ? []
      : [
          {
            key: ServingRuntimeAPIProtocol.GRPC,
            label: ServingRuntimeAPIProtocol.GRPC,
          },
        ]),
  ];

  return (
    <FormGroup
      label="Select the API protocol this runtime supports"
      fieldId="custom-serving-api-protocol-selection"
      isRequired
    >
      <SimpleDropdownSelect
        dataTestId="custom-serving-api-protocol-selection"
        aria-label="Select a model serving api protocol"
        placeholder="Select a value"
        isDisabled={isOnlyModelMesh}
        options={options}
        value={selectedAPIProtocol || ''}
        onChange={(key) => setSelectedAPIProtocol(key as ServingRuntimeAPIProtocol)}
      />
    </FormGroup>
  );
};

export default CustomServingRuntimeAPIProtocolSelector;
