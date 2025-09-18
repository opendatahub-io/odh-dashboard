import React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Form,
  FormGroup,
  FormGroupLabelHelp,
  FormSection,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Popover,
  Spinner,
  Stack,
  TextInput,
  Title,
} from '@patternfly/react-core';

import { ChatbotSourceSettings } from '~/app/types';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import { createVectorStore } from '~/app/services/llamaStackService';

type ChatbotSourceSettingsModalProps = {
  isOpen: boolean;
  onToggle: () => void;
  onSubmitSettings: (settings: ChatbotSourceSettings | null) => void;
  namespace?: string;
};

const DEFAULT_SOURCE_SETTINGS: ChatbotSourceSettings = {
  embeddingModel: '',
  vectorStore: '',
  delimiter: '',
};

const DEFAULT_VECTOR_STORE_FORM = {
  vectorName: '',
};

const ChatbotSourceSettingsModal: React.FC<ChatbotSourceSettingsModalProps> = ({
  isOpen,
  namespace,
  onToggle,
  onSubmitSettings,
}) => {
  const [fields, setFields] = React.useState<ChatbotSourceSettings>(DEFAULT_SOURCE_SETTINGS);

  const [isVectorStoreDropdownOpen, setIsVectorStoreDropdownOpen] = React.useState(false);
  const maxChunkLengthLabelHelpRef = React.useRef(null);
  const sourceSettingsHelpRef = React.useRef(null);
  const [vectorStores, vectorStoresLoaded, vectorStoresError, refreshVectorStores] =
    useFetchVectorStores(namespace);

  // Vector store creation state
  const [vectorStoreForm, setVectorStoreForm] = React.useState(DEFAULT_VECTOR_STORE_FORM);
  const [isCreatingVectorStore, setIsCreatingVectorStore] = React.useState(false);
  const title = 'Source input settings';
  const vectorStoreName = vectorStores.find(
    (vectorStore) => vectorStore.id === fields.vectorStore,
  )?.name;

  if (!isOpen) {
    return null;
  }

  const handleInputChange = (event: React.FormEvent<HTMLInputElement>, value: string) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const { name } = event.target as HTMLInputElement;
    setFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVectorStoreFormChange = (event: React.FormEvent<HTMLInputElement>, value: string) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const { name } = event.target as HTMLInputElement;
    setVectorStoreForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const vectorStoreDropdownToggle = () => {
    setIsVectorStoreDropdownOpen(!isVectorStoreDropdownOpen);
  };

  const onVectorStoreSelect = (value: string) => {
    setIsVectorStoreDropdownOpen(false);
    setFields((prev) => ({
      ...prev,
      vectorStore: value,
    }));
  };

  const onSubmitVectorStoreCreation = async () => {
    if (!vectorStoreForm.vectorName.trim() || !namespace) {
      return;
    }

    try {
      setIsCreatingVectorStore(true);
      const newVectorStore = await createVectorStore(vectorStoreForm.vectorName, namespace);

      // Refresh the vector stores list to include the newly created one
      await refreshVectorStores();

      // Set the newly created vector store as selected in the form
      setFields((prev) => ({
        ...prev,
        vectorStore: newVectorStore.id,
      }));

      // Reset the vector store creation form
      setVectorStoreForm(DEFAULT_VECTOR_STORE_FORM);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create vector database:', error);
    } finally {
      setIsCreatingVectorStore(false);
    }
  };

  // Loading state - maintain modal structure to prevent layout shift/flicker
  if (!vectorStoresLoaded && !vectorStoresError) {
    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={() => {
          setFields(DEFAULT_SOURCE_SETTINGS);
          setIsVectorStoreDropdownOpen(false);
          onToggle();
        }}
        aria-labelledby="source-settings-form-modal-title"
        data-testid="source-settings-modal"
      >
        <ModalHeader
          title={title}
          description="Loading vector databases..."
          descriptorId="source-settings-modal-box-description-form"
          labelId="source-settings-form-modal-title"
        />
        <ModalBody>
          <Bullseye>
            <Spinner size="lg" />
          </Bullseye>
        </ModalBody>
      </Modal>
    );
  }

  if (vectorStoresError) {
    return (
      <Modal
        isOpen
        onClose={() => {
          setFields(DEFAULT_SOURCE_SETTINGS);
          setIsVectorStoreDropdownOpen(false);
          onToggle();
        }}
        variant="medium"
        data-testid="source-settings-modal"
      >
        <ModalHeader title={title} />
        <ModalBody>
          <Stack hasGutter>
            <Alert
              data-testid="error-message-alert"
              isInline
              variant="danger"
              title="Error loading vector database"
            >
              {vectorStoresError instanceof Error ? vectorStoresError.message : vectorStoresError}
            </Alert>
          </Stack>
        </ModalBody>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={() => {
          setFields(DEFAULT_SOURCE_SETTINGS);
          setIsVectorStoreDropdownOpen(false);
          onToggle();
        }}
        aria-labelledby="source-settings-form-modal-title"
        data-testid="source-settings-modal"
      >
        <ModalHeader
          title={title}
          description={
            vectorStores.length !== 0
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
        {vectorStores.length !== 0 ? (
          <>
            <ModalBody>
              <Form id="source-settings-form" isWidthLimited>
                <FormGroup
                  label="Vector Database "
                  fieldId="source-settings-form-vectorStore"
                  isRequired
                >
                  <Dropdown
                    isOpen={isVectorStoreDropdownOpen}
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    onSelect={(_, value) => onVectorStoreSelect(value as string)}
                    onOpenChange={(open: boolean) => setIsVectorStoreDropdownOpen(open)}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        id="modal-dropdown-toggle"
                        ref={toggleRef}
                        onClick={vectorStoreDropdownToggle}
                        isExpanded={isVectorStoreDropdownOpen}
                      >
                        {vectorStoreName || 'Select a vector database'}
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>
                      {vectorStores.map((option) => (
                        <DropdownItem value={option.id} key={option.id}>
                          {option.name}
                        </DropdownItem>
                      ))}
                    </DropdownList>
                  </Dropdown>
                </FormGroup>
                {/* TODO: Uncomment this when the embedding model is implemented */}
                {/* <FormGroup
                  label="Embedding model"
                  fieldId="source-settings-form-embeddingModel"
                  isRequired
                >
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
                        <DropdownItem value={option.id} key={option.id}>
                          {option.id}
                        </DropdownItem>
                      ))}
                    </DropdownList>
                  </Dropdown>
                </FormGroup> */}
                <FormGroup>
                  <FormSection title="Chunk settings">
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
                            <div>
                              The maximum length of a chunk of text to be used for embedding.
                            </div>
                          }
                        >
                          <FormGroupLabelHelp
                            ref={maxChunkLengthLabelHelpRef}
                            aria-label="More info for maximum chunk length"
                          />
                        </Popover>
                      }
                      fieldId="source-settings-form-maxChunkLength"
                    >
                      <TextInput
                        type="number"
                        id="source-settings-form-maxChunkLength"
                        name="maxChunkLength"
                        value={fields.maxChunkLength}
                        onChange={(e, value) =>
                          setFields((prev) => ({
                            ...prev,
                            maxChunkLength: value ? Number(value) : undefined,
                          }))
                        }
                      />
                    </FormGroup>
                    <FormGroup label="Chunk overlap" fieldId="source-settings-form-chunkOverlap">
                      <TextInput
                        type="number"
                        id="source-settings-form-chunkOverlap"
                        name="chunkOverlap"
                        value={fields.chunkOverlap}
                        onChange={(e, value) =>
                          setFields((prev) => ({
                            ...prev,
                            chunkOverlap: value ? Number(value) : undefined,
                          }))
                        }
                      />
                    </FormGroup>
                  </FormSection>
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button
                key="upload"
                variant="primary"
                isDisabled={!fields.vectorStore}
                onClick={() => onSubmitSettings(fields)}
              >
                Upload
              </Button>
              <Button
                key="cancel"
                variant="link"
                onClick={() => {
                  setFields(DEFAULT_SOURCE_SETTINGS);
                  onToggle();
                }}
              >
                Cancel
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalBody>
              <Form id="vector-db-registration-form">
                <FormGroup fieldId="vector-store-registration-form-vectorName">
                  <Title headingLevel="h5" style={{ marginBottom: '1.25rem' }}>
                    Vector Database Registration
                  </Title>
                  <TextInput
                    type="text"
                    id="vector-store-registration-form-vectorName"
                    name="vectorName"
                    placeholder="Enter vector database name"
                    value={vectorStoreForm.vectorName}
                    onChange={handleVectorStoreFormChange}
                  />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button
                key="register"
                variant="primary"
                onClick={onSubmitVectorStoreCreation}
                isDisabled={!vectorStoreForm.vectorName.trim() || isCreatingVectorStore}
                isLoading={isCreatingVectorStore}
              >
                {isCreatingVectorStore ? 'Creating...' : 'Create'}
              </Button>
              <Button key="cancel" variant="link" onClick={onToggle}>
                Cancel
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
};

export { ChatbotSourceSettingsModal };
