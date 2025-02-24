import React, { useState } from 'react';
import {
  TextInput,
  Button,
  Flex,
  FlexItem,
  Content,
  Alert,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PencilAltIcon, CheckIcon, TimesIcon } from '@patternfly/react-icons';

interface InlineEditTextProps {
  text: string;
  onSave: (text: string) => void;
  checkSupported: (text: string) => boolean;
  unsupportedMessage: string;
}

const InlineEditText: React.FC<InlineEditTextProps> = ({
  text,
  onSave,
  checkSupported,
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
    <Stack>
      <StackItem>
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
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  onClick={() => {
                    handleSave();
                  }}
                  aria-label="Save"
                >
                  <CheckIcon />
                </Button>
                <Button
                  variant="plain"
                  onClick={() => {
                    handleCancel();
                  }}
                  aria-label="Cancel"
                >
                  <TimesIcon />
                </Button>
              </FlexItem>
            </>
          ) : (
            <>
              <FlexItem>{isEmpty ? <i>Set a value ...</i> : <Content>{text}</Content>}</FlexItem>
              <FlexItem>
                <Button variant="plain" onClick={() => setIsEditing(true)} aria-label="Edit">
                  <PencilAltIcon />
                </Button>
              </FlexItem>
            </>
          )}
        </Flex>
      </StackItem>
      <StackItem>
        {showUnsupportedMessage && (
          <Alert variant="warning" isInline isPlain title={unsupportedMessage} />
        )}
      </StackItem>
    </Stack>
  );
};

export default InlineEditText;
