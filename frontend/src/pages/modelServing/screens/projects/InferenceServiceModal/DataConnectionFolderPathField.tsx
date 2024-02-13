import * as React from 'react';
import {
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { containsOnlySlashes, removeLeadingSlashes } from '~/utilities/string';

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

  const handlePathChange = (currentFolderPath: string) => {
    setFolderPath(currentFolderPath);
    setValidated('default');
  };
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (containsOnlySlashes(folderPath) || removeLeadingSlashes(folderPath).includes('//')) {
        setValidated('error');
      } else {
        setValidated('default');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [folderPath]);
  return (
    <FormGroup fieldId="folder-path" label="Path" isRequired>
      <TextInput
        aria-label="folder-path"
        type="text"
        value={folderPath}
        validated={validated}
        placeholder="Example, data_folder"
        onChange={(e, newFolderPath: string) => handlePathChange(newFolderPath)}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem
            data-testid="folder-path-error"
            {...(validated === 'error' && { icon: <ExclamationCircleIcon /> })}
            variant={validated}
          >
            {validated === 'error'
              ? containsOnlySlashes(folderPath)
                ? 'The path must not point to a root folder.'
                : 'Invalid path format'
              : 'Enter a path to a model or folder. This path cannot point to a root folder.'}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default DataConnectionFolderPathField;
