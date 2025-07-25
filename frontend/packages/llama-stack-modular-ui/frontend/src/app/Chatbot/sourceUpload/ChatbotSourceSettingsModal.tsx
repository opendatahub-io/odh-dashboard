import React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Form,
  FormGroup,
  FormGroupLabelHelp,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Popover,
  TextInput,
  Title,
} from '@patternfly/react-core';

export type ChatbotSourceSettings = {
  embeddingModel: string;
  delimiter: string;
  maxChunkLength: string;
  chunkOverlap: string;
};

type ChatbotSourceSettingsModalProps = {
  onToggle: () => void;
  onSubmitSettings: (settings: ChatbotSourceSettings | null) => void;
};

const DEFAULT_SOURCE_SETTINGS: ChatbotSourceSettings = {
  embeddingModel: '',
  delimiter: '',
  maxChunkLength: '',
  chunkOverlap: '',
};

// TODO: Remove when model options are available from the backend
const MODEL_OPTIONS = [
  { value: 'Model 1', label: 'Model 1' },
  { value: 'Model 2', label: 'Model 2' },
  { value: 'Model 3', label: 'Model 3' },
];

const ChatbotSourceSettingsModal: React.FC<ChatbotSourceSettingsModalProps> = ({
  onToggle,
  onSubmitSettings,
}) => {
  const [fields, setFields] = React.useState<ChatbotSourceSettings>(DEFAULT_SOURCE_SETTINGS);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const maxChunkLengthLabelHelpRef = React.useRef(null);
  const sourceSettingsHelpRef = React.useRef(null);

  const handleInputChange = (event: React.FormEvent<HTMLInputElement>, value: string) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const { name } = event.target as HTMLInputElement;
    setFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const dropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const onFocus = () => {
    const element = document.getElementById('modal-dropdown-toggle');
    if (element) {
      element.focus();
    }
  };

  const onSourceSelect = (value: string) => {
    setIsDropdownOpen(false);
    setFields((prev) => ({
      ...prev,
      embeddingModel: value,
    }));
    onFocus();
  };

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen
      onClose={onToggle}
      aria-labelledby="source-settings-form-modal-title"
      data-testid="source-settings-modal"
    >
      <ModalHeader
        title="Source input settings"
        description="Review the embedding settings that will be used to process your source"
        descriptorId="source-settings-modal-box-description-form"
        labelId="source-settings-form-modal-title"
        help={
          <Popover
            triggerRef={sourceSettingsHelpRef}
            headerContent={<div>Source input settings</div>}
            bodyContent={<div>Source input settings.</div>}
          >
            <FormGroupLabelHelp
              ref={sourceSettingsHelpRef}
              aria-label="More info for source input settings"
              style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}
            />
          </Popover>
        }
      />
      <ModalBody>
        <Form id="source-settings-form">
          <Title headingLevel="h5">Embedding model</Title>
          <FormGroup fieldId="source-settings-form-embeddingModel">
            <Dropdown
              isOpen={isDropdownOpen}
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              onSelect={(_, value) => onSourceSelect(value as string)}
              onOpenChange={(isOpen: boolean) => setIsDropdownOpen(isOpen)}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  id="modal-dropdown-toggle"
                  ref={toggleRef}
                  onClick={dropdownToggle}
                  isExpanded={isDropdownOpen}
                >
                  {fields.embeddingModel || 'Select a model'}
                </MenuToggle>
              )}
            >
              <DropdownList>
                {MODEL_OPTIONS.map((option) => (
                  <DropdownItem value={option.value} key={option.value}>
                    {option.label}
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </FormGroup>
          <Title headingLevel="h5">Chunk settings</Title>
          <FormGroup label="Delimiter" fieldId="source-settings-form-delimiter">
            <TextInput
              type="text"
              id="source-settings-form-delimiter"
              name="delimiter"
              value={fields.delimiter}
              onChange={handleInputChange}
            />
          </FormGroup>
          <FormGroup
            label="Maximum chunk length"
            labelHelp={
              <Popover
                triggerRef={maxChunkLengthLabelHelpRef}
                headerContent={<div>Maximum chunk length</div>}
                bodyContent={
                  <div>The maximum length of a chunk of text to be used for embedding.</div>
                }
              >
                <FormGroupLabelHelp
                  ref={maxChunkLengthLabelHelpRef}
                  aria-label="More info for maximum chunk length"
                />
              </Popover>
            }
            isRequired
            fieldId="source-settings-form-maxChunkLength"
          >
            <TextInput
              isRequired
              type="text"
              id="source-settings-form-maxChunkLength"
              name="maxChunkLength"
              value={fields.maxChunkLength}
              onChange={handleInputChange}
            />
          </FormGroup>
          <FormGroup label="Chunk overlap" isRequired fieldId="source-settings-form-chunkOverlap">
            <TextInput
              type="text"
              id="source-settings-form-chunkOverlap"
              name="chunkOverlap"
              isRequired
              value={fields.chunkOverlap}
              onChange={handleInputChange}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button key="upload" variant="primary" onClick={() => onSubmitSettings(fields)}>
          Upload
        </Button>
        <Button key="cancel" variant="link" onClick={onToggle}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export { ChatbotSourceSettingsModal };
