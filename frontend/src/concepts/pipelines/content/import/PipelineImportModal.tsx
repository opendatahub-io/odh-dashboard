/* eslint-disable camelcase */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { pipelineVersionDetailsRoute } from '~/routes';
import { getNameEqualsFilter } from '~/concepts/pipelines/utils';
import { usePipelineImportModalData } from './useImportModalData';
import PipelineImportBase from './PipelineImportBase';
import { PipelineUploadOption } from './utils';

type PipelineImportModalProps = {
  onClose: (pipeline?: PipelineKF) => void;
  redirectAfterImport?: boolean;
};

const PipelineImportModal: React.FC<PipelineImportModalProps> = ({
  redirectAfterImport = true,
  onClose,
}) => {
  const navigate = useNavigate();
  const { api, namespace } = usePipelinesAPI();
  const [modalData, setData, resetData] = usePipelineImportModalData();

  const handleClose = React.useCallback(
    async (pipeline?: PipelineKF) => {
      onClose(pipeline);

      if (pipeline && redirectAfterImport) {
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
      }
    },
    [api, namespace, redirectAfterImport, navigate, onClose],
  );

  const submitAction = React.useCallback(() => {
    const { name, description, fileContents, pipelineUrl, uploadOption } = modalData;
    if (uploadOption === PipelineUploadOption.FILE_UPLOAD) {
      return api.uploadPipeline({}, name, description, fileContents);
    }
    return api.createPipelineAndVersion(
      {},
      {
        pipeline: {
          display_name: name,
          description,
        },
        pipeline_version: {
          display_name: name,
          description,
          package_url: {
            pipeline_url: pipelineUrl,
          },
        },
      },
    );
  }, [api, modalData]);

  const checkForDuplicateName = React.useCallback(
    async (value: string) => {
      if (value) {
        const { pipelines: duplicatePipelines } = await api.listPipelines(
          {},
          getNameEqualsFilter(value),
        );

        if (duplicatePipelines?.length) {
          return true;
        }
      }
      return false;
    },
    [api],
  );

  return (
    <PipelineImportBase
      title="Import pipeline"
      submitButtonText="Import pipeline"
      onClose={handleClose}
      data={modalData}
      setData={setData}
      resetData={resetData}
      submitAction={submitAction}
      checkForDuplicateName={checkForDuplicateName}
    />
  );
};

export default PipelineImportModal;
