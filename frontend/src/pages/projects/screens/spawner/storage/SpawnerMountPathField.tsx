import React, { useCallback } from 'react';

import {
  Flex,
  FlexItem,
  FormGroup,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  Radio,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';

import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import { MountPath } from '#~/pages/projects/types';
import { validateMountPath } from './utils';
import { MountPathFormat } from './types';
import { MOUNT_PATH_PREFIX } from './const';

interface SpawnerMountPathFieldProps {
  isDisabled?: boolean;
  mountPath: MountPath;
  inUseMountPaths?: string[];
  onChange: (path: MountPath) => void;
}

const SpawnerMountPathField: React.FC<SpawnerMountPathFieldProps> = ({
  isDisabled = false,
  mountPath,
  inUseMountPaths = [],
  onChange,
}) => {
  const initialValidationRef = React.useRef(false);

  const suffix = mountPath.value.startsWith(MOUNT_PATH_PREFIX)
    ? mountPath.value.slice(MOUNT_PATH_PREFIX.length)
    : mountPath.value.slice(1);

  const format = mountPath.value.startsWith(MOUNT_PATH_PREFIX)
    ? MountPathFormat.STANDARD
    : MountPathFormat.CUSTOM;

  const validateAndUpdate = useCallback(
    (value: string, newFormat?: MountPathFormat) => {
      const prefix = (newFormat ?? format) === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/';
      const newValue = `${prefix}${value}`;

      onChange({
        value: newValue,
        error: validateMountPath(newValue, inUseMountPaths) || '',
      });
    },
    [inUseMountPaths, format, onChange],
  );

  const handleFormatChange = (newFormat: MountPathFormat) => {
    validateAndUpdate(suffix, newFormat);
  };

  React.useEffect(() => {
    if (!initialValidationRef.current) {
      initialValidationRef.current = true;
      validateAndUpdate(suffix);
    }
  }, [suffix, validateAndUpdate]);

  return (
    <FormGroup
      label="Mount path"
      fieldId="mount-path"
      isRequired
      labelHelp={
        <FieldGroupHelpLabelIcon
          content={
            <>
              The directory within a container where a volume is mounted and accessible. Only
              standard paths that begin with <b>{MOUNT_PATH_PREFIX}</b> are visible in the
              JupyterLab file browser.
            </>
          }
        />
      }
    >
      <Stack hasGutter>
        {!isDisabled ? (
          <>
            <StackItem>
              <Flex>
                <FlexItem>
                  <Radio
                    id="mount-path-radio-standard"
                    label="Standard path"
                    name="mount-path-format-radio"
                    value={MountPathFormat.STANDARD}
                    isChecked={format === MountPathFormat.STANDARD}
                    onChange={() => handleFormatChange(MountPathFormat.STANDARD)}
                  />
                </FlexItem>
                <FlexItem>
                  <Radio
                    id="mount-path-radio-custom"
                    label="Custom path"
                    name="mount-path-format-radio"
                    value={MountPathFormat.CUSTOM}
                    isChecked={format === MountPathFormat.CUSTOM}
                    onChange={() => handleFormatChange(MountPathFormat.CUSTOM)}
                  />
                </FlexItem>
              </Flex>
            </StackItem>
            <StackItem>
              <InputGroup>
                <InputGroupText id="path-prefix" aria-label="Mount path prefix">
                  {format === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/'}
                </InputGroupText>
                <InputGroupItem isFill>
                  <TextInput
                    id="mount-path-input"
                    data-testid="mount-path-folder-value"
                    aria-label="Mount path suffix"
                    type="text"
                    value={suffix}
                    onChange={(_, value) => validateAndUpdate(value)}
                    isRequired
                    validated={
                      mountPath.error ? 'error' : suffix.length > 0 ? 'success' : 'default'
                    }
                    onBlur={() => validateAndUpdate(suffix)}
                  />
                </InputGroupItem>
              </InputGroup>
              <HelperText>
                {mountPath.error && (
                  <HelperTextItem variant="error" data-testid="mount-path-folder-helper-text">
                    {mountPath.error}
                  </HelperTextItem>
                )}

                {format === MountPathFormat.CUSTOM && (
                  <HelperTextItem variant="warning">
                    Depending on the workbench type, this location may not be visible or accessible.
                    For example, the JupyterLab file browser only displays mount paths and files
                    under /opt/app-root/src
                  </HelperTextItem>
                )}
              </HelperText>
            </StackItem>
          </>
        ) : (
          <StackItem>
            <TextInput
              isRequired
              isDisabled
              value={mountPath.value}
              onChange={(_, value) => onChange({ value, error: mountPath.error })}
              id="mount-path"
              data-testid="mount-path-input"
            />
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};

export default SpawnerMountPathField;
