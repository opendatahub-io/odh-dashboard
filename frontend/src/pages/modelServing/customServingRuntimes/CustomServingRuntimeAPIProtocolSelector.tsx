import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';
import SimpleSelect from '~/components/SimpleSelect';
import { asEnumMember } from '~/utilities/utils';

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
      <SimpleSelect
        dataTestId="custom-serving-api-protocol-selection"
        aria-label="Select a model serving api protocol"
        placeholder="Select a value"
        isDisabled={isOnlyModelMesh}
        options={options}
        value={selectedAPIProtocol || ''}
        onChange={(key) => {
          const enumValue = asEnumMember(key, ServingRuntimeAPIProtocol);
          if (enumValue !== null) {
            setSelectedAPIProtocol(enumValue);
          }
        }}
      />
    </FormGroup>
  );
};

export default CustomServingRuntimeAPIProtocolSelector;
