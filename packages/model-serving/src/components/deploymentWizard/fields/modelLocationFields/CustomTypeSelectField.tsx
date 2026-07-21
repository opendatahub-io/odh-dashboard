import React from 'react';
import { Flex, FlexItem, FormGroup, HelperTextItem, FormHelperText } from '@patternfly/react-core';
import type { ConnectionTypeConfigMapObj } from '@odh-dashboard/k8s-core';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';

type CustomTypeSelectFieldProps = {
  typeOptions: ConnectionTypeConfigMapObj[];
  onSelect: (connectionType: ConnectionTypeConfigMapObj) => void;
  typeLabel: string;
  selectedConnectionType: ConnectionTypeConfigMapObj | undefined;
  isDisabled?: boolean;
};

export const CustomTypeSelectField: React.FC<CustomTypeSelectFieldProps> = ({
  typeOptions,
  onSelect,
  typeLabel,
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
              <strong>{typeLabel}</strong> locations.
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
