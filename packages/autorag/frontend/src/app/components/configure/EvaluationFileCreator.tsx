import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Grid,
  GridItem,
  Label,
  List,
  ListItem,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, ActionsColumn } from '@patternfly/react-table';
import { AngleRightIcon, CubesIcon, PlusCircleIcon, TimesIcon } from '@patternfly/react-icons';
import S3FileExplorer from '@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import type { EvaluationFileEntry } from '~/app/types';
import './EvaluationFileCreator.scss';

const MIN_ROWS = 1;

const DocumentsDropdown: React.FC<{ documentIds: string[] }> = ({ documentIds }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          variant="plainText"
          onClick={() => setIsOpen((prev) => !prev)}
          isExpanded={isOpen}
        >
          <Label isCompact>{documentIds.length} selected</Label>
        </MenuToggle>
      )}
      popperProps={{ position: 'end', appendTo: () => document.body }}
    >
      <DropdownList>
        {documentIds.map((doc, i) => (
          <DropdownItem key={`${doc}-${i}`} isDisabled>
            {doc}
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
};

type EvaluationRow = {
  id: number;
  question: string;
  correctAnswer: string;
  documentIds: string[];
};

type EvaluationFileCreatorProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (key: string) => void;
  namespace: string;
  secretName: string;
  experimentName: string;
  inputDataKey: string;
};

const EvaluationFileCreator: React.FC<EvaluationFileCreatorProps> = ({
  isOpen,
  onClose,
  onCreated,
  namespace,
  secretName,
  experimentName,
  inputDataKey,
}) => {
  const notification = useNotification();
  const uploadMutation = useUploadToStorageMutation(namespace, secretName);
  const nextRowIdRef = useRef(0);
  const cancelledRef = useRef(false);

  const [question, setQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputDataIsFile =
    inputDataKey.trim() !== '' && !inputDataKey.endsWith('/') && inputDataKey.includes('.');
  const inputDataFilename = inputDataIsFile
    ? (inputDataKey.split('/').pop() ?? inputDataKey)
    : undefined;

  const effectiveDocumentIds = useMemo(
    () => (inputDataFilename ? [inputDataFilename] : documentIds),
    [inputDataFilename, documentIds],
  );

  const isFormValid =
    question.trim() !== '' && correctAnswer.trim() !== '' && effectiveDocumentIds.length > 0;
  const isFormDirty =
    question.trim() !== '' || correctAnswer.trim() !== '' || documentIds.length > 0;
  const isSubmitEnabled = rows.length >= MIN_ROWS && !isSubmitting && !isFormDirty;

  const clearForm = useCallback(() => {
    setQuestion('');
    setCorrectAnswer('');
    setDocumentIds([]);
  }, []);

  const resetAll = useCallback(() => {
    clearForm();
    setRows([]);
    setFileExplorerOpen(false);
    setIsSubmitting(false);
  }, [clearForm]);

  const handleClose = useCallback(() => {
    cancelledRef.current = true;
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  const handleAdd = useCallback(() => {
    if (!isFormValid) {
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        id: nextRowIdRef.current++,
        question: question.trim(),
        correctAnswer: correctAnswer.trim(),
        documentIds: [...effectiveDocumentIds],
      },
    ]);
    clearForm();
  }, [isFormValid, question, correctAnswer, effectiveDocumentIds, clearForm]);

  const handleEdit = useCallback(
    (index: number) => {
      const row = rows[index];
      setQuestion(row.question);
      setCorrectAnswer(row.correctAnswer);
      setDocumentIds([...row.documentIds]);
      setRows((prev) => prev.filter((_, i) => i !== index));
    },
    [rows],
  );

  const handleDelete = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveDocument = useCallback((docIndex: number) => {
    setDocumentIds((prev) => prev.filter((_, i) => i !== docIndex));
  }, []);

  const handleSubmit = useCallback(async () => {
    const jsonData: EvaluationFileEntry[] = rows.map((row) => ({
      question: row.question,
      correct_answers: [row.correctAnswer], // eslint-disable-line camelcase
      correct_answer_document_ids: row.documentIds, // eslint-disable-line camelcase
    }));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace(/-/g, '');
    const sanitizedName = experimentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${sanitizedName}_${timestamp}.json`;

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });

    cancelledRef.current = false;
    setIsSubmitting(true);
    try {
      const response = await uploadMutation.mutateAsync({ file });
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated async by handleClose
      if (cancelledRef.current) {
        return;
      }
      resetAll();
      onCreated(response.key);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated async by handleClose
      if (cancelledRef.current) {
        return;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      notification.error('Failed to create evaluation file', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [rows, experimentName, uploadMutation, onCreated, notification, resetAll]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        aria-label="Create an evaluation source"
        variant="large"
        data-testid="evaluation-creator-modal"
      >
        <ModalHeader
          title="Create an evaluation source"
          description="Build a test dataset by adding at least one question-answer pair. The resulting file will be uploaded to your S3 bucket and used to evaluate pattern accuracy."
        />
        <ModalBody className="autorag-evaluation-creator__body">
          <Grid hasGutter className="autorag-evaluation-creator__grid">
            <GridItem span={4} className="autorag-evaluation-creator__form-column">
              <Card variant="secondary" isFullHeight>
                <CardBody>
                  <Title headingLevel="h3">Add Q&amp;A pair</Title>
                  <Content component="small">
                    Enter a question, the expected answer, and the source documents. Each entry
                    helps measure how accurately a RAG pattern retrieves context and generates
                    responses.
                  </Content>
                  <Form className="autorag-evaluation-creator__form">
                    <FormGroup label="Question" isRequired fieldId="eval-question">
                      <TextArea
                        id="eval-question"
                        data-testid="eval-question"
                        value={question}
                        onChange={(_event, value) => setQuestion(value)}
                        placeholder="Enter a sample question that can be answered by your documents or knowledge bases"
                        rows={4}
                        resizeOrientation="vertical"
                      />
                    </FormGroup>
                    <FormGroup label="Correct answer" isRequired fieldId="eval-answer">
                      <TextArea
                        id="eval-answer"
                        data-testid="eval-answer"
                        value={correctAnswer}
                        onChange={(_event, value) => setCorrectAnswer(value)}
                        placeholder="Enter the correct answer to the sample question"
                        rows={4}
                        resizeOrientation="vertical"
                      />
                    </FormGroup>
                    <FormGroup
                      className="autorag-evaluation-creator__documents"
                      label="Related documents"
                      labelInfo={
                        !inputDataIsFile ? (
                          <Button
                            variant="tertiary"
                            size="sm"
                            isInline
                            icon={<PlusCircleIcon />}
                            onClick={() => setFileExplorerOpen(true)}
                            data-testid="eval-select-documents"
                          >
                            Select
                          </Button>
                        ) : undefined
                      }
                      fieldId="eval-documents"
                    >
                      <Content component="small">
                        {inputDataIsFile
                          ? 'The selected input data file will be used as the document reference.'
                          : 'Select the documents that contain the relevant information for the correct answer.'}
                      </Content>
                      {effectiveDocumentIds.length > 0 && (
                        <List isPlain className="autorag-evaluation-creator__doc-list">
                          {effectiveDocumentIds.map((doc, i) => (
                            <ListItem key={`${doc}-${i}`}>
                              <Flex
                                alignItems={{ default: 'alignItemsCenter' }}
                                gap={{ default: 'gapSm' }}
                                flexWrap={{ default: 'nowrap' }}
                              >
                                <FlexItem
                                  grow={{ default: 'grow' }}
                                  className="autorag-evaluation-creator__doc-name"
                                  title={doc}
                                >
                                  {doc}
                                </FlexItem>
                                {!inputDataIsFile && (
                                  <FlexItem>
                                    <Button
                                      variant="plain"
                                      aria-label={`Remove ${doc}`}
                                      onClick={() => handleRemoveDocument(i)}
                                      size="sm"
                                    >
                                      <TimesIcon />
                                    </Button>
                                  </FlexItem>
                                )}
                              </Flex>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </FormGroup>
                  </Form>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem span={1} className="autorag-evaluation-creator__add-button">
              <Button
                variant="secondary"
                isDisabled={!isFormValid}
                onClick={handleAdd}
                icon={<AngleRightIcon />}
                iconPosition="end"
                data-testid="eval-add-row"
              >
                Add
              </Button>
            </GridItem>
            <GridItem span={7} className="autorag-evaluation-creator__table-container">
              <Table
                aria-label="Evaluation entries"
                data-testid="eval-entries-table"
                isStickyHeader
                isStriped={rows.length > 0}
              >
                <Thead>
                  <Tr>
                    <Th>Question</Th>
                    <Th>Correct answer</Th>
                    <Th width={25} modifier="nowrap">
                      Related documents
                    </Th>
                    <Th screenReaderText="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.length === 0 ? (
                    <Tr>
                      <Td colSpan={4}>
                        <EmptyState
                          variant={EmptyStateVariant.sm}
                          icon={CubesIcon}
                          titleText="No questions or answers"
                        >
                          <EmptyStateBody>
                            Use the form to add question and answer pairs.
                          </EmptyStateBody>
                        </EmptyState>
                      </Td>
                    </Tr>
                  ) : (
                    rows.map((row, index) => (
                      <Tr key={row.id}>
                        <Td dataLabel="Question">
                          <div
                            className="autorag-evaluation-creator__cell-truncate"
                            title={row.question}
                          >
                            {row.question}
                          </div>
                        </Td>
                        <Td dataLabel="Correct answer">
                          <div
                            className="autorag-evaluation-creator__cell-truncate"
                            title={row.correctAnswer}
                          >
                            {row.correctAnswer}
                          </div>
                        </Td>
                        <Td dataLabel="Related documents">
                          {row.documentIds.length === 1 ? (
                            <span title={row.documentIds[0]}>{row.documentIds[0]}</span>
                          ) : (
                            <DocumentsDropdown documentIds={row.documentIds} />
                          )}
                        </Td>
                        <Td isActionCell>
                          <ActionsColumn
                            popperProps={{ appendTo: () => document.body }}
                            items={[
                              {
                                title: 'Edit',
                                onClick: () => handleEdit(index),
                              },
                              {
                                title: 'Delete',
                                onClick: () => handleDelete(index),
                              },
                            ]}
                          />
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </GridItem>
          </Grid>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            isDisabled={!isSubmitEnabled}
            isLoading={isSubmitting}
            onClick={handleSubmit}
            data-testid="eval-create-submit"
          >
            Create evaluation source
          </Button>
          <Button variant="link" onClick={handleClose} data-testid="eval-create-cancel">
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
      <S3FileExplorer
        apiPath="/autorag/api/v1/s3"
        namespace={namespace}
        s3SecretName={secretName}
        isOpen={fileExplorerOpen}
        onClose={() => setFileExplorerOpen(false)}
        onSelectFiles={(files) => {
          if (files.length > 0) {
            const newNames = files.map((f) => f.name);
            setDocumentIds((prev) => [...prev, ...newNames.filter((name) => !prev.includes(name))]);
          }
        }}
        selection="checkbox"
        allowFolderSelection={false}
        selectableExtensions={['pdf', 'docx', 'pptx', 'md', 'html', 'txt']}
        unselectableReason="You can only select document files"
        rootPath={
          !inputDataIsFile && inputDataKey.trim()
            ? `/${inputDataKey.replace(/^\//, '')}`
            : undefined
        }
      />
    </>
  );
};

export default EvaluationFileCreator;
