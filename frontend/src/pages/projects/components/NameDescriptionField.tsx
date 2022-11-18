import * as React from 'react';
import { FormGroup, Stack, StackItem, TextArea, TextInput, Tooltip } from '@patternfly/react-core';
import { NameDescType } from '../types';
import { isValidK8sName, translateDisplayNameForK8s } from '../utils';
import { HelpIcon } from '@patternfly/react-icons';

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

  const k8sName = React.useMemo(() => translateDisplayNameForK8s(data.name), [data.name]);

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Name" isRequired fieldId={nameFieldId}>
          <TextInput
            isRequired
            ref={autoSelectNameRef}
            id={nameFieldId}
            name={nameFieldId}
            aria-labelledby={nameFieldId}
            value={data.name}
            onChange={(name) => setData({ ...data, name })}
          />
        </FormGroup>
      </StackItem>
      {showK8sName && (
        <StackItem>
          <FormGroup
            label="Resource name"
            labelIcon={
              <Tooltip
                removeFindDomNode
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
                <HelpIcon />
              </Tooltip>
            }
            isRequired
            fieldId={nameFieldId}
            helperText={
              !disableK8sName &&
              "Must consist of lower case alphanumeric characters or '-', and must start and end with an alphanumeric character"
            }
          >
            <TextInput
              isRequired
              isDisabled={disableK8sName}
              id={`resource-${nameFieldId}`}
              name={`resource-${nameFieldId}`}
              aria-labelledby={`resource-${nameFieldId}`}
              value={data.k8sName ?? k8sName}
              onChange={(k8sName) => {
                setData({ ...data, k8sName });
              }}
              validated={!isValidK8sName(data.k8sName) ? 'error' : undefined}
            />
          </FormGroup>
        </StackItem>
      )}
      <StackItem>
        <FormGroup label="Description" fieldId={descriptionFieldId}>
          <TextArea
            resizeOrientation="vertical"
            id={descriptionFieldId}
            name={descriptionFieldId}
            aria-labelledby={descriptionFieldId}
            value={data.description}
            onChange={(description) => setData({ ...data, description })}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default NameDescriptionField;
