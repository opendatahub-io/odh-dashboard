import React from 'react';
import {
  Alert,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { MAX_DESCRIPTION_LENGTH, MAX_DISPLAY_NAME_LENGTH } from '~/app/utilities/const';
import { formatDisplayValue } from '~/app/utilities/utils';
import { defaultIndexingRunName } from '~/app/utilities/indexingPipeline';

export type RunIndexingPipelineFormValues = {
  runName: string;
  description?: string;
};

type RunIndexingPipelineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (values: RunIndexingPipelineFormValues) => void | Promise<void>;
  isSubmitting: boolean;
  pattern?: AutoragPattern;
  /** Display name of the AutoRAG optimization run that produced the pattern. */
  sourceRunName?: string;
  errorMessage?: string | null;
};

const unicodeLength = (value: string): number => Array.from(value).length;

const RunIndexingPipelineModal: React.FC<RunIndexingPipelineModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  pattern,
  sourceRunName,
  errorMessage,
}) => {
  const [runName, setRunName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isParametersExpanded, setIsParametersExpanded] = React.useState(false);

  const runParameters = pattern?.indexing?.pipeline_spec?.parameters;
  const parameterEntries = runParameters ? Object.entries(runParameters) : [];
  const hasRunParameters = parameterEntries.length > 0;

  React.useEffect(() => {
    if (isOpen && pattern) {
      setRunName(defaultIndexingRunName(pattern.name, sourceRunName));
      setDescription('');
      setIsParametersExpanded(false);
    }
    if (!isOpen) {
      setRunName('');
      setDescription('');
      setIsParametersExpanded(false);
    }
  }, [isOpen, pattern, sourceRunName]);

  const trimmedName = runName.trim();
  const trimmedDescription = description.trim();
  const isRunNameTooLong = unicodeLength(trimmedName) > MAX_DISPLAY_NAME_LENGTH;
  const isDescriptionTooLong = unicodeLength(trimmedDescription) > MAX_DESCRIPTION_LENGTH;
  const canSubmit =
    trimmedName.length > 0 && !isRunNameTooLong && !isDescriptionTooLong && !isSubmitting;

  const handleConfirm = React.useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    await onConfirm({
      runName: trimmedName,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    });
  }, [canSubmit, onConfirm, trimmedName, trimmedDescription]);

  return (
    <Modal
      variant="medium"
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      data-testid="run-indexing-pipeline-modal"
    >
      <ModalHeader
        title="Start indexing pipeline run"
        description={
          <>
            This action starts an indexing pipeline run. Track its progress and view results on the{' '}
            <strong>Runs</strong> page.
          </>
        }
      />
      <ModalBody>
        <Form>
          <FormGroup label="Run name" isRequired fieldId="indexing-run-name">
            <TextInput
              id="indexing-run-name"
              value={runName}
              onChange={(_event, value) => setRunName(value)}
              isRequired
              isDisabled={isSubmitting}
              validated={isRunNameTooLong ? 'error' : 'default'}
              data-testid="indexing-run-name-input"
            />
            {isRunNameTooLong && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" data-testid="indexing-run-name-error">
                    Run name must be at most {MAX_DISPLAY_NAME_LENGTH} characters.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
          <FormGroup label="Description" fieldId="indexing-run-description">
            <TextArea
              id="indexing-run-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
              isDisabled={isSubmitting}
              resizeOrientation="vertical"
              validated={isDescriptionTooLong ? 'error' : 'default'}
              aria-label="Indexing pipeline run description"
              data-testid="indexing-run-description-input"
            />
            {isDescriptionTooLong && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" data-testid="indexing-run-description-error">
                    Description must be at most {MAX_DESCRIPTION_LENGTH} characters.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        </Form>
        {hasRunParameters && (
          <ExpandableSection
            className="pf-v6-u-mt-md"
            toggleTextExpanded="Hide run parameters"
            toggleTextCollapsed="Show run parameters"
            isExpanded={isParametersExpanded}
            onToggle={(_event, isExpanded) => setIsParametersExpanded(isExpanded)}
            data-testid="run-indexing-pipeline-parameters"
          >
            <DescriptionList
              isHorizontal
              horizontalTermWidthModifier={{ default: '20ch', md: '30ch' }}
              data-testid="run-indexing-pipeline-parameters-list"
            >
              {parameterEntries.map(([key, value]) => (
                <DescriptionListGroup key={key}>
                  <DescriptionListTerm>{key}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatDisplayValue(value)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          </ExpandableSection>
        )}
        {errorMessage && (
          <Alert
            variant="danger"
            title="Unable to create indexing pipeline run"
            isInline
            className="pf-v6-u-mt-md"
            data-testid="run-indexing-pipeline-error"
          >
            {errorMessage}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleConfirm}
          isDisabled={!canSubmit}
          isLoading={isSubmitting}
          spinnerAriaValueText="Creating indexing pipeline run"
          data-testid="confirm-run-indexing-pipeline-button"
        >
          Run
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RunIndexingPipelineModal;
