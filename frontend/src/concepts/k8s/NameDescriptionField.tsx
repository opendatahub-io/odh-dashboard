import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextArea,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, HelpIcon } from '@patternfly/react-icons';
import { NameDescType } from '~/pages/projects/types';
import { isValidK8sName, translateDisplayNameForK8s } from '~/concepts/k8s/utils';

type NameDescriptionFieldProps = {
  nameFieldId: string;
  descriptionFieldId: string;
  data: NameDescType;
  setData: (data: NameDescType) => void;
  autoFocusName?: boolean;
  showK8sName?: boolean;
  disableK8sName?: boolean;
};

const NameDescriptionField: React.FC<NameDescriptionFieldProps> = ({
  nameFieldId,
  descriptionFieldId,
  data,
  setData,
  autoFocusName,
  showK8sName,
  disableK8sName,
}) => {
  const autoSelectNameRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (autoFocusName) {
      autoSelectNameRef.current?.focus();
    }
  }, [autoFocusName]);

  const k8sName = React.useMemo(() => {
    if (showK8sName) {
      return translateDisplayNameForK8s(data.name);
    }

    return '';
  }, [showK8sName, data.name]);

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Name" isRequired fieldId={nameFieldId}>
          <TextInput
            isRequired
            ref={autoSelectNameRef}
            id={nameFieldId}
            data-testid={nameFieldId}
            name={nameFieldId}
            value={data.name}
            onChange={(e, name) => setData({ ...data, name })}
          />
        </FormGroup>
      </StackItem>
      {showK8sName && (
        <StackItem>
          <FormGroup
            label="Resource name"
            labelIcon={
              <Tooltip
                position="right"
                content={
                  <Stack hasGutter>
                    <StackItem>
                      Resource names are what your resources are labeled in OpenShift.
                    </StackItem>
                    <StackItem>Resource names are not editable after creation.</StackItem>
                  </Stack>
                }
              >
                <HelpIcon aria-label="More info" />
              </Tooltip>
            }
            isRequired
            fieldId={`resource-${nameFieldId}`}
          >
            <TextInput
              isRequired
              isDisabled={disableK8sName}
              id={`resource-${nameFieldId}`}
              name={`resource-${nameFieldId}`}
              data-testid={`resource-${nameFieldId}`}
              value={data.k8sName ?? k8sName}
              onChange={(e, value) => {
                setData({ ...data, k8sName: value });
              }}
              validated={!isValidK8sName(data.k8sName) ? 'error' : undefined}
            />
            {!disableK8sName && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    {...(!isValidK8sName(data.k8sName) && {
                      icon: <ExclamationCircleIcon />,
                      variant: 'error',
                    })}
                  >
                    {`Must consist of lower case alphanumeric characters or '-', and must start and
                    end with an alphanumeric character`}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        </StackItem>
      )}
      <StackItem>
        <FormGroup label="Description" fieldId={descriptionFieldId}>
          <TextArea
            resizeOrientation="vertical"
            id={descriptionFieldId}
            data-testid={descriptionFieldId}
            name={descriptionFieldId}
            value={data.description}
            onChange={(e, description) => setData({ ...data, description })}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default NameDescriptionField;
