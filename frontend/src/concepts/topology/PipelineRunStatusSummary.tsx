import React from 'react';
import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import { Flex, FlexItem, Label, LabelGroup } from '@patternfly/react-core';
import { ICON_TASK_NODE_TYPE, getRunStatusLabel } from './utils';
import { PipelineNodeModelExpanded } from './types';

const MAX_NAMED_FAILURES = 3;

type TaskNodeEntry = {
  id: string;
  label: string;
  status: RunStatus;
};

type StatusGroup = {
  status: RunStatus;
  nodes: TaskNodeEntry[];
};

// Normalize equivalent statuses so they collapse into one group
const normalizeStatus = (s: RunStatus): RunStatus => {
  if (s === RunStatus.FailedToStart) return RunStatus.Failed;
  if (s === RunStatus.InProgress) return RunStatus.Running;
  if (s === RunStatus.Idle) return RunStatus.Pending;
  return s;
};

const STATUS_COLOR: Partial<Record<RunStatus, React.ComponentProps<typeof Label>['color']>> = {
  [RunStatus.Failed]: 'red',
  [RunStatus.Cancelled]: 'orange',
  [RunStatus.Running]: 'blue',
  [RunStatus.Pending]: undefined,
  [RunStatus.Skipped]: undefined,
  [RunStatus.Succeeded]: 'green',
};

// Statuses that show individual node names (so users can click to jump to a failed step)
const CLICKABLE_STATUSES = new Set<RunStatus>([RunStatus.Failed, RunStatus.Cancelled]);

const DISPLAY_ORDER: RunStatus[] = [
  RunStatus.Failed,
  RunStatus.Cancelled,
  RunStatus.Running,
  RunStatus.Pending,
  RunStatus.Skipped,
  RunStatus.Succeeded,
];

type PipelineRunStatusSummaryProps = {
  nodes: PipelineNodeModelExpanded[];
  onNodeSelect: (id: string) => void;
};

const PipelineRunStatusSummary: React.FC<PipelineRunStatusSummaryProps> = ({
  nodes,
  onNodeSelect,
}) => {
  const taskNodes: TaskNodeEntry[] = React.useMemo(
    () =>
      nodes.flatMap((n) => {
        if (n.group || n.type === DEFAULT_SPACER_NODE_TYPE || n.type === ICON_TASK_NODE_TYPE) {
          return [];
        }
        const runStatus = n.data?.runStatus;
        if (runStatus == null) return [];
        return [{ id: n.id, label: n.label ?? n.id, status: runStatus }];
      }),
    [nodes],
  );

  const groups: StatusGroup[] = React.useMemo(() => {
    const map = new Map<RunStatus, TaskNodeEntry[]>();
    taskNodes.forEach((node) => {
      const key = normalizeStatus(node.status);
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, node]);
    });
    return DISPLAY_ORDER.map((s) => {
      const groupNodes = map.get(s);
      if (!groupNodes) return null;
      return { status: s, nodes: groupNodes };
    }).filter((g): g is StatusGroup => g !== null);
  }, [taskNodes]);

  if (groups.length === 0) {
    return null;
  }

  const labels: React.ReactNode[] = [];

  groups.forEach(({ status, nodes: groupNodes }) => {
    const color = STATUS_COLOR[status];
    const statusLabel = getRunStatusLabel(status);

    if (CLICKABLE_STATUSES.has(status)) {
      const displayed = groupNodes.slice(0, MAX_NAMED_FAILURES);
      const overflow = groupNodes.length - displayed.length;

      displayed.forEach((node) => {
        labels.push(
          <Label
            key={node.id}
            color={color}
            onClick={() => onNodeSelect(node.id)}
            data-testid={`pipeline-status-label-${node.id}`}
          >
            {statusLabel}: {node.label}
          </Label>,
        );
      });

      if (overflow > 0) {
        labels.push(
          <Label key={`${status}-overflow`} color={color}>
            +{overflow} more {statusLabel.toLowerCase()}
          </Label>,
        );
      }
    } else {
      labels.push(
        <Label key={status} color={color} data-testid={`pipeline-status-label-${status}`}>
          {groupNodes.length} {statusLabel}
        </Label>,
      );
    }
  });

  return (
    <Flex
      spaceItems={{ default: 'spaceItemsSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      className="pipeline-run-status-summary"
      role="region"
      aria-label="Pipeline run step status summary"
    >
      <FlexItem>
        <LabelGroup aria-label="Step statuses" numLabels={10}>
          {labels}
        </LabelGroup>
      </FlexItem>
    </Flex>
  );
};

export default PipelineRunStatusSummary;
