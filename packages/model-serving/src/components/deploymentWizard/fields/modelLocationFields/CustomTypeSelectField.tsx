import React from 'react';
import { Flex, FlexItem, FormGroup, HelperTextItem, FormHelperText } from '@patternfly/react-core';
import { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types.js';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';

type CustomTypeSelectFieldProps = {
  typeOptions: ConnectionTypeConfigMapObj[];
  onSelect: (connectionType: ConnectionTypeConfigMapObj) => void;
  typeKey: string;
  selectedConnectionType: ConnectionTypeConfigMapObj | undefined;
  isDisabled?: boolean;
};

export const CustomTypeSelectField: React.FC<CustomTypeSelectFieldProps> = ({
  typeOptions,
  onSelect,
  typeKey,
  selectedConnectionType,
  isDisabled,
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
              Your administrator has defined multiple configuration options for{' '}
              <strong>{typeKey}</strong> locations.
              <br />
              Select the one that best fits your needs.
            </HelperTextItem>
          </FormHelperText>
          <SimpleSelect
            isDisabled={isDisabled}
            dataTestId="custom-type-select"
            placeholder="Select configuration option"
            options={typeOptions.map((type) => ({
              key: type.metadata.name,
              label: type.metadata.annotations?.['openshift.io/display-name'] || type.metadata.name,
            }))}
            value={selectedType?.metadata.name}
            onChange={(key: string) => {
              const newType = typeOptions.find((type) => type.metadata.name === key);
              if (newType) {
                setSelectedType(newType);
                onSelect(newType);
              }
            }}
            toggleProps={{ style: { minWidth: '450px' } }}
          />
        </FlexItem>
      </Flex>
    </FormGroup>
  );
};
