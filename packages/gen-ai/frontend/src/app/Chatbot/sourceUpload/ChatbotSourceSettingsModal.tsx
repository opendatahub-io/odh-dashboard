import React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Content,
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
  Progress,
  Spinner,
  Stack,
  TextInput,
  Title,
} from '@patternfly/react-core';

import { ChatbotSourceSettings } from '~/app/types';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { DEFAULT_SOURCE_SETTINGS } from './utils';

type ChatbotSourceSettingsModalProps = {
  isOpen: boolean;
  onToggle: () => void;
  onSubmitSettings: (settings: ChatbotSourceSettings | null) => Promise<void>;
  pendingFiles?: File[];
  isUploading?: boolean;
  uploadProgress?: { current: number; total: number };
};

const DEFAULT_VECTOR_STORE_FORM = {
  vectorName: '',
};

const ChatbotSourceSettingsModal: React.FC<ChatbotSourceSettingsModalProps> = ({
  isOpen,
  onToggle,
  onSubmitSettings,
  pendingFiles = [],
  isUploading = false,
  uploadProgress = { current: 0, total: 0 },
}) => {
  const [fields, setFields] = React.useState<ChatbotSourceSettings>(DEFAULT_SOURCE_SETTINGS);
  const { api, apiAvailable } = useGenAiAPI();
  const maxChunkLengthLabelHelpRef = React.useRef(null);
  const vectorDatabaseLabelHelpRef = React.useRef(null);
  const chunkOverlapLabelHelpRef = React.useRef(null);
  const delimiterLabelHelpRef = React.useRef(null);
  const [vectorStores, vectorStoresLoaded, vectorStoresError, refreshVectorStores] =
    useFetchVectorStores();

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

  // Generate title based on number of files
  const getTitle = () => 'Upload files';

  const title = getTitle();
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
    if (!vectorStoreForm.vectorName.trim() || !apiAvailable) {
      return;
    }

    try {
      setIsCreatingVectorStore(true);
      const newVectorStore = await api.createVectorStore({ name: vectorStoreForm.vectorName });

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
              ? pendingFiles.length > 1
                ? `Configure the embedding settings that will be used to process the following files.`
                : 'Configure the embedding settings that will be used to process all files.'
              : 'No vector databases found. Please create a vector database first.'
          }
          descriptorId="source-settings-modal-box-description-form"
          labelId="source-settings-form-modal-title"
          aria-label={title}
        />
        {vectorStores.length !== 0 ? (
          <>
            <ModalBody>
              {isUploading && uploadProgress.total > 0 && (
                <Stack hasGutter>
                  <Alert
                    isInline
                    variant="info"
                    title={`Uploading files... ${uploadProgress.current} of ${uploadProgress.total}`}
                  >
                    <Progress
                      value={(uploadProgress.current / uploadProgress.total) * 100}
                      title="Upload Progress"
                      size="sm"
                    />
                  </Alert>
                </Stack>
              )}
              {pendingFiles.length > 0 && (
                <Content component="p">
                  <b>Files</b>
                  <Content component="ul">
                    {pendingFiles.map((file) => (
                      <li key={file.name}>{file.name}</li>
                    ))}
                  </Content>
                </Content>
              )}
              <Form id="source-settings-form" isWidthLimited>
                <FormGroup
                  label="Vector database"
                  labelHelp={
                    <Popover
                      triggerRef={vectorDatabaseLabelHelpRef}
                      headerContent={<div>Vector database</div>}
                      headerComponent="h2"
                      bodyContent={
                        <Content
                          component="p"
                          style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                        >
                          This default vector database is unique to your model playground and
                          securely stores all uploaded files within your cluster.
                        </Content>
                      }
                    >
                      <FormGroupLabelHelp
                        ref={vectorDatabaseLabelHelpRef}
                        aria-label="More info for vector database"
                      />
                    </Popover>
                  }
                  fieldId="source-settings-form-vectorStore"
                >
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
                          headerComponent="h2"
                          bodyContent={
                            <>
                              <Content
                                component="p"
                                style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                              >
                                The maximum word count for each section of text (&quot;chunk&quot;)
                                created from your uploaded files.
                              </Content>
                              <Content component="ul">
                                <Content
                                  component="li"
                                  style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                                >
                                  <b>Smaller chunks</b> are recommended for precise data retrieval.
                                </Content>
                                <Content
                                  component="li"
                                  style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                                >
                                  <b>Larger chunks</b> are recommended for tasks requiring broader
                                  context, such as summarization.
                                </Content>
                              </Content>
                            </>
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
                    <FormGroup
                      label="Chunk overlap"
                      labelHelp={
                        <Popover
                          triggerRef={chunkOverlapLabelHelpRef}
                          headerContent={<div>Chunk overlap</div>}
                          headerComponent="h2"
                          bodyContent={
                            <>
                              <Content
                                component="p"
                                style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                              >
                                The number of words from the end of one text section (chunk) that
                                are repeated at the start of the next one. This overlap helps
                                maintain continuous context across chunks, improving model
                                responses.
                              </Content>
                              <Content
                                component="p"
                                style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                              >
                                For example, the following sentence is chunked differently depending
                                on the chunk overlap: “Chunk overlap can improve the quality of
                                model responses.”
                              </Content>
                              <Content
                                component="p"
                                style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                              >
                                Maximum chunk length = 4, Chunk overlap = 1
                              </Content>
                              <Content component="ol">
                                <Content
                                  component="li"
                                  style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                                >
                                  Chunk overlap can improve
                                </Content>
                                <Content
                                  component="li"
                                  style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                                >
                                  improve the quality of
                                </Content>
                                <Content
                                  component="li"
                                  style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                                >
                                  of model responses.
                                </Content>
                              </Content>
                              <Content
                                component="p"
                                style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                              >
                                Maximum chunk length = 4, Chunk overlap = 0
                              </Content>
                              <Content component="ol">
                                <Content
                                  component="li"
                                  style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                                >
                                  Chunk overlap can improve
                                </Content>
                                <Content
                                  component="li"
                                  style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                                >
                                  the quality of model
                                </Content>
                                <Content
                                  component="li"
                                  style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                                >
                                  responses.
                                </Content>
                              </Content>
                            </>
                          }
                        >
                          <FormGroupLabelHelp
                            ref={chunkOverlapLabelHelpRef}
                            aria-label="More info for chunk overlap"
                          />
                        </Popover>
                      }
                      fieldId="source-settings-form-chunkOverlap"
                    >
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
                    <FormGroup
                      label="Delimiter"
                      labelHelp={
                        <Popover
                          triggerRef={delimiterLabelHelpRef}
                          headerContent={<div>Delimiter</div>}
                          headerComponent="h2"
                          bodyContent={
                            <Content
                              component="p"
                              style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                            >
                              A delimiter is a character or string that specifies where a text chunk
                              should end. This helps define text boundaries alongside maximum chunk
                              length and overlap, ensuring sentences or paragraphs remain intact.
                            </Content>
                          }
                        >
                          <FormGroupLabelHelp
                            ref={delimiterLabelHelpRef}
                            aria-label="More info for delimiter"
                          />
                        </Popover>
                      }
                      fieldId="source-settings-form-delimiter"
                    >
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
                isDisabled={!fields.vectorStore || !vectorStoreName || isUploading}
                isLoading={isUploading}
                onClick={async () => {
                  try {
                    await onSubmitSettings(fields);
                  } catch {
                    // Error is handled by the onSubmitSettings function
                  }
                }}
              >
                {isUploading
                  ? `Uploading... ${uploadProgress.current}/${uploadProgress.total}`
                  : pendingFiles.length > 1
                    ? `Upload ${pendingFiles.length} files`
                    : 'Upload'}
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
