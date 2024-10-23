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

enum MountPathFormat {
  STANDARD = 'standard',
  CUSTOM = 'custom',
}

interface MountPathFieldProps {
  isCreate: boolean;
  mountPath: string;
  inUseMountPaths?: string[];
  onChange: (path: string) => void;
}

// Constants
const STANDARD_PATH_PREFIX = '/opt/app-root/src/';
const PATH_REGEX = /^[a-z-]+\/?$/;

// Extracted validation logic
const validatePath = (value: string, inUseMountPaths: string[]): string => {
  if (value.length === 0) {
    return 'Enter a path to a model or folder. This path cannot point to a root folder.';
  }
  if (!PATH_REGEX.test(value)) {
    return 'Must only consist of lowercase letters and dashes.';
  }
  if (inUseMountPaths.includes(`/${value}`)) {
    return 'Mount folder is already in use for this workbench.';
  }
  return '';
};

// Custom hook for managing mount path format
const useMountPathFormat = (isCreate: boolean, mountPath: string) => {
  const getInitialFormat = React.useCallback(() => {
    if (isCreate) {
      return MountPathFormat.STANDARD;
    }
    return mountPath.startsWith(STANDARD_PATH_PREFIX)
      ? MountPathFormat.STANDARD
      : MountPathFormat.CUSTOM;
  }, [isCreate, mountPath]);

  const [format, setFormat] = React.useState(getInitialFormat);

  React.useEffect(() => {
    if (!isCreate) {
      const newFormat = mountPath.startsWith(STANDARD_PATH_PREFIX)
        ? MountPathFormat.STANDARD
        : MountPathFormat.CUSTOM;
      setFormat(newFormat);
    }
  }, [isCreate, mountPath]);

  return [format, setFormat] as const;
};

const MountPathField: React.FC<MountPathFieldProps> = ({
  isCreate,
  mountPath,
  inUseMountPaths,
  onChange,
}) => {
  const [format, setFormat] = useMountPathFormat(isCreate, mountPath);
  const [error, setError] = React.useState('');

  const pathSuffix = React.useMemo(() => {
    if (format === MountPathFormat.STANDARD) {
      return mountPath.replace(STANDARD_PATH_PREFIX, '');
    }
    return mountPath.startsWith('/') ? mountPath.slice(1) : mountPath;
  }, [mountPath, format]);

  const handleFormatChange = (newFormat: MountPathFormat) => {
    setFormat(newFormat);
    const prefix = newFormat === MountPathFormat.STANDARD ? STANDARD_PATH_PREFIX : '/';
    onChange(`${prefix}${pathSuffix}`);
  };

  const handleSuffixChange = (newSuffix: string) => {
    const prefix = format === MountPathFormat.STANDARD ? STANDARD_PATH_PREFIX : '/';
    onChange(`${prefix}${newSuffix}`);
    setError(validatePath(newSuffix, inUseMountPaths || []));
  };

  const renderPathInput = () => {
    if (!isCreate) {
      return (
        <TextInput
          isRequired
          isDisabled
          value={mountPath}
          onChange={(_, value) => onChange(value)}
          id="mount-path"
          data-testid="mount-path-input"
        />
      );
    }

    return (
      <>
        <InputGroup>
          <InputGroupText id="path-prefix" aria-label="Mount path prefix">
            {format === MountPathFormat.STANDARD ? STANDARD_PATH_PREFIX : '/'}
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
              Depending on the workbench type, this location may not be visible or accessible. For
              example, the JupyterLab file browser only displays folders and files under
              /opt/app-root/src
            </HelperTextItem>
          )}
        </HelperText>
      </>
    );
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
              standard paths that begin with <b>{STANDARD_PATH_PREFIX}</b> are visible in the
              JupyterLab file browser.
            </>
          }
        />
      }
    >
      <Stack hasGutter>
        {isCreate && (
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
        )}
        <StackItem>{renderPathInput()}</StackItem>
      </Stack>
    </FormGroup>
  );
};

export default MountPathField;
