import * as React from 'react';
import {
  FormGroup,
  InputGroup,
  InputGroupText,
  TextInput,
  InputGroupItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

type DataConnectionFolderPathFieldProps = {
  folderPath: string;
  setFolderPath: (folderPath: string) => void;
};

const DataConnectionFolderPathField: React.FC<DataConnectionFolderPathFieldProps> = ({
  folderPath,
  setFolderPath,
}) => {
  type Validate = React.ComponentProps<typeof TextInput>['validated'];

  const [validated, setValidated] = React.useState<Validate>('default');

  const handlePathChange = (folderPath: string) => {
    setFolderPath(folderPath);
    setValidated('default');
  };
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (folderPath === '/' || folderPath.includes('//')) {
        setValidated('error');
      } else {
        setValidated('default');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [folderPath]);
  return (
    <FormGroup fieldId="folder-path" label="Path" isRequired>
      <InputGroup>
        <InputGroupText isPlain>/</InputGroupText>
        <InputGroupItem isFill>
          <TextInput
            aria-label="folder-path"
            type="text"
            value={folderPath}
            validated={validated}
            placeholder="Example, data_folder"
            onChange={(e, folderPath: string) => handlePathChange(folderPath)}
          />
        </InputGroupItem>
      </InputGroup>
      <FormHelperText>
        <HelperText>
          <HelperTextItem
            {...(validated === 'error' && { icon: <ExclamationCircleIcon /> })}
            variant={validated}
          >
            {validated === 'error'
              ? 'The path must not point to a root folder.'
              : 'Enter a path to a model or folder. This path cannot point to a root folder.'}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default DataConnectionFolderPathField;
