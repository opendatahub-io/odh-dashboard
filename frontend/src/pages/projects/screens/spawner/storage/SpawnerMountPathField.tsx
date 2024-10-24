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

interface SpawnerMountPathFieldProps {
  isCreate: boolean;
  mountPath: string;
  inUseMountPaths?: string[];
  onChange: (path: string) => void;
}

const SpawnerMountPathField: React.FC<SpawnerMountPathFieldProps> = ({
  isCreate,
  mountPath,
  inUseMountPaths,
  onChange,
}) => {
  const [format, setFormat] = useMountPathFormat(isCreate, mountPath);
  const [error, setError] = React.useState('');

  const pathSuffix = React.useMemo(() => {
    if (format === MountPathFormat.STANDARD) {
      return mountPath.replace(MOUNT_PATH_PREFIX, '');
    }
    return mountPath.startsWith('/') ? mountPath.slice(1) : mountPath;
  }, [mountPath, format]);

  const handleFormatChange = (newFormat: MountPathFormat) => {
    setFormat(newFormat);
    const prefix = newFormat === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/';
    onChange(`${prefix}${pathSuffix}`);
  };

  const handleSuffixChange = (newSuffix: string) => {
    const prefix = format === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/';
    onChange(`${prefix}${newSuffix}`);
    setError(validateMountPath(newSuffix, inUseMountPaths || []));
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
                    validated={error ? 'error' : 'default'}
                  />
                </InputGroupItem>
              </InputGroup>
              <HelperText>
                <HelperTextItem
                  variant={error ? 'error' : 'default'}
                  data-testid="mount-path-folder-helper-text"
                >
                  {error || 'Must consist of lowercase letters and dashes.'}
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
              value={mountPath}
              onChange={(_, value) => onChange(value)}
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
