import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  Button,
  Form,
  FormGroup,
  Modal,
  Stack,
  StackItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { usePipelineImportModalData } from '~/concepts/pipelines/content/import/useImportModalData';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { DuplicateNameHelperText } from '~/concepts/pipelines/content/DuplicateNameHelperText';
import { getNameEqualsFilter } from '~/concepts/pipelines/utils';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import { pipelineVersionDetailsRoute } from '~/routes';
import {
  PIPELINE_ARGO_ERROR,
  PIPELINE_IMPORT_ARGO_ERROR_TEXT,
} from '~/concepts/pipelines/content/const';
import PipelineUploadRadio from './PipelineUploadRadio';
import { PipelineUploadOption, extractKindFromPipelineYAML } from './utils';

type PipelineImportModalProps = {
  isOpen: boolean;
  onClose: (pipeline?: PipelineKFv2) => void;
};

const PipelineImportModal: React.FC<PipelineImportModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { project, api, apiAvailable, namespace } = usePipelinesAPI();
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [{ name, description, fileContents, pipelineUrl, uploadOption }, setData, resetData] =
    usePipelineImportModalData();
  const [hasDuplicateName, setHasDuplicateName] = React.useState(false);
  const isArgoWorkflow = extractKindFromPipelineYAML(fileContents) === 'Workflow';

  const isImportButtonDisabled =
    !apiAvailable ||
    importing ||
    !name ||
    (uploadOption === PipelineUploadOption.URL_IMPORT ? !pipelineUrl : !fileContents);

  const onBeforeClose = React.useCallback(
    (pipeline?: PipelineKFv2) => {
      onClose(pipeline);
      setImporting(false);
      setError(undefined);
      resetData();
      setHasDuplicateName(false);
    },
    [onClose, resetData],
  );

  const onSubmitSuccess = React.useCallback(
    async (pipeline: PipelineKFv2) => {
      onBeforeClose(pipeline);

      const { pipeline_versions: versions } = await api.listPipelineVersions(
        {},
        pipeline.pipeline_id,
        {
          pageSize: 1,
        },
      );
      const versionId = versions?.[0].pipeline_version_id;

      if (versionId) {
        navigate(pipelineVersionDetailsRoute(namespace, pipeline.pipeline_id, versionId));
      }
    },
    [api, namespace, navigate, onBeforeClose],
  );

  const checkForDuplicateName = useDebounceCallback(
    React.useCallback(
      async (value: string) => {
        if (value) {
          const { pipelines: duplicatePipelines } = await api.listPipelines(
            {},
            getNameEqualsFilter(value),
          );

          if (duplicatePipelines?.length) {
            setHasDuplicateName(true);
          }
        }
      },
      [api],
    ),
    500,
  );

  const onSubmit = () => {
    setImporting(true);
    setError(undefined);

    if (uploadOption === PipelineUploadOption.FILE_UPLOAD) {
      if (isArgoWorkflow) {
        setImporting(false);
        setError(new Error(PIPELINE_IMPORT_ARGO_ERROR_TEXT));
      } else {
        api
          .uploadPipeline({}, name, description, fileContents)
          .then(onSubmitSuccess)
          .catch((e) => {
            setImporting(false);
            setError(e);
          });
      }
    } else {
      api
        .createPipelineAndVersion(
          {},
          {
            pipeline: {
              /* eslint-disable camelcase */
              display_name: name,
              description,
            },
            pipeline_version: {
              display_name: name,
              description,
              package_url: {
                pipeline_url: pipelineUrl,
              },
              /* eslint-enable camelcase */
            },
          },
        )
        .then(onSubmitSuccess)
        .catch((e) => {
          setImporting(false);
          setError(e);
        });
    }
  };

  return (
    <Modal
      title="Import pipeline"
      isOpen={isOpen}
      onClose={() => onBeforeClose()}
      actions={[
        <Button
          key="import-button"
          data-testid="import-button"
          variant="primary"
          isDisabled={isImportButtonDisabled}
          isLoading={importing}
          onClick={onSubmit}
        >
          Import pipeline
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={() => onBeforeClose()}>
          Cancel
        </Button>,
      ]}
      variant="medium"
      data-testid="import-pipeline-modal"
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            <FormGroup label="Project" fieldId="project-name">
              {getDisplayNameFromK8sResource(project)}
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline name" isRequired fieldId="pipeline-name">
              <TextInput
                isRequired
                type="text"
                id="pipeline-name"
                data-testid="pipeline-name"
                name="pipeline-name"
                value={name}
                onChange={(_e, value) => {
                  setHasDuplicateName(false);
                  setData('name', value);
                  checkForDuplicateName(value);
                }}
              />

              {hasDuplicateName && <DuplicateNameHelperText name={name} />}
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline description" fieldId="pipeline-description">
              <TextArea
                isRequired
                type="text"
                id="pipeline-description"
                data-testid="pipeline-description"
                name="pipeline-description"
                value={description}
                onChange={(_e, value) => setData('description', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <PipelineUploadRadio
              fileContents={fileContents}
              setFileContents={(data) => setData('fileContents', data)}
              pipelineUrl={pipelineUrl}
              setPipelineUrl={(url) => setData('pipelineUrl', url)}
              uploadOption={uploadOption}
              setUploadOption={(option) => {
                setData('uploadOption', option);
              }}
            />
          </StackItem>
          {error && (
            <StackItem>
              <Alert
                data-testid="import-modal-error"
                title={isArgoWorkflow ? PIPELINE_ARGO_ERROR : 'Error creating pipeline'}
                isInline
                variant="danger"
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default PipelineImportModal;
