import * as React from 'react';
import {
  Form,
  FormGroup,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Spinner,
  Alert,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { DuplicateNameHelperText } from '#~/concepts/pipelines/content/DuplicateNameHelperText';
import {
  PIPELINE_IMPORT_ARGO_ERROR_TEXT,
  PIPELINE_ARGO_ERROR,
  NAME_CHARACTER_LIMIT,
  DESCRIPTION_CHARACTER_LIMIT,
  PIPELINE_IMPORT_V1_ERROR_TEXT,
} from '#~/concepts/pipelines/content/const';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import useDebounceCallback from '#~/utilities/useDebounceCallback';
import NameDescriptionField from '#~/concepts/k8s/NameDescriptionField';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import PipelineMigrationNoteLinks from '#~/concepts/pipelines/content/PipelineMigrationNoteLinks';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField.tsx';
import { DSPipelineAPIServerStore } from '#~/k8sTypes.ts';
import usePipelineNamespaceCR from '#~/concepts/pipelines/context/usePipelineNamespaceCR';
import { K8sNameDescriptionFieldUpdateFunction } from '#~/concepts/k8s/K8sNameDescriptionField/types.ts';
import { PipelineUploadOption, extractKindFromPipelineYAML, isYAMLPipelineV1 } from './utils';
import PipelineUploadRadio from './PipelineUploadRadio';
import { PipelineImportData } from './useImportModalData';

export type PipelineImportBaseProps = {
  title: string;
  submitButtonText: string;
  onClose: (result?: PipelineKF | PipelineVersionKF, currentPipeline?: PipelineKF | null) => void;
  data: PipelineImportData;
  setData: UpdateObjectAtPropAndValue<PipelineImportData>;
  resetData: () => void;
  submitAction: () => Promise<PipelineKF | PipelineVersionKF>;
  checkForDuplicateName: (
    value: string,
    pipelineStore?: DSPipelineAPIServerStore,
  ) => Promise<boolean>;
  children?: React.ReactNode;
};

const pipelineImportBaseTestId = 'import-pipeline-modal';
const PipelineImportBase: React.FC<PipelineImportBaseProps> = ({
  title,
  submitButtonText,
  onClose,
  data,
  setData,
  resetData,
  submitAction,
  checkForDuplicateName,
  children,
}) => {
  const { project, apiAvailable, namespace } = usePipelinesAPI();
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { displayName, name, description, fileContents, pipelineUrl, uploadOption } = data;
  const [hasDuplicateName, setHasDuplicateName] = React.useState(false);
  const isArgoWorkflow = extractKindFromPipelineYAML(fileContents) === 'Workflow';
  const isV1PipelineFile = isYAMLPipelineV1(fileContents);
  const [pipelineNamespaceCR, crLoaded, crLoadError] = usePipelineNamespaceCR(namespace);

  const isKubernetesStorage =
    crLoaded &&
    pipelineNamespaceCR?.spec.apiServer?.pipelineStore === DSPipelineAPIServerStore.KUBERNETES;

  const { data: k8sNameDescData, onDataChange: onK8sNameDescDataChange } =
    useK8sNameDescriptionFieldData({
      initialData: {
        name: displayName,
        k8sName: '',
        description,
      },
      editableK8sName: true,
    });

  // for when pipeline context switches within modal
  React.useEffect(() => {
    if (isKubernetesStorage) {
      onK8sNameDescDataChange('name', displayName || '');
    }
  }, [displayName, isKubernetesStorage, onK8sNameDescDataChange]);

  // must handle k8sdescdata changes separately from callback since
  // displayName can externally populate pipeline name, and that needs
  // to auto-fill the resource name as if it was typed in to keep
  // the resource name rules intact
  React.useEffect(() => {
    if (isKubernetesStorage) {
      setData('displayName', k8sNameDescData.name);
      setData('name', k8sNameDescData.k8sName.value);
      setData('description', k8sNameDescData.description);
    }
  }, [isKubernetesStorage, k8sNameDescData, setData]);

  const isImportButtonDisabled =
    !apiAvailable ||
    importing ||
    hasDuplicateName ||
    !name ||
    (uploadOption === PipelineUploadOption.URL_IMPORT ? !pipelineUrl : !fileContents);

  const onBeforeClose = React.useCallback(
    (result?: PipelineKF | PipelineVersionKF) => {
      onClose(result, data.pipeline);
      setImporting(false);
      setError(undefined);
      resetData();
      setHasDuplicateName(false);
    },
    [onClose, resetData, data.pipeline],
  );

  const debouncedCheckForDuplicateName = useDebounceCallback(
    React.useCallback(
      async (value: string, pipelineStore?: DSPipelineAPIServerStore) => {
        const isDuplicate = await checkForDuplicateName(value, pipelineStore);
        setHasDuplicateName(!!isDuplicate);
      },
      [checkForDuplicateName],
    ),
    500,
  );

  const handleK8sNameDescDataChange = React.useCallback<K8sNameDescriptionFieldUpdateFunction>(
    (key, value) => {
      onK8sNameDescDataChange(key, value);
      if (key === 'name') {
        debouncedCheckForDuplicateName(value, DSPipelineAPIServerStore.KUBERNETES);
      }
    },
    [onK8sNameDescDataChange, debouncedCheckForDuplicateName],
  );

  const onSubmit = () => {
    setImporting(true);
    setError(undefined);

    if (uploadOption === PipelineUploadOption.FILE_UPLOAD && isArgoWorkflow) {
      setImporting(false);
      setError(new Error(PIPELINE_IMPORT_ARGO_ERROR_TEXT));
    } else {
      submitAction()
        .then((result) => {
          onBeforeClose(result);
        })
        .catch((e) => {
          setImporting(false);
          if (e.message.includes('InvalidInputError') && isV1PipelineFile) {
            setError(new Error(PIPELINE_IMPORT_V1_ERROR_TEXT));
          } else {
            setError(e);
          }
        });
    }
  };

  if (!crLoaded) {
    return (
      <Modal
        isOpen
        onClose={() => onBeforeClose()}
        variant="medium"
        data-testid={pipelineImportBaseTestId}
      >
        <ModalHeader title={title} />
        <ModalBody>
          <Spinner size="lg" />
        </ModalBody>
      </Modal>
    );
  }

  if (crLoadError) {
    return (
      <Modal
        isOpen
        onClose={() => onBeforeClose()}
        variant="medium"
        data-testid={pipelineImportBaseTestId}
      >
        <ModalHeader title={title} />
        <ModalBody>
          <Stack hasGutter style={{ flex: 'auto' }}>
            <Alert data-testid="error-message-alert" isInline variant="danger" title="Error">
              {crLoadError instanceof Error ? crLoadError.message : crLoadError}
            </Alert>
          </Stack>
        </ModalBody>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={() => onBeforeClose()}
      variant="medium"
      data-testid={pipelineImportBaseTestId}
    >
      <ModalHeader title={title} />
      <ModalBody>
        <Form>
          <Stack hasGutter>
            <StackItem>
              <FormGroup label="Project" fieldId="project-name">
                {getDisplayNameFromK8sResource(project)}
              </FormGroup>
            </StackItem>
            {children}
            <StackItem>
              {isKubernetesStorage ? (
                <K8sNameDescriptionField
                  // dataTestId becomes dataTestId-{name/description}
                  dataTestId="pipeline"
                  nameLabel="Pipeline name"
                  descriptionLabel="Pipeline description"
                  maxLength={NAME_CHARACTER_LIMIT}
                  maxLengthDesc={DESCRIPTION_CHARACTER_LIMIT}
                  nameHelperText={
                    hasDuplicateName ? (
                      <DuplicateNameHelperText isError name={displayName} />
                    ) : undefined
                  }
                  data={k8sNameDescData}
                  onDataChange={handleK8sNameDescDataChange}
                />
              ) : (
                <NameDescriptionField
                  nameFieldId="pipeline-name"
                  nameFieldLabel="Pipeline name"
                  descriptionFieldLabel="Pipeline description"
                  descriptionFieldId="pipeline-description"
                  data={{ name: displayName, description: description || '' }}
                  hasNameError={hasDuplicateName}
                  setData={(newData) => {
                    setData('displayName', newData.name);
                    setData('name', newData.name);
                    setData('description', newData.description);
                  }}
                  maxLengthName={NAME_CHARACTER_LIMIT}
                  maxLengthDesc={DESCRIPTION_CHARACTER_LIMIT}
                  onNameChange={(value) => {
                    setHasDuplicateName(false);
                    debouncedCheckForDuplicateName(value);
                  }}
                  nameHelperText={
                    hasDuplicateName ? (
                      <DuplicateNameHelperText isError name={displayName} />
                    ) : undefined
                  }
                />
              )}
            </StackItem>
            <StackItem>
              <PipelineUploadRadio
                fileContents={fileContents}
                setFileContents={(value) => {
                  setData('fileContents', value);
                  setError(undefined);
                }}
                pipelineUrl={pipelineUrl}
                setPipelineUrl={(url) => setData('pipelineUrl', url)}
                uploadOption={uploadOption}
                setUploadOption={(option) => setData('uploadOption', option)}
              />
            </StackItem>
          </Stack>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={() => onBeforeClose()}
          onSubmit={onSubmit}
          submitLabel={submitButtonText}
          isSubmitLoading={importing}
          isSubmitDisabled={isImportButtonDisabled}
          error={error}
          alertTitle={
            isArgoWorkflow
              ? PIPELINE_ARGO_ERROR
              : isV1PipelineFile
              ? 'Pipeline update and recompile required'
              : 'Error creating pipeline'
          }
          alertLinks={isV1PipelineFile ? <PipelineMigrationNoteLinks /> : undefined}
        />
      </ModalFooter>
    </Modal>
  );
};

export default PipelineImportBase;
