import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineVersionImportModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { PipelineRunType } from '~/pages/pipelines/global/runs';

type PipelineDetailsActionsProps = {
  onDelete: () => void;
  pipeline: PipelineKFv2 | null;
  pipelineVersion: PipelineVersionKFv2 | null;
};

const PipelineDetailsActions: React.FC<PipelineDetailsActionsProps> = ({
  onDelete,
  pipeline,
  pipelineVersion,
}) => {
  const navigate = useNavigate();
  const { namespace, refreshAllAPI } = usePipelinesAPI();
  const [open, setOpen] = React.useState(false);
  const [isVersionImportModalOpen, setIsVersionImportModalOpen] = React.useState(false);

  return (
    <>
      <Dropdown
        onSelect={() => setOpen(false)}
        toggle={
          <DropdownToggle toggleVariant="primary" onToggle={() => setOpen(!open)}>
            Actions
          </DropdownToggle>
        }
        isOpen={open}
        position="right"
        dropdownItems={[
          <DropdownItem key="upload-version" onClick={() => setIsVersionImportModalOpen(true)}>
            Upload new version
          </DropdownItem>,
          <DropdownSeparator key="separator-1" />,
          <DropdownItem
            key="create-run"
            onClick={() =>
              navigate(`/pipelineRuns/${namespace}/pipelineRun/create`, {
                state: { lastPipeline: pipeline, lastVersion: pipelineVersion },
              })
            }
          >
            Create run
          </DropdownItem>,
          <DropdownItem
            key="view-runs"
            onClick={() =>
              navigate(
                {
                  pathname: `/pipelineRuns/${namespace}`,
                  search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.Active}`,
                },
                {
                  state: { lastVersion: pipelineVersion },
                },
              )
            }
          >
            View runs
          </DropdownItem>,
          <DropdownSeparator key="separator-2" />,
          <DropdownItem key="delete-pipeline-version" onClick={() => onDelete()}>
            Delete pipeline version
          </DropdownItem>,
        ]}
      />
      {isVersionImportModalOpen && (
        <PipelineVersionImportModal
          existingPipeline={pipeline}
          onClose={(resource) => {
            setIsVersionImportModalOpen(false);
            if (resource) {
              refreshAllAPI();
              navigate(
                `/pipelines/${namespace}/pipeline/view/${resource.pipeline_id}/${resource.pipeline_version_id}`,
              );
            }
          }}
        />
      )}
    </>
  );
};

export default PipelineDetailsActions;
