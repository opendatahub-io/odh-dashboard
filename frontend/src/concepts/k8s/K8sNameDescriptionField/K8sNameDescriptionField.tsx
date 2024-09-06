import * as React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
  UseK8sNameDescriptionDataConfiguration,
  UseK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/types';
import ResourceNameDefinitionTooltip from '~/concepts/k8s/ResourceNameDefinitionTooltip';
import useAutoFocusRef from '~/utilities/useAutoFocusRef';
import { handleUpdateLogic, setupDefaults } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import ResourceNameField from '~/concepts/k8s/K8sNameDescriptionField/ResourceNameField';

/** Companion data hook */
export const useK8sNameDescriptionFieldData = (
  configuration: UseK8sNameDescriptionDataConfiguration = {},
): UseK8sNameDescriptionFieldData => {
  const [data, setData] = React.useState<K8sNameDescriptionFieldData>(() =>
    setupDefaults(configuration),
  );

  // Hold the data in a ref to avoid churn in the update method
  const dataRef = React.useRef(data);
  dataRef.current = data;
  const onDataChange = React.useCallback<K8sNameDescriptionFieldUpdateFunction>(
    (key, value) => {
      setData(handleUpdateLogic(dataRef.current)(key, value));
    },
    [setData],
  );

  return { data, onDataChange };
};

type K8sNameDescriptionFieldProps = {
  autoFocusName?: boolean;
  dataTestId: string;
  descriptionLabel?: string;
  nameLabel?: string;
} & UseK8sNameDescriptionFieldData;

/**
 * Use in place of any K8s Resource creation / edit.
 * @see useK8sNameDescriptionFieldData
 */
const K8sNameDescriptionField: React.FC<K8sNameDescriptionFieldProps> = ({
  autoFocusName,
  data,
  dataTestId,
  descriptionLabel = 'Description',
  onDataChange,
  nameLabel = 'Name',
}) => {
  const autoFocusNameRef = useAutoFocusRef(autoFocusName);
  const [showK8sField, setShowK8sField] = React.useState(false);

  const { name, description, k8sName } = data;

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label={nameLabel} isRequired>
          <TextInput
            data-testid={`${dataTestId}-name`}
            id={`${dataTestId}-name`}
            ref={autoFocusNameRef}
            isRequired
            value={name}
            onChange={(event, value) => onDataChange('name', value)}
          />
        </FormGroup>
        {!showK8sField && !k8sName.state.immutable && (
          <FormHelperText>
            {k8sName.value && (
              <HelperText>
                <HelperTextItem>
                  The resource name will be <b>{k8sName.value}</b>.
                </HelperTextItem>
              </HelperText>
            )}
            <HelperText>
              <HelperTextItem>
                <Button
                  data-testid={`${dataTestId}-editResourceLink`}
                  variant="link"
                  isInline
                  onClick={() => setShowK8sField(true)}
                >
                  Edit resource name
                </Button>{' '}
                <ResourceNameDefinitionTooltip />
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </StackItem>
      <ResourceNameField
        allowEdit={showK8sField}
        dataTestId={dataTestId}
        k8sName={k8sName}
        onDataChange={onDataChange}
      />
      <StackItem>
        <FormGroup label={descriptionLabel}>
          <TextArea
            data-testid={`${dataTestId}-description`}
            id={`${dataTestId}-description`}
            value={description}
            onChange={(event, value) => onDataChange('description', value)}
            resizeOrientation="vertical"
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default K8sNameDescriptionField;
