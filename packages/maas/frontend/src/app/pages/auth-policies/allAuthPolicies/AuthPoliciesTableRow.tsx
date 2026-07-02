import * as React from 'react';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { SortableData, ResourceNameTooltip, ResourceTr } from '@odh-dashboard/ui-core';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { convertAuthPolicyToK8sResource } from '~/app/utilities/authpolicies';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import ExpandedGroupsPanel from '~/app/shared/ExpandedGroupsPanel';
import CompoundExpandCountCell from '~/app/shared/CompoundExpandCountCell';
import ExpandedModelsPanel from '~/app/shared/ExpandedModelsPanel';

type ExpandedPanel = 'groups' | 'models' | null;

type AuthPoliciesTableRowProps = {
  authPolicy: MaaSAuthPolicy;
  rowIndex: number;
  columns: SortableData<MaaSAuthPolicy>[];
  setDeleteAuthPolicy: (authPolicy: MaaSAuthPolicy) => void;
  returnTo?: string;
};

const AuthPoliciesTableRow: React.FC<AuthPoliciesTableRowProps> = ({
  authPolicy,
  rowIndex,
  columns,
  setDeleteAuthPolicy,
  returnTo,
}) => {
  const navigate = useNavigate();
  const base = returnTo ?? `${URL_PREFIX}/auth-policies`;
  const navState = returnTo ? { state: { returnTo } } : undefined;
  const policyNameSegment = (name: string) => encodeURIComponent(name);
  const [expandedPanel, setExpandedPanel] = React.useState<ExpandedPanel>(null);

  const togglePanel = (panel: 'groups' | 'models') => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  };

  const onViewDetailsAuthPolicy = (authPolicyName: string) => {
    navigate(`${base}/view/${policyNameSegment(authPolicyName)}`, navState);
  };
  const onEditAuthPolicy = (authPolicyName: string) => {
    navigate(`${base}/edit/${policyNameSegment(authPolicyName)}`, navState);
  };

  const groupsCount = Array.isArray(authPolicy.subjects.groups)
    ? authPolicy.subjects.groups.length
    : 0;
  const modelsCount = Array.isArray(authPolicy.modelRefs) ? authPolicy.modelRefs.length : 0;
  const groups = authPolicy.subjects.groups ?? [];

  const policyResource: K8sResourceCommon = {
    apiVersion: 'maas.opendatahub.io/v1alpha1',
    kind: 'MaaSAuthPolicy',
    metadata: {
      name: authPolicy.name,
      namespace: authPolicy.namespace,
      ...(authPolicy.deletionTimestamp ? { deletionTimestamp: authPolicy.deletionTimestamp } : {}),
    },
  };

  const nameCell = (
    <Td dataLabel={columns[0].label}>
      <TableRowTitleDescription
        title={
          authPolicy.deletionTimestamp ? (
            <span data-testid="auth-policy-name">{authPolicy.displayName ?? authPolicy.name}</span>
          ) : (
            <ResourceNameTooltip resource={convertAuthPolicyToK8sResource(authPolicy)}>
              <Link
                to={`${base}/view/${policyNameSegment(authPolicy.name)}`}
                state={returnTo ? { returnTo } : undefined}
              >
                {authPolicy.displayName ?? authPolicy.name}
              </Link>
            </ResourceNameTooltip>
          )
        }
        description={authPolicy.description ?? ''}
        truncateDescriptionLines={2}
      />
    </Td>
  );

  const phaseCell = (
    <Td dataLabel={columns[1].label}>
      <PhaseLabel
        phase={authPolicy.phase}
        statusMessage={authPolicy.statusMessage}
        resourceType={PhaseResourceType.AUTHPOLICY}
      />
    </Td>
  );

  const actionsCell = (
    <Td isActionCell>
      <ActionsColumn
        data-testid="auth-policy-actions"
        isDisabled={!!authPolicy.deletionTimestamp}
        items={[
          {
            title: 'View details',
            onClick: () => onViewDetailsAuthPolicy(authPolicy.name),
          },
          {
            title: 'Edit',
            onClick: () => onEditAuthPolicy(authPolicy.name),
          },
          { isSeparator: true },
          {
            title: 'Delete',
            onClick: () => setDeleteAuthPolicy(authPolicy),
          },
        ]}
      />
    </Td>
  );

  const isRowExpanded = expandedPanel !== null;

  return (
    <Tbody isExpanded={isRowExpanded}>
      <ResourceTr
        resource={policyResource}
        isContentExpanded={isRowExpanded}
        isControlRow
        data-testid="auth-policy-row"
      >
        {nameCell}
        {phaseCell}
        <Td
          dataLabel={columns[2].label}
          compoundExpand={{
            isExpanded: expandedPanel === 'groups',
            onToggle: () => togglePanel('groups'),
            expandId: `expand-${authPolicy.name}-groups`,
            rowIndex,
            columnIndex: 2,
          }}
          data-testid="auth-policy-groups-expand-btn"
        >
          <CompoundExpandCountCell count={groupsCount} />
        </Td>
        <Td
          dataLabel={columns[3].label}
          compoundExpand={{
            isExpanded: expandedPanel === 'models',
            onToggle: () => togglePanel('models'),
            expandId: `expand-${authPolicy.name}-models`,
            rowIndex,
            columnIndex: 3,
          }}
          data-testid="auth-policy-models-expand-btn"
        >
          <CompoundExpandCountCell count={modelsCount} />
        </Td>
        {actionsCell}
      </ResourceTr>
      <Tr isExpanded={expandedPanel === 'groups'}>
        <Td colSpan={columns.length + 1}>
          <ExpandableRowContent>
            <ExpandedGroupsPanel groups={groups} />
          </ExpandableRowContent>
        </Td>
      </Tr>
      <Tr isExpanded={expandedPanel === 'models'}>
        <Td colSpan={columns.length + 1}>
          <ExpandableRowContent>
            <ExpandedModelsPanel
              models={authPolicy.modelRefs}
              testIdResource="auth-policy"
              showTokenLimits={false}
            />
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default AuthPoliciesTableRow;
