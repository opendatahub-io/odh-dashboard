import React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Form,
  FormGroup,
  FormGroupLabelHelp,
  FormSection,
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
import { GenAiContext } from '~/app/context/GenAiContext';

type ChatbotSourceSettingsModalProps = {
  isOpen: boolean;
  onToggle: () => void;
  onSubmitSettings: (settings: ChatbotSourceSettings | null) => void;
  filename?: string;
};

const DEFAULT_SOURCE_SETTINGS: ChatbotSourceSettings = {
  embeddingModel: '',
  vectorStore: '',
  delimiter: '',
  maxChunkLength: 500,
  chunkOverlap: 50,
};

const DEFAULT_VECTOR_STORE_FORM = {
  vectorName: '',
};

const ChatbotSourceSettingsModal: React.FC<ChatbotSourceSettingsModalProps> = ({
  isOpen,
  onToggle,
  onSubmitSettings,
  filename,
}) => {
  const [fields, setFields] = React.useState<ChatbotSourceSettings>(DEFAULT_SOURCE_SETTINGS);
  const { namespace } = React.useContext(GenAiContext);

  const maxChunkLengthLabelHelpRef = React.useRef(null);
  const [vectorStores, vectorStoresLoaded, vectorStoresError, refreshVectorStores] =
    useFetchVectorStores(namespace?.name);

  // Auto-select the first vector database when vector stores are loaded
  React.useEffect(() => {
    if (vectorStoresLoaded && vectorStores.length > 0 && !fields.vectorStore) {
      setFields((prev) => ({
        ...prev,
        vectorStore: vectorStores[0].id,
      }));
    }
  }, [vectorStoresLoaded, vectorStores, fields.vectorStore]);

  // Vector store creation state
  const [vectorStoreForm, setVectorStoreForm] = React.useState(DEFAULT_VECTOR_STORE_FORM);
  const [isCreatingVectorStore, setIsCreatingVectorStore] = React.useState(false);
  const title = filename ? `RAG input settings - ${filename}` : 'RAG input settings';
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

  const onSubmitVectorStoreCreation = async () => {
    if (!vectorStoreForm.vectorName.trim() || !namespace?.name) {
      return;
    }

    try {
      setIsCreatingVectorStore(true);
      const newVectorStore = await createVectorStore(vectorStoreForm.vectorName, namespace.name);

      // Refresh the vector stores list to include the newly created one
      await refreshVectorStores();

      // Set the newly created vector store as selected in the form
      setFields((prev) => ({
        ...prev,
        vectorStore: newVectorStore.id,
      }));

      // Reset the vector store creation form
      setVectorStoreForm(DEFAULT_VECTOR_STORE_FORM);
    } catch {
      // Error is handled by the createVectorStore function
      // which will show appropriate user-facing error messages
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
          onToggle();
        }}
        aria-labelledby="source-settings-form-modal-title"
        data-testid="source-settings-modal"
      >
        <ModalHeader
          title={title}
          description={
            vectorStores.length !== 0
              ? 'Review the embedding settings that will be used to process your RAG source'
              : 'No vector databases found. Please create a vector database first.'
          }
          descriptorId="source-settings-modal-box-description-form"
          labelId="source-settings-form-modal-title"
        />
        {vectorStores.length !== 0 ? (
          <>
            <ModalBody>
              <Form id="source-settings-form" isWidthLimited>
                <FormGroup label="Vector database" fieldId="source-settings-form-vectorStore">
                  <TextInput
                    type="text"
                    id="source-settings-form-vectorStore"
                    name="vectorStore"
                    value={vectorStoreName || ''}
                    isDisabled
                    placeholder="No vector database available"
                  />
                </FormGroup>
                <FormGroup>
                  <FormSection title="Chunk settings">
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
                    <FormGroup label="Delimiter" fieldId="source-settings-form-delimiter">
                      <TextInput
                        type="text"
                        id="source-settings-form-delimiter"
                        name="delimiter"
                        value={fields.delimiter}
                        onChange={handleInputChange}
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
                isDisabled={!fields.vectorStore || !vectorStoreName}
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
