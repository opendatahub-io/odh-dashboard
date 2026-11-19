import * as React from 'react';
import {
  Alert,
  AlertActionLink,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { CodeEditorControl, Language } from '@patternfly/react-code-editor';
import { TimesIcon, UploadIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import {
  applyImportName,
  detectImportLanguage,
  findImportWarningLine,
  findNameCollision,
  getImportWarnings,
  IMPORT_COLLECTION_TEMPLATE,
  isUnmodifiedTemplate,
  parseImportContent,
  proposeUniqueName,
  readFileAsUTF8Text,
  validateImportFile,
  isNameConflictError,
} from '~/app/utils/collectionImport';
import { useCollectionsQuery, useImportCollectionMutation } from '~/app/hooks/collections';
import useDarkMode from '~/app/hooks/useDarkMode';
import { evaluationBenchmarkSuitesRoute } from '~/app/routes';
import type { Collection } from '~/app/types';
import { useEvalHubTracking } from '~/app/tracking/useEvalHubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { EvalHubCollectionSurface } from '~/app/tracking/evalhubTrackingConstants';
import EvalHubCodeEditor, { type CodeEditorDiagnostic } from '~/app/components/EvalHubCodeEditor';
import './ImportCollectionModal.scss';

// Typing in the name field rewrites the whole definition string, so the
// editor write is debounced; blur, Enter, and Import flush it immediately.
const NAME_SYNC_DEBOUNCE_MS = 250;

type ImportCollectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  namespace: string;
  surface: EvalHubCollectionSurface;
};

const ImportCollectionModal: React.FC<ImportCollectionModalProps> = ({
  isOpen,
  onClose,
  namespace,
  surface,
}) => {
  const [text, setText] = React.useState(IMPORT_COLLECTION_TEMPLATE);
  const [filename, setFilename] = React.useState('');
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  // The name field is a draft until blur/Enter commits it into the document,
  // which keeps Monaco's content the single source of truth without rewriting
  // the editor on every keystroke.
  const [nameDraft, setNameDraft] = React.useState<string | null>(null);
  const [nameTouched, setNameTouched] = React.useState(false);

  const { trackEvalHubEvent } = useEvalHubTracking();
  const navigate = useNavigate();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const nameSyncTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const importMutation = useImportCollectionMutation(namespace);
  const collectionsQuery = useCollectionsQuery(namespace);
  const isDarkTheme = useDarkMode();
  const collections: Collection[] = collectionsQuery.data?.items ?? [];
  const isSubmitting = importMutation.isPending;

  const cancelPendingNameSync = React.useCallback(() => {
    if (nameSyncTimer.current !== null) {
      clearTimeout(nameSyncTimer.current);
      nameSyncTimer.current = null;
    }
  }, []);

  React.useEffect(() => cancelPendingNameSync, [cancelPendingNameSync]);

  React.useEffect(() => {
    if (isOpen) {
      cancelPendingNameSync();
      setText(IMPORT_COLLECTION_TEMPLATE);
      setFilename('');
      setFileError(null);
      setSubmitError(null);
      setNameDraft(null);
      setNameTouched(false);
      importMutation.reset();
      trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_IMPORT_OPENED, { surface });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset exactly once per open
  }, [isOpen]);

  const parsed = React.useMemo(() => parseImportContent(text), [text]);
  const language = detectImportLanguage(text) === 'json' ? Language.json : Language.yaml;
  // Line-addressable diagnostics render in the editor as Monaco markers
  // (squiggles with hover messages); only issues that have no line — file,
  // encoding, collision, and submission errors — use alerts.
  const diagnostics = React.useMemo<CodeEditorDiagnostic[]>(() => {
    const result: CodeEditorDiagnostic[] = [];
    if (parsed.error !== undefined) {
      result.push({ severity: 'error', message: parsed.error, line: parsed.errorLine ?? 1 });
    }
    if (parsed.doc !== null) {
      getImportWarnings(parsed.doc).forEach((warning) => {
        result.push({
          severity: 'warning',
          message: warning.message,
          line: findImportWarningLine(text, warning),
        });
      });
    }
    return result;
  }, [parsed, text]);
  const isTemplate = parsed.doc !== null && isUnmodifiedTemplate(parsed.doc);
  const parsedName =
    parsed.doc && typeof parsed.doc.name === 'string' && parsed.doc.name.trim() !== ''
      ? parsed.doc.name.trim()
      : null;
  const trimmedDraft = nameDraft !== null ? nameDraft.trim() : null;
  // The draft participates in validation so typing a colliding or empty name
  // takes effect before the field is committed.
  const effectiveName = trimmedDraft ?? parsedName ?? '';
  const hasName = effectiveName !== '';
  const isNameDirty = trimmedDraft !== null && trimmedDraft !== (parsedName ?? '');
  const isNameInvalid = nameTouched && !hasName;
  const isNameDisabled = parsed.doc === null;
  const nameValue = nameDraft ?? parsedName ?? '';
  const collision = hasName ? findNameCollision(effectiveName, collections) : undefined;
  const suggestedName =
    collision !== undefined ? proposeUniqueName(effectiveName, collections) : null;

  const canSubmit =
    parsed.doc !== null &&
    parsed.error === undefined &&
    // The unedited sample template is not importable as-is; renaming it
    // through the name field counts as an edit.
    (!isTemplate || isNameDirty) &&
    hasName &&
    // A name collision must be resolved (suggested name accepted or edited)
    // before the import can be submitted.
    collision === undefined &&
    !importMutation.isPending;

  const resetNameField = React.useCallback(() => {
    setNameDraft(null);
    setNameTouched(false);
  }, []);

  const scheduleNameSync = React.useCallback(
    (value: string) => {
      cancelPendingNameSync();
      nameSyncTimer.current = setTimeout(() => {
        nameSyncTimer.current = null;
        setText((current) => applyImportName(current, value.trim()));
      }, NAME_SYNC_DEBOUNCE_MS);
    },
    [cancelPendingNameSync],
  );

  const handleEditorChange = React.useCallback(
    (value: string) => {
      if (isSubmitting) {
        return;
      }
      cancelPendingNameSync();
      setText(value);
      resetNameField();
    },
    [cancelPendingNameSync, isSubmitting, resetNameField],
  );

  const handleFile = React.useCallback(
    (file: File) => {
      if (isSubmitting) {
        return;
      }
      cancelPendingNameSync();
      setFileError(null);
      setSubmitError(null);
      const validationError = validateImportFile(file);
      if (validationError) {
        setFileError(validationError);
        return;
      }
      setFilename(file.name);
      readFileAsUTF8Text(file)
        .then((content) => {
          cancelPendingNameSync();
          setText(content);
          resetNameField();
        })
        .catch((e) => {
          setFilename('');
          setFileError(e instanceof Error ? e.message : String(e));
        });
    },
    [cancelPendingNameSync, isSubmitting, resetNameField],
  );

  const resetToTemplate = React.useCallback(() => {
    if (isSubmitting) {
      return;
    }
    cancelPendingNameSync();
    setText(IMPORT_COLLECTION_TEMPLATE);
    setFilename('');
    setFileError(null);
    setSubmitError(null);
    resetNameField();
    importMutation.reset();
  }, [cancelPendingNameSync, importMutation, isSubmitting, resetNameField]);

  const clearEditor = React.useCallback(() => {
    if (isSubmitting) {
      return;
    }
    cancelPendingNameSync();
    setText('');
    setFilename('');
    setFileError(null);
    setSubmitError(null);
    resetNameField();
  }, [cancelPendingNameSync, isSubmitting, resetNameField]);

  const commitName = React.useCallback(() => {
    if (isSubmitting) {
      return;
    }
    cancelPendingNameSync();
    if (nameDraft === null) {
      return;
    }
    setNameTouched(true);
    setNameDraft(null);
    const nextName = nameDraft.trim();
    if (nextName !== (parsedName ?? '')) {
      setText((current) => applyImportName(current, nextName));
    }
  }, [cancelPendingNameSync, isSubmitting, nameDraft, parsedName]);

  const useSuggestedName = React.useCallback(() => {
    if (!isSubmitting && suggestedName !== null) {
      cancelPendingNameSync();
      setText((current) => applyImportName(current, suggestedName));
      setNameDraft(null);
      setNameTouched(true);
    }
  }, [cancelPendingNameSync, isSubmitting, suggestedName]);

  const handleSubmit = React.useCallback(() => {
    if (isSubmitting) {
      return;
    }
    cancelPendingNameSync();
    setSubmitError(null);
    // A focused name field has not blurred yet when Import is clicked, so
    // commit any pending draft into the content being submitted.
    const content = isNameDirty ? applyImportName(text, effectiveName) : text;
    if (content !== text) {
      setText(content);
    }
    setNameDraft(null);
    setNameTouched(true);
    importMutation.mutate(content, {
      onSuccess: () => {
        trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_IMPORT_SUCCEEDED, { surface });
        onClose();
        navigate(evaluationBenchmarkSuitesRoute(namespace));
      },
      onError: (error) => {
        trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_IMPORT_FAILED, { surface });
        setSubmitError(error.message);
      },
    });
  }, [
    cancelPendingNameSync,
    effectiveName,
    importMutation,
    isNameDirty,
    isSubmitting,
    namespace,
    navigate,
    onClose,
    surface,
    text,
    trackEvalHubEvent,
  ]);

  return (
    <Modal
      isOpen={isOpen}
      // PatternFly only renders the close button (and handles Escape) when
      // onClose is provided, so omitting it locks dismissal while submitting.
      onClose={isSubmitting ? undefined : onClose}
      variant="medium"
      className="evalhub-import-collection-modal"
      data-testid="import-collection-modal"
    >
      <ModalHeader
        title="Import collection from file"
        description="Upload a YAML or JSON file, or edit the sample template. Nothing is created until you select Import."
      />
      <ModalBody>
        <Stack hasGutter>
          {fileError ? (
            <StackItem key="file-error">
              <Alert
                variant="danger"
                title={fileError}
                data-testid="import-collection-file-error"
                isInline
              />
            </StackItem>
          ) : null}
          {parsed.documentCount > 1 ? (
            <StackItem key="multi-doc">
              <Alert
                variant="info"
                title={`This file contains ${parsed.documentCount} collection definitions. Only the first will be imported; the rest are ignored.`}
                data-testid="import-collection-multi-doc"
                isInline
              />
            </StackItem>
          ) : null}
          {collision !== undefined ? (
            <StackItem key="collision">
              <Alert
                variant="warning"
                title={`A collection named "${collision.name}" already exists`}
                data-testid="import-collection-collision"
                isInline
                actionLinks={
                  suggestedName !== null ? (
                    <AlertActionLink onClick={useSuggestedName}>
                      Use suggested name &quot;{suggestedName}&quot;
                    </AlertActionLink>
                  ) : undefined
                }
              >
                Importing never modifies existing collections. Resolve the conflict by accepting the
                suggested name or editing the name in the definition below — Import stays disabled
                until the name is unique.
              </Alert>
            </StackItem>
          ) : null}
          {submitError ? (
            <StackItem key="submit-error">
              <Alert
                variant="danger"
                title="Import failed"
                data-testid="import-collection-submit-error"
                isInline
                actionLinks={
                  isNameConflictError(submitError) && suggestedName !== null ? (
                    <AlertActionLink onClick={useSuggestedName}>
                      A collection with this name may already exist. Use suggested name &quot;
                      {suggestedName}&quot; and try again
                    </AlertActionLink>
                  ) : undefined
                }
              >
                {submitError}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem key="form" className="evalhub-import-collection-modal__form-item">
            <Form className="evalhub-import-collection-modal__form">
              <FormGroup
                label="Collection definition"
                isRequired
                role="group"
                fieldId="import-collection-definition"
                className="evalhub-import-collection-modal__definition-group"
              >
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Replace the example values below, or upload your own YAML or JSON file.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <div
                  className={
                    isDragActive
                      ? 'evalhub-import-collection-modal__editor evalhub-import-collection-modal__editor--drag-hover'
                      : 'evalhub-import-collection-modal__editor'
                  }
                  data-testid="import-collection-editor"
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!isSubmitting) {
                      setIsDragActive(true);
                    }
                  }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragActive(false);
                    if (isSubmitting) {
                      return;
                    }
                    const file = event.dataTransfer.files.item(0);
                    if (file) {
                      handleFile(file);
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".yaml,.yml,.json"
                    hidden
                    disabled={isSubmitting}
                    data-testid="import-collection-file-input"
                    onChange={(event) => {
                      const { currentTarget: input } = event;
                      if (isSubmitting) {
                        return;
                      }
                      const file = input.files?.item(0);
                      if (file) {
                        handleFile(file);
                      }
                      // Allow re-selecting the same file.
                      input.value = '';
                    }}
                  />
                  <EvalHubCodeEditor
                    className="evalhub-import-collection-modal__editor-upload"
                    code={text}
                    diagnostics={diagnostics}
                    onChange={handleEditorChange}
                    isDarkTheme={isDarkTheme}
                    isLanguageLabelVisible
                    isReadOnly={isSubmitting}
                    language={language}
                    height="100%"
                    customControls={
                      <>
                        {filename ? (
                          <span
                            className="evalhub-import-collection-modal__filename"
                            data-testid="import-collection-filename"
                          >
                            {filename}
                          </span>
                        ) : null}
                        <CodeEditorControl
                          icon={<UploadIcon />}
                          aria-label="Upload a collection definition file"
                          tooltipProps={{ content: 'Upload file' }}
                          isDisabled={isSubmitting}
                          onClick={() => fileInputRef.current?.click()}
                        />
                        <CodeEditorControl
                          icon={<TimesIcon />}
                          aria-label="Clear the collection definition"
                          tooltipProps={{ content: 'Clear' }}
                          isDisabled={isSubmitting}
                          onClick={clearEditor}
                        />
                      </>
                    }
                  />
                </div>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      One .yaml, .yml, or .json file, up to 1 MiB. Files are read locally as UTF-8.
                    </HelperTextItem>
                    <HelperTextItem>
                      Syntax and advisory checks appear here. The service validates references when
                      you import.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <Button
                  variant="link"
                  isInline
                  className="pf-v6-u-mt-sm"
                  isDisabled={isSubmitting}
                  onClick={resetToTemplate}
                  data-testid="import-collection-reset"
                >
                  Reset to sample template
                </Button>
              </FormGroup>
              <FormGroup label="Collection name" isRequired fieldId="import-collection-name">
                <TextInput
                  id="import-collection-name"
                  data-testid="import-collection-name"
                  value={nameValue}
                  isDisabled={isNameDisabled || isSubmitting}
                  validated={isNameInvalid ? 'error' : 'default'}
                  aria-describedby="import-collection-name-helper"
                  onChange={(_event, value) => {
                    setNameDraft(value);
                    setNameTouched(true);
                    scheduleNameSync(value);
                  }}
                  onBlur={commitName}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitName();
                    }
                  }}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      id="import-collection-name-helper"
                      variant={isNameInvalid ? 'error' : 'default'}
                    >
                      {isNameInvalid
                        ? 'Collection name is required.'
                        : 'The collection name stays in sync with the definition above.'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </Form>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="import"
          variant="primary"
          onClick={handleSubmit}
          isLoading={importMutation.isPending}
          isDisabled={!canSubmit}
          data-testid="import-collection-submit"
        >
          Import
        </Button>
        <Button
          key="cancel"
          variant="link"
          isDisabled={isSubmitting}
          onClick={onClose}
          data-testid="import-collection-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ImportCollectionModal;
