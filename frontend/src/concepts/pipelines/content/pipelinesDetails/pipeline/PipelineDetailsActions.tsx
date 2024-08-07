import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { Divider, Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';

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
import { getDashboardMainContainer } from '~/utilities/utils';
import {
  PIPELINE_CREATE_RUN_TOOLTIP_ARGO_ERROR,
  PIPELINE_CREATE_SCHEDULE_TOOLTIP_ARGO_ERROR,
} from '~/concepts/pipelines/content/const';

type PipelineDetailsActionsProps = {
  onDelete: () => void;
  isPipelineSupported: boolean;
  pipeline: PipelineKFv2 | null;
  pipelineVersion: PipelineVersionKFv2 | null;
};

const PipelineDetailsActions: React.FC<PipelineDetailsActionsProps> = ({
  onDelete,
  isPipelineSupported,
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
        onOpenChange={(isOpenChange) => setOpen(isOpenChange)}
        shouldFocusToggleOnSelect
        onSelect={() => setOpen(false)}
        popperProps={{ appendTo: getDashboardMainContainer, position: 'right' }}
        toggle={(toggleRef) => (
          <MenuToggle
            data-testid="pipeline-version-details-actions"
            ref={toggleRef}
            variant="primary"
            aria-label="Actions"
            onClick={() => setOpen(!open)}
            isExpanded={open}
          >
            Actions
          </MenuToggle>
        )}
        isOpen={open}
      >
        <DropdownList>
          {[
            <DropdownItem key="upload-version" onClick={() => setIsVersionImportModalOpen(true)}>
              Upload new version
            </DropdownItem>,
            <Divider key="separator-create" />,
            <DropdownItem
              isAriaDisabled={!isPipelineSupported}
              tooltipProps={{ content: PIPELINE_CREATE_RUN_TOOLTIP_ARGO_ERROR }}
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
              isAriaDisabled={!isPipelineSupported}
              tooltipProps={{ content: PIPELINE_CREATE_SCHEDULE_TOOLTIP_ARGO_ERROR }}
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
                  <Divider key="separator-view" />,
                  <DropdownItem
                    key="view-runs"
                    onClick={() =>
                      navigate(
                        pipelineVersionRunsRoute(
                          namespace,
                          pipeline.pipeline_id,
                          pipelineVersion.pipeline_version_id,
                        ),
                        {
                          state: { lastVersion: pipelineVersion },
                        },
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
            <Divider key="separator-delete" />,
            <DropdownItem key="delete-pipeline-version" onClick={() => onDelete()}>
              Delete pipeline version
            </DropdownItem>,
          ]}
        </DropdownList>
      </Dropdown>
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
