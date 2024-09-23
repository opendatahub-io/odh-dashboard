import * as React from 'react';
import { Form, FormGroup, FormSection, MenuToggleStatus, Title } from '@patternfly/react-core';
import ConnectionTypeFormFields from '~/concepts/connectionTypes/fields/ConnectionTypeFormFields';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '~/concepts/connectionTypes/types';
import {
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
}) => {
  const options: TypeaheadSelectOption[] = React.useMemo(() => {
    if (isPreview && connectionType?.metadata.annotations?.['openshift.io/display-name']) {
      return [
        {
          value: '',
          content: connectionType.metadata.annotations['openshift.io/display-name'],
          isSelected: true,
        },
      ];
    }
    if (!isPreview && connectionTypes) {
      return connectionTypes.map((t) => ({
        value: getResourceNameFromK8sResource(t),
        content: getDisplayNameFromK8sResource(t),
        isSelected: t.metadata.name === connectionType?.metadata.name,
      }));
    }
    return [];
  }, [isPreview, connectionType?.metadata, connectionTypes]);

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
          isDisabled={isPreview || connectionTypes?.length === 1}
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
        />
        {connectionType && (
          <ConnectionTypeDetailsHelperText connectionType={connectionType} isPreview={isPreview} />
        )}
      </FormGroup>
      {(isPreview || connectionType?.metadata.name) && (
        <FormSection title="Connection details" style={{ marginTop: 0 }}>
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
                    immutable: true,
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
