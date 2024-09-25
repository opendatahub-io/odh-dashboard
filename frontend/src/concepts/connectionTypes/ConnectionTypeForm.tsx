import * as React from 'react';
import {
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSection,
  MenuToggleStatus,
  Title,
  Truncate,
} from '@patternfly/react-core';
import ConnectionTypeFormFields from '~/concepts/connectionTypes/fields/ConnectionTypeFormFields';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '~/concepts/connectionTypes/types';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '~/concepts/k8s/utils';
import TypeaheadSelect, { TypeaheadSelectOption } from '~/components/TypeaheadSelect';
import K8sNameDescriptionField from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
} from '~/concepts/k8s/K8sNameDescriptionField/types';
import { ConnectionTypeDetailsHelperText } from './ConnectionTypeDetailsHelperText';

const getConnectionTypeSelectOptions = (
  isPreview: boolean,
  selectedConnectionType?: ConnectionTypeConfigMapObj,
  connectionTypes?: ConnectionTypeConfigMapObj[],
): TypeaheadSelectOption[] => {
  if (isPreview && selectedConnectionType?.metadata.annotations?.['openshift.io/display-name']) {
    return [
      {
        value: '',
        content: selectedConnectionType.metadata.annotations['openshift.io/display-name'],
        isSelected: true,
      },
    ];
  }
  if (!isPreview && connectionTypes) {
    return connectionTypes.map((t) => ({
      value: getResourceNameFromK8sResource(t),
      content: getDisplayNameFromK8sResource(t),
      description: (
        <Flex direction={{ default: 'column' }} rowGap={{ default: 'rowGapNone' }}>
          {getDescriptionFromK8sResource(t) && (
            <FlexItem>
              <Truncate content={getDescriptionFromK8sResource(t)} />
            </FlexItem>
          )}
          {t.data?.category?.length && (
            <FlexItem>
              <Truncate content={`Category: ${t.data.category.join(', ')}`} />
            </FlexItem>
          )}
        </Flex>
      ),
      data: `${getDescriptionFromK8sResource(t)} ${t.data?.category?.join(' ')}`,
      isSelected:
        !!selectedConnectionType &&
        getResourceNameFromK8sResource(t) ===
          getResourceNameFromK8sResource(selectedConnectionType),
    }));
  }
  return [];
};

type Props = Pick<
  React.ComponentProps<typeof ConnectionTypeFormFields>,
  'onChange' | 'onValidate'
> & {
  connectionType?: ConnectionTypeConfigMapObj;
  setConnectionType?: (obj?: ConnectionTypeConfigMapObj) => void;
  connectionTypes?: ConnectionTypeConfigMapObj[];
  isPreview?: boolean;
  connectionNameDesc?: K8sNameDescriptionFieldData;
  setConnectionNameDesc?: K8sNameDescriptionFieldUpdateFunction;
  connectionValues?: {
    [key: string]: ConnectionTypeValueType;
  };
  disableTypeSelection?: boolean;
};

const ConnectionTypeForm: React.FC<Props> = ({
  connectionType,
  setConnectionType,
  connectionTypes,
  isPreview = false,
  connectionNameDesc,
  setConnectionNameDesc,
  connectionValues,
  onChange,
  onValidate,
  disableTypeSelection,
}) => {
  const options: TypeaheadSelectOption[] = React.useMemo(
    () => getConnectionTypeSelectOptions(isPreview, connectionType, connectionTypes),
    [isPreview, connectionType, connectionTypes],
  );

  return (
    <Form>
      {isPreview && <Title headingLevel="h1">Add connection</Title>}
      <FormGroup label="Connection type" fieldId="connection-type" isRequired>
        <TypeaheadSelect
          id="connection-type"
          selectOptions={options}
          onSelect={(_, selection) =>
            setConnectionType?.(connectionTypes?.find((c) => c.metadata.name === selection))
          }
          isDisabled={isPreview || disableTypeSelection}
          placeholder={
            isPreview && !connectionType?.metadata.annotations?.['openshift.io/display-name']
              ? 'Unspecified'
              : 'Select a type, or search by keyword or category'
          }
          toggleProps={
            isPreview && !connectionType?.metadata.annotations?.['openshift.io/display-name']
              ? { status: MenuToggleStatus.danger }
              : undefined
          }
          isScrollable
          popperProps={{ maxWidth: 'trigger' }}
          filterFunction={(filterValue: string, filterOptions: TypeaheadSelectOption[]) =>
            filterOptions.filter(
              (o) =>
                String(o.content).toLowerCase().includes(filterValue.toLowerCase()) ||
                String(o.data).toLowerCase().includes(filterValue.toLowerCase()),
            )
          }
        />
        {connectionType && (
          <ConnectionTypeDetailsHelperText connectionType={connectionType} isPreview={isPreview} />
        )}
      </FormGroup>
      {(isPreview || connectionType?.metadata.name) && (
        <FormSection title="Connection details">
          <K8sNameDescriptionField
            dataTestId="connection-name-desc"
            nameLabel="Connection name"
            descriptionLabel="Connection description"
            data={
              connectionNameDesc ?? {
                name: '',
                description: '',
                k8sName: {
                  value: '',
                  state: {
                    immutable: false,
                    invalidCharacters: false,
                    invalidLength: false,
                    maxLength: 0,
                    touched: false,
                  },
                },
              }
            }
            onDataChange={setConnectionNameDesc}
          />
          <ConnectionTypeFormFields
            fields={connectionType?.data?.fields}
            isPreview={isPreview}
            connectionValues={connectionValues}
            onChange={onChange}
            onValidate={onValidate}
          />
        </FormSection>
      )}
    </Form>
  );
};

export default ConnectionTypeForm;
