import * as React from 'react';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { EXTENSION_REGEX } from '#~/concepts/connectionTypes/fields/fieldUtils';

type FileUploadExtensionRowProps = {
  extension?: string;
  isDuplicate?: boolean;
  onChange: (newValue: string) => void;
  onRemove?: () => void;
  allowRemove: boolean;
  textRef?: React.RefObject<HTMLInputElement>;
};

const FileUploadExtensionRow: React.FC<FileUploadExtensionRowProps> = ({
  extension,
  isDuplicate,
  onRemove,
  allowRemove,
  onChange,
  textRef,
}) => {
  const [isValid, setIsValid] = React.useState<boolean>(!isDuplicate);

  React.useEffect(
    () => setIsValid(extension ? !isDuplicate && EXTENSION_REGEX.test(extension) : true),
    // only run on entry or if a duplicate, otherwise wait for blur
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDuplicate],
  );

  return (
    <>
      <InputGroup data-testid="file-upload-extension-row">
        <InputGroupItem isFill>
          <TextInput
            name="file-extension"
            data-testid="file-upload-extension-row-input"
            type="text"
            aria-label="allowed extension"
            ref={textRef}
            value={extension || ''}
            style={{ textTransform: 'lowercase' }}
            placeholder="Example: .json"
            onChange={(_ev, val) => {
              if (!isValid && !isDuplicate && EXTENSION_REGEX.test(val)) {
                setIsValid(true);
              }
              onChange(val);
            }}
            onBlur={() => {
              setIsValid(extension ? !isDuplicate && EXTENSION_REGEX.test(extension) : true);
            }}
          />
        </InputGroupItem>
        <InputGroupItem isPlain>
          <Button
            icon={<MinusCircleIcon />}
            variant="plain"
            data-testid="file-upload-extension-row-remove"
            aria-label="remove extension"
            isDisabled={!allowRemove}
            onClick={onRemove}
          />
        </InputGroupItem>
      </InputGroup>
      {!isValid ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem
              icon={<ExclamationCircleIcon />}
              variant="error"
              data-testid="file-upload-extension-row-error"
            >
              {isDuplicate
                ? 'Extension has already been specified.'
                : `Please enter a valid extension starting with '.'`}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </>
  );
};

export default FileUploadExtensionRow;
