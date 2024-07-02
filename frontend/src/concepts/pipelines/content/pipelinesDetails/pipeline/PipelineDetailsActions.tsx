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
import {
  pipelineVersionCreateRecurringRunRoute,
  pipelineVersionCreateRunRoute,
  pipelineVersionDetailsRoute,
  pipelineVersionRecurringRunsRoute,
  pipelineVersionRunsRoute,
} from '~/routes';

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
        data-testid="pipeline-version-details-actions"
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
          <DropdownSeparator key="separator-create" />,
          <DropdownItem
            key="create-run"
            onClick={() =>
              navigate(
                pipelineVersionCreateRunRoute(
                  namespace,
                  pipeline?.pipeline_id,
                  pipelineVersion?.pipeline_version_id,
                ),
                {
                  state: { lastPipeline: pipeline, lastVersion: pipelineVersion },
                },
              )
            }
          >
            Create run
          </DropdownItem>,
          <DropdownItem
            key="create-schedule"
            onClick={() =>
              navigate(
                pipelineVersionCreateRecurringRunRoute(
                  namespace,
                  pipeline?.pipeline_id,
                  pipelineVersion?.pipeline_version_id,
                ),
                {
                  state: { lastPipeline: pipeline, lastVersion: pipelineVersion },
                },
              )
            }
          >
            Create schedule
          </DropdownItem>,
          ...(pipeline && pipelineVersion
            ? [
                <DropdownSeparator key="separator-view" />,
                <DropdownItem
                  key="view-runs"
                  onClick={() =>
                    navigate(
                      pipelineVersionRunsRoute(
                        namespace,
                        pipeline.pipeline_id,
                        pipelineVersion.pipeline_version_id,
                      ),
                    )
                  }
                >
                  View runs
                </DropdownItem>,
                <DropdownItem
                  key="view-schedules"
                  onClick={() =>
                    navigate(
                      pipelineVersionRecurringRunsRoute(
                        namespace,
                        pipeline.pipeline_id,
                        pipelineVersion.pipeline_version_id,
                      ),
                    )
                  }
                >
                  View schedules
                </DropdownItem>,
              ]
            : []),

          <DropdownSeparator key="separator-delete" />,
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
                pipelineVersionDetailsRoute(
                  namespace,
                  resource.pipeline_id,
                  resource.pipeline_version_id,
                ),
              );
            }
          }}
        />
      )}
    </>
  );
};

export default PipelineDetailsActions;
