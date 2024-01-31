import * as React from 'react';
import { Td, Tbody, Tr, ActionsColumn } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@patternfly/react-core';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd, TableRowTitleDescription } from '~/components/table';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelinesTableExpandedRow from '~/concepts/pipelines/content/tables/pipeline/PipelinesTableExpandedRow';
import PipelineVersionUploadModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';
import PipelinesTableRowTime from '~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import usePipelineTableRowData from '~/concepts/pipelines/content/tables/pipeline/usePipelineTableRowData';
import { PipelineAndVersionContext } from '~/concepts/pipelines/content/PipelineAndVersionContext';

type PipelinesTableRowProps = {
  pipeline: PipelineKFv2;
  isChecked: boolean;
  onToggleCheck: () => void;
  rowIndex: number;
  onDeletePipeline: () => void;
  refreshPipelines: () => Promise<unknown>;
  pipelineDetailsPath: (namespace: string, id: string) => string;
};

const PipelinesTableRow: React.FC<PipelinesTableRowProps> = ({
  pipeline,
  isChecked,
  onToggleCheck,
  rowIndex,
  onDeletePipeline,
  refreshPipelines,
  pipelineDetailsPath,
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [isExpanded, setExpanded] = React.useState(false);
  const [importTarget, setImportTarget] = React.useState<PipelineKFv2 | null>(null);
  const {
    totalSize,
    updatedDate,
    loading,
    refresh: refreshRowData,
  } = usePipelineTableRowData(pipeline);
  const { versionDataSelector } = React.useContext(PipelineAndVersionContext);
  const { selectedVersions } = versionDataSelector(pipeline);
  const selectedVersionLength = selectedVersions.length;

  const createdDate = new Date(pipeline.created_at);

  return (
    <>
      <Tbody isExpanded={isExpanded}>
        <Tr>
          <Td
            expand={{
              rowIndex,
              expandId: 'pipeline-row-item',
              isExpanded,
              onToggle: () => setExpanded(!isExpanded),
            }}
          />
          <CheckboxTd
            id={pipeline.pipeline_id}
            isChecked={isChecked ? true : selectedVersionLength !== 0 ? null : false}
            onToggle={onToggleCheck}
          />
          <Td>
            <TableRowTitleDescription
              title={pipeline.display_name}
              description={pipeline.description}
              descriptionAsMarkdown
            />
          </Td>
          <Td>{loading ? <Skeleton /> : totalSize}</Td>
          <Td>
            <PipelinesTableRowTime date={createdDate} />
          </Td>
          <Td>{loading ? <Skeleton /> : <PipelinesTableRowTime date={updatedDate} />}</Td>
          <Td isActionCell>
            <ActionsColumn
              items={[
                {
                  title: 'Upload new version',
                  onClick: () => {
                    setImportTarget(pipeline);
                  },
                },
                {
                  isSeparator: true,
                },
                {
                  title: 'Create run',
                  onClick: () => {
                    navigate(`/pipelines/${namespace}/pipelineRun/create`, {
                      state: { lastPipeline: pipeline },
                    });
                  },
                },
                {
                  isSeparator: true,
                },
                {
                  title: 'Delete pipeline',
                  isAriaDisabled: totalSize > 0,
                  tooltipProps:
                    totalSize > 0
                      ? {
                          content:
                            'All child pipeline versions must be deleted before deleting the parent pipeline',
                        }
                      : undefined,
                  onClick: () => {
                    onDeletePipeline();
                  },
                },
              ]}
            />
          </Td>
        </Tr>
        {isExpanded && (
          <PipelinesTableExpandedRow
            // Upload a new version will update the totalSize (version length)
            // Which will trigger a re-render of the versions table
            key={`${pipeline.pipeline_id}-expanded-${totalSize}`}
            pipeline={pipeline}
            pipelineDetailsPath={pipelineDetailsPath}
          />
        )}
      </Tbody>
      {importTarget && (
        <PipelineVersionUploadModal
          existingPipeline={importTarget}
          onClose={(pipelineVersion) => {
            if (pipelineVersion) {
              refreshPipelines();
              refreshRowData();
            }
            setImportTarget(null);
          }}
        />
      )}
    </>
  );
};

export default PipelinesTableRow;
