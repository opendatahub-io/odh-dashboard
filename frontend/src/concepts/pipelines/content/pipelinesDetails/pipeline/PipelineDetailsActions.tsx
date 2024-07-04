import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { Divider, Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineVersionImportModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import {
  routePipelineDetailsNamespace,
  routePipelineRunCreateNamespacePipelinesPage,
  routePipelineVersionRunsNamespace,
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
        onOpenChange={(isOpenChange) => setOpen(isOpenChange)}
        shouldFocusToggleOnSelect
        onSelect={() => setOpen(false)}
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
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          {[
            <DropdownItem key="upload-version" onClick={() => setIsVersionImportModalOpen(true)}>
              Upload new version
            </DropdownItem>,
            <Divider key="separator-create" />,
            <DropdownItem
              key="create-run"
              onClick={() =>
                navigate(routePipelineRunCreateNamespacePipelinesPage(namespace), {
                  state: { lastPipeline: pipeline, lastVersion: pipelineVersion },
                })
              }
            >
              Create run
            </DropdownItem>,
            <DropdownItem
              key="schedule-run"
              onClick={() =>
                navigate(
                  {
                    pathname: routePipelineRunCreateNamespacePipelinesPage(namespace),
                    search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.SCHEDULED}`,
                  },
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
                        {
                          pathname: routePipelineVersionRunsNamespace(
                            namespace,
                            pipeline.pipeline_id,
                            pipelineVersion.pipeline_version_id,
                          ),
                          search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.ACTIVE}`,
                        },
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
                        {
                          pathname: routePipelineVersionRunsNamespace(
                            namespace,
                            pipeline.pipeline_id,
                            pipelineVersion.pipeline_version_id,
                          ),
                          search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.SCHEDULED}`,
                        },
                        {
                          state: { lastVersion: pipelineVersion },
                        },
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
                routePipelineDetailsNamespace(
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
