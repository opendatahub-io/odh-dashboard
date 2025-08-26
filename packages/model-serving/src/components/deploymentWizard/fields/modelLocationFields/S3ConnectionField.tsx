import * as React from 'react';
import {
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { containsOnlySlashes, isS3PathValid } from '@odh-dashboard/internal/utilities/string';
import useDebounceCallback from '@odh-dashboard/internal/utilities/useDebounceCallback';
import {
  trimInputOnBlur,
  trimInputOnPaste,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';

type ConnectionFolderPathFieldProps = {
  folderPath: string;
  setFolderPath: (folderPath: string) => void;
};

const S3ConnectionField: React.FC<ConnectionFolderPathFieldProps> = ({
  folderPath,
  setFolderPath,
}) => {
  type Validate = React.ComponentProps<typeof TextInput>['validated'];

  const [validated, setValidated] = React.useState<Validate>('default');

  const debouncedValidateFolderPath = useDebounceCallback(
    React.useCallback((path: string) => {
      if (path !== '' && (containsOnlySlashes(path) || !isS3PathValid(path))) {
        setValidated('error');
      } else {
        setValidated('default');
      }
    }, []),
    500,
  );

  React.useEffect(() => {
    debouncedValidateFolderPath(folderPath);
  }, [debouncedValidateFolderPath, folderPath]);

  const handlePathChange = (currentFolderPath: string) => {
    setFolderPath(currentFolderPath);
    setValidated('default');
  };

  return (
    <FormGroup fieldId="folder-path" label="Path" isRequired style={{ width: '50%' }}>
      <TextInput
        id="folder-path"
        aria-label="folder-path"
        data-testid="folder-path"
        type="text"
        value={folderPath}
        validated={validated}
        placeholder="Example, data_folder"
        onChange={(e, newFolderPath: string) => handlePathChange(newFolderPath)}
        onBlur={(e) => trimInputOnBlur(folderPath, setFolderPath)(e)}
        onPaste={(e) => trimInputOnPaste(folderPath, setFolderPath)(e)}
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
                : 'Invalid path format.'
              : 'Enter a path to your model or the folder containing your model. The path cannot point to a root folder.'}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default S3ConnectionField;
