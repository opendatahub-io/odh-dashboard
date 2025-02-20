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
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  onClick={() => {
                    onSave(inputValue);
                    setIsEditing(false);
                  }}
                  aria-label="Save"
                >
                  <CheckIcon />
                </Button>
                <Button
                  variant="plain"
                  onClick={() => {
                    setInputValue(text);
                    setIsEditing(false);
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
