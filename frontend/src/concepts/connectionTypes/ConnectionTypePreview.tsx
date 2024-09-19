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

type Props = {
  obj?: ConnectionTypeConfigMapObj;
  setObj?: (obj?: ConnectionTypeConfigMapObj) => void;
  connectionTypes?: ConnectionTypeConfigMapObj[];
  isPreview?: boolean;
  connectionNameDesc?: K8sNameDescriptionFieldData;
  setConnectionNameDesc?: K8sNameDescriptionFieldUpdateFunction;
  connectionValues?: {
    [key: string]: ConnectionTypeValueType;
  };
  setConnectionValues?: (values: { [key: string]: ConnectionTypeValueType }) => void;
};

const ConnectionTypePreview: React.FC<Props> = ({
  obj,
  setObj,
  connectionTypes,
  isPreview,
  connectionNameDesc,
  setConnectionNameDesc,
  connectionValues,
  setConnectionValues,
}) => {
  const connectionTypeName = obj && obj.metadata.annotations?.['openshift.io/display-name'];

  const options: TypeaheadSelectOption[] = React.useMemo(() => {
    if (isPreview && connectionTypeName) {
      return [
        {
          value: connectionTypeName,
          content: connectionTypeName,
          isSelected: true,
        },
      ];
    }
    if (!isPreview && connectionTypes) {
      return connectionTypes.map((t) => ({
        value: getResourceNameFromK8sResource(t),
        content: getDisplayNameFromK8sResource(t),
        isSelected: t.metadata.name === obj?.metadata.name,
      }));
    }
    return [];
  }, [isPreview, obj?.metadata.name, connectionTypes, connectionTypeName]);

  return (
    <Form>
      {isPreview && <Title headingLevel="h1">Add connection</Title>}
      <FormGroup label="Connection type" fieldId="connection-type" isRequired>
        <TypeaheadSelect
          id="connection-type"
          selectOptions={options}
          onSelect={(_, selection) =>
            setObj?.(connectionTypes?.find((c) => c.metadata.name === selection))
          }
          isDisabled={isPreview || connectionTypes?.length === 1}
          placeholder={
            isPreview && !connectionTypeName
              ? 'Unspecified'
              : 'Select a type, or search by keyword or category'
          }
          toggleProps={
            isPreview && !connectionTypeName ? { status: MenuToggleStatus.danger } : undefined
          }
        />
        {(isPreview || obj?.metadata.name) && (
          <ConnectionTypeDetailsHelperText connectionType={obj} />
        )}
      </FormGroup>
      {(isPreview || obj?.metadata.name) && (
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
            fields={obj?.data?.fields}
            isPreview={isPreview}
            connectionValues={connectionValues}
            onChange={(field, value) => {
              setConnectionValues?.({
                ...connectionValues,
                [field.envVar]: value,
              });
            }}
          />
        </FormSection>
      )}
    </Form>
  );
};

export default ConnectionTypePreview;
