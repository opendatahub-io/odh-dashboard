import * as React from 'react';
import {
  Flex,
  FlexItem,
  FormGroup,
  FormSection,
  MenuToggleStatus,
  Truncate,
} from '@patternfly/react-core';
import ConnectionTypeFormFields from '#~/concepts/connectionTypes/fields/ConnectionTypeFormFields';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '#~/concepts/connectionTypes/types';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import K8sNameDescriptionField from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
} from '#~/concepts/k8s/K8sNameDescriptionField/types';
import { ConnectionTypeDetailsHelperText } from './ConnectionTypeDetailsHelperText';

const createSelectOption = (
  connectionType: ConnectionTypeConfigMapObj,
  isSelected: boolean,
): TypeaheadSelectOption => {
  const description = getDescriptionFromK8sResource(connectionType);
  return {
    value: getResourceNameFromK8sResource(connectionType),
    content: getDisplayNameFromK8sResource(connectionType),
    description: (
      <Flex direction={{ default: 'column' }} rowGap={{ default: 'rowGapNone' }}>
        {description && (
          <FlexItem>
            <Truncate content={description} />
          </FlexItem>
        )}
        {!!connectionType.data?.category?.length && (
          <FlexItem>
            <Truncate content={`Category: ${connectionType.data.category.join(', ')}`} />
          </FlexItem>
        )}
      </Flex>
    ),
    data: `${description} ${connectionType.data?.category?.join(' ') ?? ''}`,
    isSelected,
  };
};

const getConnectionTypeSelectOptions = (
  isPreview: boolean,
  connectionTypes?: ConnectionTypeConfigMapObj[],
  selectedConnectionType?: ConnectionTypeConfigMapObj,
  selectedConnectionTypeName?: string,
): TypeaheadSelectOption[] => {
  if (isPreview) {
    const displayName = selectedConnectionType?.metadata.annotations?.['openshift.io/display-name'];
    if (displayName) {
      return [
        {
          value: '',
          content: displayName,
          isSelected: true,
        },
      ];
    }
  } else {
    if (!connectionTypes || connectionTypes.length === 0) {
      if (selectedConnectionType) {
        return [createSelectOption(selectedConnectionType, true)];
      }
      if (selectedConnectionTypeName) {
        return [
          {
            value: selectedConnectionTypeName,
            content: selectedConnectionTypeName,
            isSelected: true,
          },
        ];
      }
    }
    if (connectionTypes) {
      return connectionTypes.map((t) =>
        createSelectOption(
          t,
          !!selectedConnectionType &&
            getResourceNameFromK8sResource(t) ===
              (selectedConnectionTypeName ||
                getResourceNameFromK8sResource(selectedConnectionType)),
        ),
      );
    }
  }
  return [];
};

type Props = Pick<
  React.ComponentProps<typeof ConnectionTypeFormFields>,
  'onChange' | 'onValidate'
> & {
  connectionType?: ConnectionTypeConfigMapObj | string;
  setConnectionType?: (name: string) => void;
  options?: ConnectionTypeConfigMapObj[];
  isPreview?: boolean;
  connectionNameDesc?: K8sNameDescriptionFieldData;
  setConnectionNameDesc?: K8sNameDescriptionFieldUpdateFunction;
  connectionValues?: {
    [key: string]: ConnectionTypeValueType;
  };
  connectionErrors?: {
    [key: string]: boolean | string;
  };
  Alert?: React.JSX.Element;
};

const ConnectionTypeForm: React.FC<Props> = ({
  connectionType: connectionTypeUnion,
  setConnectionType,
  options,
  isPreview = false,
  connectionNameDesc,
  setConnectionNameDesc,
  connectionValues,
  onChange,
  onValidate,
  connectionErrors,
  Alert,
}) => {
  const [connectionTypeName, connectionType] =
    typeof connectionTypeUnion === 'string'
      ? [connectionTypeUnion]
      : [connectionTypeUnion?.metadata.name, connectionTypeUnion];

  const selectOptions: TypeaheadSelectOption[] = React.useMemo(
    () => getConnectionTypeSelectOptions(isPreview, options, connectionType, connectionTypeName),
    [isPreview, options, connectionType, connectionTypeName],
  );

  return (
    <>
      <FormGroup
        label="Connection type"
        fieldId="connection-type"
        data-testid="connection-type-dropdown"
        isRequired
      >
        <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem grow={{ default: 'grow' }}>
            <TypeaheadSelect
              id="connection-type"
              selectOptions={selectOptions}
              onSelect={(_, selection) => {
                if (typeof selection === 'string') {
                  setConnectionType?.(selection);
                }
              }}
              isDisabled={isPreview || !options}
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
              previewDescription={false}
            />
          </FlexItem>
          <FlexItem>
            <ConnectionTypeDetailsHelperText
              connectionType={connectionType}
              isPreview={isPreview}
            />
          </FlexItem>
        </Flex>
        {Alert}
      </FormGroup>
      {(isPreview || connectionTypeName) && (
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
            connectionErrors={connectionErrors}
          />
        </FormSection>
      )}
    </>
  );
};

export default ConnectionTypeForm;
