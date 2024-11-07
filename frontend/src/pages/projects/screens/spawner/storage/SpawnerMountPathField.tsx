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
import React from 'react';
import FieldGroupHelpLabelIcon from '~/components/FieldGroupHelpLabelIcon';
import { useMountPathFormat, validateMountPath } from './utils';
import { MountPathFormat } from './types';
import { MOUNT_PATH_PREFIX } from './const';

interface MountPath {
  value: string;
  error: string;
}

interface SpawnerMountPathFieldProps {
  isCreate: boolean;
  mountPath: MountPath;
  inUseMountPaths?: string[];
  onChange: (path: MountPath) => void;
}

const SpawnerMountPathField: React.FC<SpawnerMountPathFieldProps> = ({
  isCreate,
  mountPath,
  inUseMountPaths,
  onChange,
}) => {
  const [format, setFormat] = useMountPathFormat(isCreate, mountPath.value);
  const [shouldShowValidation, setShouldShowValidation] = React.useState(false);

  const pathSuffix = React.useMemo(() => {
    const prefix = format === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/';
    return mountPath.value.startsWith(prefix)
      ? mountPath.value.slice(prefix.length)
      : mountPath.value;
  }, [mountPath.value, format]);

  React.useEffect(() => {
    const initialValue = format === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/';
    onChange({ value: initialValue, error: '' });
    // Only run on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateAndUpdate = React.useCallback(
    (suffix: string, newFormat: MountPathFormat = format) => {
      const prefix = newFormat === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/';
      const newValue = `${prefix}${suffix}`;

      // Only validate after the field has been touched
      if (!shouldShowValidation && !suffix.trim()) {
        onChange({ value: newValue, error: '' });
        return;
      }

      const error = validateMountPath(suffix, inUseMountPaths || [], newFormat);
      onChange({ value: newValue, error });
    },
    [format, inUseMountPaths, onChange, shouldShowValidation],
  );

  const handleFormatChange = (newFormat: MountPathFormat) => {
    setFormat(newFormat);
    validateAndUpdate(pathSuffix, newFormat);
  };

  const handleSuffixChange = (suffix: string) => {
    if (!shouldShowValidation) {
      setShouldShowValidation(true);
    }
    validateAndUpdate(suffix);
  };

  return (
    <FormGroup
      label="Mount path"
      fieldId="mount-path"
      isRequired
      labelIcon={
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
        {isCreate ? (
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
                    value={pathSuffix}
                    onChange={(_, value) => handleSuffixChange(value)}
                    isRequired
                    validated={
                      mountPath.error ? 'error' : pathSuffix.length > 0 ? 'success' : 'default'
                    }
                  />
                </InputGroupItem>
              </InputGroup>
              <HelperText>
                <HelperTextItem
                  variant={mountPath.error ? 'error' : 'indeterminate'}
                  data-testid="mount-path-folder-helper-text"
                >
                  {mountPath.error ||
                    'Must only consist of lowercase letters, dashes, and slashes.'}
                </HelperTextItem>
                {format === MountPathFormat.CUSTOM && (
                  <HelperTextItem variant="warning" hasIcon>
                    Depending on the workbench type, this location may not be visible or accessible.
                    For example, the JupyterLab file browser only displays folders and files under
                    /opt/app-root/src
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
