import * as React from 'react';
import {
  Alert,
  AlertActionLink,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CodeEditorControl, Language } from '@patternfly/react-code-editor';
import { TimesIcon, UploadIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import {
  applyImportName,
  findNameCollision,
  getImportWarnings,
  IMPORT_COLLECTION_TEMPLATE,
  parseImportContent,
  proposeUniqueName,
  readFileAsUTF8Text,
  validateImportFile,
  isNameConflictError,
} from '~/app/utils/collectionImport';
import { useCollectionsQuery, useImportCollectionMutation } from '~/app/hooks/collections';
import useDarkMode from '~/app/hooks/useDarkMode';
import { evaluationBenchmarkSuitesRoute } from '~/app/routes';
import type { Collection, ImportCollectionResponse } from '~/app/types';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import type { EvalHubCollectionSurface } from '~/app/tracking/evalhubTrackingConstants';
import EvalHubCodeEditor from '~/app/components/EvalHubCodeEditor';
import './ImportCollectionModal.scss';

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
  const [success, setSuccess] = React.useState<ImportCollectionResponse | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const importMutation = useImportCollectionMutation(namespace);
  const collectionsQuery = useCollectionsQuery(namespace);
  const isDarkTheme = useDarkMode();
  const collections: Collection[] = collectionsQuery.data?.items ?? [];

  React.useEffect(() => {
    if (isOpen) {
      setText(IMPORT_COLLECTION_TEMPLATE);
      setFilename('');
      setFileError(null);
      setSuccess(null);
      setSubmitError(null);
      importMutation.reset();
      trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_IMPORT_OPENED, { surface });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset exactly once per open
  }, [isOpen]);

  const parsed = React.useMemo(() => parseImportContent(text), [text]);
  const warnings = React.useMemo(
    () => (parsed.doc ? getImportWarnings(parsed.doc) : []),
    [parsed.doc],
  );
  const parsedName =
    parsed.doc && typeof parsed.doc.name === 'string' && parsed.doc.name.trim() !== ''
      ? parsed.doc.name.trim()
      : null;
  const collision = parsedName !== null ? findNameCollision(parsedName, collections) : undefined;
  const suggestedName =
    collision !== undefined && parsedName !== null
      ? proposeUniqueName(parsedName, collections)
      : null;

  const canSubmit =
    parsed.doc !== null &&
    parsed.error === undefined &&
    // A name collision must be resolved (suggested name accepted or edited)
    // before the import can be submitted.
    collision === undefined &&
    !importMutation.isPending &&
    !success;

  const handleFile = React.useCallback((file: File) => {
    setFileError(null);
    setSuccess(null);
    setSubmitError(null);
    const validationError = validateImportFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setFilename(file.name);
    readFileAsUTF8Text(file)
      .then((content) => setText(content))
      .catch((e) => {
        setFilename('');
        setFileError(e instanceof Error ? e.message : String(e));
      });
  }, []);

  const useSuggestedName = React.useCallback(() => {
    if (suggestedName !== null) {
      setText((current) => applyImportName(current, suggestedName));
    }
  }, [suggestedName]);

  const handleSubmit = React.useCallback(() => {
    setSubmitError(null);
    importMutation.mutate(text, {
      onSuccess: (result) => {
        trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_IMPORT_SUCCEEDED, { surface });
        setSuccess(result);
      },
      onError: (error) => {
        trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_IMPORT_FAILED, { surface });
        setSubmitError(error.message);
      },
    });
  }, [importMutation, surface, text]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="medium"
      className="evalhub-import-collection-modal"
      data-testid="import-collection-modal"
    >
      <ModalHeader
        title="Import collection"
        description="Import a benchmark collection from a YAML or JSON file, or edit the definition manually."
      />
      <ModalBody>
        <Stack hasGutter>
          {success ? (
            <StackItem key="success">
              <Alert
                variant="success"
                title={`Collection "${success.collection.name}" imported successfully`}
                data-testid="import-collection-success"
                isInline
              >
                <p>
                  The imported collection is now available in{' '}
                  <Link to={evaluationBenchmarkSuitesRoute(namespace)}>
                    my benchmark collections
                  </Link>
                  .
                </p>
                {(success.warnings ?? []).length > 0 ? (
                  <ul>
                    {(success.warnings ?? []).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </Alert>
            </StackItem>
          ) : null}
          {!success && fileError ? (
            <StackItem key="file-error">
              <Alert
                variant="danger"
                title={fileError}
                data-testid="import-collection-file-error"
                isInline
              />
            </StackItem>
          ) : null}
          {!success && parsed.error ? (
            <StackItem key="parse-error">
              <Alert
                variant="danger"
                title={parsed.error}
                data-testid="import-collection-parse-error"
                isInline
              />
            </StackItem>
          ) : null}
          {!success && parsed.documentCount > 1 ? (
            <StackItem key="multi-doc">
              <Alert
                variant="info"
                title={`This file contains ${parsed.documentCount} collection definitions. Only the first will be imported; the rest are ignored.`}
                data-testid="import-collection-multi-doc"
                isInline
              />
            </StackItem>
          ) : null}
          {!success && collision !== undefined ? (
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
          {!success && warnings.length > 0 ? (
            <StackItem key="warnings">
              <Alert
                variant="warning"
                title="Review before importing"
                data-testid="import-collection-warnings"
                isInline
              >
                <ul>
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            </StackItem>
          ) : null}
          {!success && submitError ? (
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
          <StackItem
            key="editor"
            className="evalhub-import-collection-modal__editor-item"
            // The editor stays mounted on success: tearing down Monaco
            // mid-tokenization surfaces an unhandled "Canceled" rejection.
            hidden={success !== null}
          >
            <div
              className={
                isDragActive
                  ? 'evalhub-import-collection-modal__editor evalhub-import-collection-modal__editor--drag-hover'
                  : 'evalhub-import-collection-modal__editor'
              }
              data-testid="import-collection-editor"
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragActive(false);
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
                data-testid="import-collection-file-input"
                onChange={(event) => {
                  const { currentTarget: input } = event;
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
                errorLine={parsed.errorLine}
                onChange={setText}
                isDarkTheme={isDarkTheme}
                isLanguageLabelVisible
                language={Language.yaml}
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
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <CodeEditorControl
                      icon={<TimesIcon />}
                      aria-label="Clear the collection definition"
                      tooltipProps={{ content: 'Clear' }}
                      onClick={() => {
                        setText('');
                        setFilename('');
                        setFileError(null);
                      }}
                    />
                  </>
                }
              />
            </div>
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
          onClick={onClose}
          data-testid="import-collection-cancel"
        >
          {success ? 'Close' : 'Cancel'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ImportCollectionModal;
