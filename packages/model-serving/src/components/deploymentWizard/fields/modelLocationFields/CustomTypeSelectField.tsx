import React from 'react';
import { Flex, FlexItem, FormGroup, HelperTextItem, FormHelperText } from '@patternfly/react-core';
import { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types.js';
import TypeaheadSelect from '@odh-dashboard/internal/components/TypeaheadSelect';

type CustomTypeSelectFieldProps = {
  typeOptions: ConnectionTypeConfigMapObj[];
  onSelect: (connectionType: ConnectionTypeConfigMapObj) => void;
  typeKey: string;
  selectedConnectionType: ConnectionTypeConfigMapObj | undefined;
};

export const CustomTypeSelectField: React.FC<CustomTypeSelectFieldProps> = ({
  typeOptions,
  onSelect,
  typeKey,
  selectedConnectionType,
}) => {
  const [selectedType, setSelectedType] = React.useState<ConnectionTypeConfigMapObj | undefined>(
    selectedConnectionType,
  );
  return (
    <FormGroup isRequired className="pf-v6-u-mb-lg">
      <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <FormHelperText>
            <HelperTextItem>
              Your administrator has defined multiple <strong>{typeKey}</strong> location types.
              <br />
              Select the type for your model.
            </HelperTextItem>
          </FormHelperText>
          <TypeaheadSelect
            dataTestId="custom-type-select"
            toggleWidth="450px"
            selectOptions={typeOptions.map((type) => ({
              value: type.metadata.name,
              content:
                type.metadata.annotations?.['openshift.io/display-name'] || type.metadata.name,
            }))}
            selected={selectedType?.metadata.name}
            onSelect={(_, value) => {
              const newType = typeOptions.find((type) => type.metadata.name === value);
              if (newType) {
                setSelectedType(newType);
                onSelect(newType);
              }
            }}
          />
        </FlexItem>
      </Flex>
    </FormGroup>
  );
};
