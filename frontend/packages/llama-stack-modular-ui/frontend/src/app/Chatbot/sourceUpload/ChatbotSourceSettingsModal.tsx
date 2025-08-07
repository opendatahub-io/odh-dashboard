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
import useFetchModelsByType from '~/app/hooks/useFetchModelsByType';
import useFetchVectorDBs from '~/app/hooks/useFetchVectorDBs';
import { ChatbotSourceSettings } from '~/app/types';

type ChatbotSourceSettingsModalProps = {
  onToggle: () => void;
  onSubmitSettings: (settings: ChatbotSourceSettings | null) => void;
};

const DEFAULT_SOURCE_SETTINGS: ChatbotSourceSettings = {
  embeddingModel: '',
  vectorDB: '',
  delimiter: '',
  maxChunkLength: '',
  chunkOverlap: '',
};

const ChatbotSourceSettingsModal: React.FC<ChatbotSourceSettingsModalProps> = ({
  onToggle,
  onSubmitSettings,
}) => {
  const [fields, setFields] = React.useState<ChatbotSourceSettings>(DEFAULT_SOURCE_SETTINGS);
  const [isEmbeddingModelDropdownOpen, setIsEmbeddingModelDropdownOpen] = React.useState(false);
  const [isVectorDBDropdownOpen, setIsVectorDBDropdownOpen] = React.useState(false);
  const { embeddingModels, fetchModels: fetchEmbeddingModels } = useFetchModelsByType('embedding');
  const { vectorDBs, fetchVectorDBs: fetchVectorDBs } = useFetchVectorDBs();
  const maxChunkLengthLabelHelpRef = React.useRef(null);
  const sourceSettingsHelpRef = React.useRef(null);

  React.useEffect(() => {
    const fetchEmbeddingModelsData = async () => {
      await fetchEmbeddingModels();
    };

    fetchEmbeddingModelsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const fetchVectorDBsData = async () => {
      await fetchVectorDBs();
    };

    fetchVectorDBsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (event: React.FormEvent<HTMLInputElement>, value: string) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const { name } = event.target as HTMLInputElement;
    setFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const dropdownToggle = () => {
    setIsEmbeddingModelDropdownOpen(!isEmbeddingModelDropdownOpen);
  };

  const vectorDBDropdownToggle = () => {
    setIsVectorDBDropdownOpen(!isVectorDBDropdownOpen);
  };

  const onFocus = () => {
    const element = document.getElementById('modal-dropdown-toggle');
    if (element) {
      element.focus();
    }
  };

  const onSourceSelect = (value: string) => {
    setIsEmbeddingModelDropdownOpen(false);
    setFields((prev) => ({
      ...prev,
      embeddingModel: value,
    }));
    onFocus();
  };

  const onVectorDBSelect = (value: string) => {
    setIsVectorDBDropdownOpen(false);
    setFields((prev) => ({
      ...prev,
      vectorDB: value,
    }));
  };

  const onSubmitVectorDBCreation = () => {
    // TODO: Implement vector database creation using registerVectorDB function in llamaStackService.ts
  };

  return (
    <>
      <Modal
        variant={ModalVariant.small}
        isOpen
        onClose={onToggle}
        aria-labelledby="source-settings-form-modal-title"
        data-testid="source-settings-modal"
      >
        <ModalHeader
          title="Source input settings"
          description={
            vectorDBs.length !== 0
              ? 'Review the embedding settings that will be used to process your source'
              : 'No vector databases found. Please create a vector database first.'
          }
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
        {vectorDBs.length !== 0 ? (
          <>
            <ModalBody>
              <Form id="source-settings-form">
                <FormGroup fieldId="source-settings-form-vectorDB">
                  <Title headingLevel="h5" style={{ marginBottom: '1.25rem' }}>
                    Vector Database
                  </Title>
                  <Dropdown
                    isOpen={isVectorDBDropdownOpen}
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    onSelect={(_, value) => onVectorDBSelect(value as string)}
                    onOpenChange={(isOpen: boolean) => setIsVectorDBDropdownOpen(isOpen)}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        id="modal-dropdown-toggle"
                        ref={toggleRef}
                        onClick={vectorDBDropdownToggle}
                        isExpanded={isVectorDBDropdownOpen}
                      >
                        {fields.vectorDB || 'Select a vector database'}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {vectorDBs.map((option) => (
                        <DropdownItem value={option.identifier} key={option.identifier}>
                          {option.identifier}
                        </DropdownItem>
                      ))}
                    </DropdownList>
                  </Dropdown>
                </FormGroup>
                <FormGroup fieldId="source-settings-form-embeddingModel">
                  <Title headingLevel="h5" style={{ marginBottom: '1.25rem' }}>
                    Embedding model
                  </Title>
                  <Dropdown
                    isOpen={isEmbeddingModelDropdownOpen}
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    onSelect={(_, value) => onSourceSelect(value as string)}
                    onOpenChange={(isOpen: boolean) => setIsEmbeddingModelDropdownOpen(isOpen)}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        id="modal-dropdown-toggle"
                        ref={toggleRef}
                        onClick={dropdownToggle}
                        isExpanded={isEmbeddingModelDropdownOpen}
                      >
                        {fields.embeddingModel || 'Select a model'}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {embeddingModels.map((option) => (
                        <DropdownItem value={option.identifier} key={option.identifier}>
                          {option.identifier}
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
                <FormGroup
                  label="Chunk overlap"
                  isRequired
                  fieldId="source-settings-form-chunkOverlap"
                >
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
          </>
        ) : (
          <>
            <ModalBody>
              <Form id="vector-db-registration-form">
                <FormGroup fieldId="vector-db-registration-form-vectorDB">
                  <Title headingLevel="h5" style={{ marginBottom: '1.25rem' }}>
                    Vector Database Registration
                  </Title>
                  <TextInput
                    type="text"
                    id="vector-db-registration-form-vectorDB"
                    name="vectorDB"
                    value={fields.vectorDB}
                    onChange={handleInputChange}
                  />
                </FormGroup>
                <FormGroup fieldId="source-settings-form-embeddingModel">
                  <Title headingLevel="h5" style={{ marginBottom: '1.25rem' }}>
                    Embedding model
                  </Title>
                  <Dropdown
                    isOpen={isEmbeddingModelDropdownOpen}
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    onSelect={(_, value) => onSourceSelect(value as string)}
                    onOpenChange={(isOpen: boolean) => setIsEmbeddingModelDropdownOpen(isOpen)}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        id="modal-dropdown-toggle"
                        ref={toggleRef}
                        onClick={dropdownToggle}
                        isExpanded={isEmbeddingModelDropdownOpen}
                      >
                        {fields.embeddingModel || 'Select a model'}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {embeddingModels.map((option) => (
                        <DropdownItem value={option.identifier} key={option.identifier}>
                          {option.identifier}
                        </DropdownItem>
                      ))}
                    </DropdownList>
                  </Dropdown>
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button key="register" variant="link" onClick={() => onSubmitVectorDBCreation()}>
                Register
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
};

export { ChatbotSourceSettingsModal };
