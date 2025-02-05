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

type FieldRegexValidationRowProps = {
  id: string;
  value?: string;
  isDuplicate?: boolean;
  onChange: (newValue: string) => void;
  onRemove?: () => void;
  allowRemove: boolean;
  textRef?: React.RefObject<HTMLInputElement>;
  ariaLabelItem: string;
  placeholder: string;
  regexValidation: RegExp;
  errorMessage: {
    invalid: string;
    duplicate: string;
  };
};

const FieldRegexValidationRow: React.FC<FieldRegexValidationRowProps> = ({
  id,
  value,
  isDuplicate,
  onRemove,
  allowRemove,
  onChange,
  textRef,
  ariaLabelItem,
  placeholder,
  regexValidation,
  errorMessage,
}) => {
  const [isValid, setIsValid] = React.useState<boolean>(!isDuplicate);

  React.useEffect(
    () => setIsValid(value ? !isDuplicate && regexValidation.test(value) : true),
    // only run on entry or if a duplicate, otherwise wait for blur
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDuplicate],
  );

  return (
    <>
      <InputGroup data-testid={`${id}-row`}>
        <InputGroupItem isFill>
          <TextInput
            name={id}
            data-testid={`${id}-row-input`}
            type="text"
            aria-label={`allowed ${ariaLabelItem}`}
            ref={textRef}
            value={value || ''}
            style={{ textTransform: 'lowercase' }}
            placeholder={placeholder}
            onChange={(_ev, val) => {
              if (!isValid && !isDuplicate && regexValidation.test(val)) {
                setIsValid(true);
              }
              onChange(val);
            }}
            onBlur={() => {
              setIsValid(value ? !isDuplicate && regexValidation.test(value) : true);
            }}
          />
        </InputGroupItem>
        <InputGroupItem isPlain>
          <Button
            icon={<MinusCircleIcon />}
            variant="plain"
            data-testid={`${id}-row-remove`}
            aria-label={`remove ${ariaLabelItem}`}
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
              data-testid={`${id}-row-error`}
            >
              {isDuplicate ? errorMessage.duplicate : errorMessage.invalid}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </>
  );
};

export default FieldRegexValidationRow;
