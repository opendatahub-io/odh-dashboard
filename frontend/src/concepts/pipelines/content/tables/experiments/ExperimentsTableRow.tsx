import * as React from 'react';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  EmptyStateVariant,
  Label,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ExperimentKF, PipelineCoreResourceKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import ExperimentActions from './ExperimentActions';

type ExperimentsTableRowProps = {
  expandedData: PipelineCoreResourceKF[];
  experimentName: string;
  experimentDescription: string;
  experimentResource?: ExperimentKF;
  rowIndex: number;
  columnCount: number;
  renderRow: (resource: PipelineCoreResourceKF) => React.ReactNode;
};

const ExperimentsTableRow: React.FC<ExperimentsTableRowProps> = ({
  experimentName,
  experimentDescription,
  experimentResource,
  expandedData,
  columnCount,
  rowIndex,
  renderRow,
}) => {
  const [isExpanded, setExpanded] = React.useState(true);
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          expand={{
            rowIndex: rowIndex,
            expandId: 'experiment-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td colSpan={columnCount - 1}>
          <Split hasGutter>
            <SplitItem>{experimentName}</SplitItem>
            <SplitItem>{experimentDescription}</SplitItem>
            {!experimentResource && (
              <SplitItem>
                <Label>Deleted</Label>
              </SplitItem>
            )}
            {experimentResource && (
              <SplitItem isFilled style={{ textAlign: 'right' }}>
                <Button
                  variant="link"
                  onClick={() =>
                    navigate(`/pipelineRuns/${namespace}/pipelineRun/create`, {
                      state: { lastExperiment: experimentResource },
                    })
                  }
                >
                  Create run
                </Button>
              </SplitItem>
            )}
            {experimentResource && experimentName !== 'Default' && (
              <SplitItem>
                <ExperimentActions experiment={experimentResource} />
              </SplitItem>
            )}
          </Split>
        </Td>
      </Tr>
      {expandedData.length === 0 && (
        <Tr isExpanded={isExpanded}>
          <Td />
          <Td colSpan={6}>
            <ExpandableRowContent>
              <EmptyState variant={EmptyStateVariant.xs}>
                <EmptyStateIcon icon={PlusCircleIcon} />
                <Title headingLevel="h3" size="md">
                  No runs
                </Title>
                <EmptyStateBody>
                  To add a run to this experiment, click the create run.
                </EmptyStateBody>
                <EmptyStateSecondaryActions>
                  <Button
                    variant="link"
                    onClick={() =>
                      navigate(`/pipelineRuns/${namespace}/pipelineRun/create`, {
                        state: { lastExperiment: experimentResource },
                      })
                    }
                  >
                    Create run
                  </Button>
                </EmptyStateSecondaryActions>
              </EmptyState>
            </ExpandableRowContent>
          </Td>
        </Tr>
      )}
      {expandedData.map((resource, i) => (
        <Tr key={`expandable-row-${i}`} isExpanded={isExpanded}>
          {renderRow(resource)}
        </Tr>
      ))}
    </Tbody>
  );
};

export default ExperimentsTableRow;
