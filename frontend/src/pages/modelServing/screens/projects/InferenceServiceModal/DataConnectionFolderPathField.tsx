import * as React from 'react';
import { FormGroup, InputGroup, InputGroupText, TextInput } from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

type DataConnectionFolderPathFieldProps = {
  folderPath: string;
  setFolderPath: (folderPath: string) => void;
};

const DataConnectionFolderPathField: React.FC<DataConnectionFolderPathFieldProps> = ({
  folderPath,
  setFolderPath,
}) => {
  type validate = React.ComponentProps<typeof FormGroup>['validated'];

  const [validated, setValidated] = React.useState<validate>('default');

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
    <FormGroup
      fieldId="folder-path"
      label="Path"
      isRequired
      helperText={'Enter a path to a model or folder. This path cannot point to a root folder.'}
      helperTextInvalid={'The path must not point to a root folder.'}
      helperTextInvalidIcon={<ExclamationCircleIcon />}
      validated={validated}
    >
      <InputGroup>
        <InputGroupText variant="plain">/</InputGroupText>
        <TextInput
          aria-label="folder-path"
          type="text"
          value={folderPath}
          placeholder="eg. data"
          onChange={handlePathChange}
        />
      </InputGroup>
    </FormGroup>
  );
};

export default DataConnectionFolderPathField;
