import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
// import PipelineVersionImportModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';
import { PipelineKF, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunType } from '~/pages/pipelines/global/runs/GlobalPipelineRunsTabs';

type PipelineDetailsActionsProps = {
  onDelete: () => void;
  pipeline: PipelineKF | null;
  pipelineVersion: PipelineVersionKFv2 | null;
};

const PipelineDetailsActions: React.FC<PipelineDetailsActionsProps> = ({
  onDelete,
  pipeline,
  pipelineVersion,
}) => {
  const navigate = useNavigate();
  // const { namespace, refreshAllAPI } = usePipelinesAPI();
  const { namespace } = usePipelinesAPI();
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
                  search: `?runType=${PipelineRunType.Triggered}`,
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
        // TODO: this file is out of scope for this PR -> bring back during https://issues.redhat.com/browse/RHOAIENG-2279

        // <PipelineVersionImportModal
        //   existingPipeline={pipeline}
        //   onClose={(pipelineVersion) => {
        //     setIsVersionImportModalOpen(false);
        //     if (pipelineVersion) {
        //       refreshAllAPI();
        //       navigate(`/pipelines/${namespace}/pipeline/view/${pipelineVersion.id}`);
        //     }
        //   }}
        // />
        <></>
      )}
    </>
  );
};

export default PipelineDetailsActions;
