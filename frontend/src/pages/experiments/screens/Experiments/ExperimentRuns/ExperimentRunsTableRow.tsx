import { Td, Tr } from '@patternfly/react-table';
import { Timestamp, Label, Checkbox, Button } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import * as React from 'react';
import { ExperimentRunStatus, ExperimentRunState } from '#~/concepts/modelRegistry/types';
import useExperimentRunArtifacts from '#~/concepts/modelRegistry/apiHooks/useExperimentRunArtifacts';
import { experimentRunDetailsRoute } from '#~/routes/experiments/registryBase';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import { NestedExperimentRun, hasChildren } from './experimentRunsUtils';

type ColumnSelectorItem = {
  id: string;
  name: string;
  checked: boolean;
};

type ExperimentRunsTableRowProps = {
  experimentRun: NestedExperimentRun;
  isSelected: boolean;
  onSelectionChange: () => void;
  selectedColumns?: {
    metrics: ColumnSelectorItem[];
    parameters: ColumnSelectorItem[];
    tags: ColumnSelectorItem[];
  };
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

const getStatusColor = (
  status?: ExperimentRunStatus,
): 'grey' | 'green' | 'blue' | 'red' | 'orange' => {
  switch (status) {
    case ExperimentRunStatus.FINISHED:
      return 'green';
    case ExperimentRunStatus.RUNNING:
      return 'blue';
    case ExperimentRunStatus.FAILED:
      return 'red';
    case ExperimentRunStatus.KILLED:
      return 'red';
    case ExperimentRunStatus.SCHEDULED:
      return 'orange';
    default:
      return 'grey';
  }
};

const getStateColor = (state?: ExperimentRunState): 'grey' | 'green' | 'red' => {
  switch (state) {
    case ExperimentRunState.LIVE:
      return 'green';
    case ExperimentRunState.ARCHIVED:
      return 'red';
    default:
      return 'grey';
  }
};

const ExperimentRunsTableRow: React.FC<ExperimentRunsTableRowProps> = ({
  experimentRun,
  isSelected,
  onSelectionChange,
  selectedColumns,
  isExpanded = false,
  onToggleExpand,
}) => {
  const { experimentId, modelRegistry } = useParams<{
    experimentId: string;
    modelRegistry: string;
  }>();
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const [artifactsData] = useExperimentRunArtifacts(experimentRun.id);

  // Helper function to get artifact value based on type and name
  const getArtifactValue = (key: string, type: 'metric' | 'parameter' | 'tag'): string => {
    if (type === 'tag') {
      // Tags come from experiment run custom properties
      const prop = experimentRun.customProperties[key];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!prop) {
        return '-';
      }
      if ('string_value' in prop) {
        return prop.string_value;
      }
      if ('double_value' in prop) {
        return prop.double_value.toString();
      }
      if ('int_value' in prop) {
        return prop.int_value;
      }
      if ('bool_value' in prop) {
        return prop.bool_value.toString();
      }
    }

    // For metrics and parameters, look in artifacts
    const { items } = artifactsData;

    for (const artifact of items) {
      if (artifact.artifactType === type && artifact.name === key) {
        // For metrics and parameters, the value is directly on the artifact
        if ('value' in artifact && artifact.value != null) {
          return String(artifact.value);
        }
      }
    }
    return '-';
  };

  // Render dynamic columns
  const renderDynamicColumns = () => {
    if (!selectedColumns) {
      return null;
    }

    const columns: React.ReactNode[] = [];

    // Render metrics columns
    selectedColumns.metrics
      .filter((item) => item.checked)
      .forEach((metric) => {
        columns.push(
          <Td key={`metric-${metric.id}`} dataLabel={metric.name}>
            {getArtifactValue(metric.id, 'metric')}
          </Td>,
        );
      });

    // Render parameters columns
    selectedColumns.parameters
      .filter((item) => item.checked)
      .forEach((param) => {
        columns.push(
          <Td key={`parameter-${param.id}`} dataLabel={param.name}>
            {getArtifactValue(param.id, 'parameter')}
          </Td>,
        );
      });

    // Render tags columns
    selectedColumns.tags
      .filter((item) => item.checked)
      .forEach((tag) => {
        columns.push(
          <Td key={`tag-${tag.id}`} dataLabel={tag.name}>
            {getArtifactValue(tag.id, 'tag')}
          </Td>,
        );
      });

    return columns;
  };

  // Calculate indentation based on nesting level
  const indentationLevel = experimentRun.level || 0;
  const indentationPx = indentationLevel * 24; // 24px per level

  // Check if this run has children
  const runHasChildren = hasChildren(experimentRun);

  return (
    <Tr>
      <Td dataLabel="Select">
        <Checkbox
          id={`select-${experimentRun.id}`}
          isChecked={isSelected}
          onChange={onSelectionChange}
          aria-label={`Select experiment run ${experimentRun.name}`}
        />
      </Td>
      <Td dataLabel="Run name">
        <div style={{ paddingLeft: `${indentationPx}px`, display: 'flex', alignItems: 'center' }}>
          {runHasChildren && onToggleExpand ? (
            <Button
              variant="plain"
              onClick={onToggleExpand}
              style={{ padding: '4px', marginRight: '8px', minWidth: '24px' }}
              aria-label={isExpanded ? 'Collapse child runs' : 'Expand child runs'}
            >
              {isExpanded ? <AngleDownIcon size={16} /> : <AngleRightIcon size={16} />}
            </Button>
          ) : (
            <div style={{ width: '32px' }} /> // Spacer for alignment when no expand button
          )}
          <div>
            <Link
              to={experimentRunDetailsRoute(
                modelRegistry || preferredModelRegistry?.metadata.name,
                experimentId,
                experimentRun.id,
              )}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <strong>{experimentRun.name || 'Unnamed'}</strong>
            </Link>
            {experimentRun.isChild && (
              <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Child run</div>
            )}
          </div>
        </div>
      </Td>
      <Td dataLabel="Owner">
        <div>{experimentRun.owner || '-'}</div>
      </Td>
      <Td dataLabel="Status">
        <Label color={getStatusColor(experimentRun.status)}>
          {experimentRun.status || 'UNKNOWN'}
        </Label>
      </Td>
      <Td dataLabel="State">
        <Label color={getStateColor(experimentRun.state)}>{experimentRun.state || 'LIVE'}</Label>
      </Td>
      <Td dataLabel="Started">
        {experimentRun.startTimeSinceEpoch ? (
          <Timestamp date={new Date(parseInt(experimentRun.startTimeSinceEpoch, 10))} />
        ) : (
          '-'
        )}
      </Td>
      <Td dataLabel="Ended">
        {experimentRun.endTimeSinceEpoch ? (
          <Timestamp date={new Date(parseInt(experimentRun.endTimeSinceEpoch, 10))} />
        ) : (
          '-'
        )}
      </Td>
      {renderDynamicColumns()}
      <Td dataLabel="Kebab" isActionCell>
        {/* TODO: Add kebab menu actions */}
      </Td>
    </Tr>
  );
};

export default ExperimentRunsTableRow;
