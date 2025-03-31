import React, { ComponentProps, useState } from 'react';
import {
  TextInput,
  Button,
  Flex,
  FlexItem,
  Content,
  FormHelperText,
  HelperTextItem,
  HelperText,
} from '@patternfly/react-core';
import { PencilAltIcon, CheckIcon, TimesIcon } from '@patternfly/react-icons';

interface InlineEditTextProps {
  text: string;
  onSave: (text: string) => void;
  checkSupported: (text: string) => boolean;
  unsupportedMessage: string;
  validated?: ComponentProps<typeof TextInput>['validated'];
}

const InlineEditText: React.FC<InlineEditTextProps> = ({
  text,
  onSave,
  checkSupported,
  validated,
  unsupportedMessage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(text);
  const [showUnsupportedMessage, setShowUnsupportedMessage] = useState(false);

  const isEmpty = React.useMemo(() => inputValue.trim().length === 0, [inputValue]);

  React.useEffect(() => {
    setShowUnsupportedMessage(!(isEditing || isEmpty || checkSupported(inputValue)));
  }, [isEditing, inputValue, isEmpty, checkSupported]);

  const handleSave = () => {
    onSave(inputValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(text);
    setIsEditing(false);
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSave();
        break;
      case 'Escape':
        handleCancel();
        break;
    }
  };

  return (
    <>
      <Flex alignItems={{ default: 'alignItemsCenter' }}>
        {isEditing ? (
          <>
            <FlexItem grow={{ default: 'grow' }} style={{ maxWidth: 500 }}>
              <TextInput
                aria-label="Edit text"
                value={inputValue}
                onChange={(_, value) => setInputValue(value)}
                autoFocus
                style={{ maxWidth: '100%' }}
                onKeyDown={(e) => {
                  handleTextInputKeyDown(e);
                }}
                validated={validated}
                data-testid="edit-inline-text-input"
              />
            </FlexItem>
            <FlexItem>
              <Button
                variant="plain"
                onClick={() => {
                  handleSave();
                }}
                aria-label="Save"
                data-testid="edit-inline-text-save-button"
              >
                <CheckIcon />
              </Button>
              <Button
                variant="plain"
                onClick={() => {
                  handleCancel();
                }}
                aria-label="Cancel"
                data-testid="edit-inline-text-cancel-button"
              >
                <TimesIcon />
              </Button>
            </FlexItem>
          </>
        ) : (
          <>
            <FlexItem>{isEmpty ? <i>Set a value ...</i> : <Content>{text}</Content>}</FlexItem>
            <FlexItem>
              <Button
                data-testid="edit-inline-text-button"
                variant="plain"
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
              >
                <PencilAltIcon />
              </Button>
            </FlexItem>
          </>
        )}
      </Flex>

      {showUnsupportedMessage && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="warning">{unsupportedMessage}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </>
  );
};

export default InlineEditText;
