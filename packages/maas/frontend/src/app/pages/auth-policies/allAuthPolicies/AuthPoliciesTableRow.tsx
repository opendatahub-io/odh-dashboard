import { TableRowTitleDescription } from '@odh-dashboard/internal/components/table/index';
import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { Label } from '@patternfly/react-core';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import PhaseLabel from '~/app/shared/PhaseLabel';

type AuthPoliciesTableRowProps = {
  authPolicy: MaaSAuthPolicy;
  columns: SortableData<MaaSAuthPolicy>[];
  setDeleteAuthPolicy: (authPolicy: MaaSAuthPolicy) => void;
};

const labelHelper = (count: number, singular: string, plural: string) => {
  const label = `${count.toString()} ${count === 1 ? singular : plural}`;
  return <Label color="grey">{label}</Label>;
};

const AuthPoliciesTableRow: React.FC<AuthPoliciesTableRowProps> = ({
  authPolicy,
  columns,
  setDeleteAuthPolicy,
}) => {
  const navigate = useNavigate();
  const policyNameSegment = (name: string) => encodeURIComponent(name);
  const onViewDetailsAuthPolicy = (authPolicyName: string) => {
    navigate(`${URL_PREFIX}/auth-policies/view/${policyNameSegment(authPolicyName)}`);
  };
  const onEditAuthPolicy = (authPolicyName: string) => {
    navigate(`${URL_PREFIX}/auth-policies/edit/${policyNameSegment(authPolicyName)}`);
  };
  const onDeleteAuthPolicy = (authPolicyToDelete: MaaSAuthPolicy) => {
    setDeleteAuthPolicy(authPolicyToDelete);
  };
  const groupsCount = Array.isArray(authPolicy.subjects.groups)
    ? authPolicy.subjects.groups.length
    : 0;
  const modelsCount = Array.isArray(authPolicy.modelRefs) ? authPolicy.modelRefs.length : 0;
  return (
    <Tr>
      <Td dataLabel={columns[0].label}>
        <TableRowTitleDescription
          title={
            <Link to={`${URL_PREFIX}/auth-policies/view/${policyNameSegment(authPolicy.name)}`}>
              {authPolicy.displayName ?? authPolicy.name}
            </Link>
          }
          description={authPolicy.description ?? ''}
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={columns[1].label}>
        <PhaseLabel phase={authPolicy.phase} statusMessage={authPolicy.statusMessage} />
      </Td>
      <Td dataLabel={columns[2].label}>{labelHelper(groupsCount, 'Group', 'Groups')}</Td>
      <Td dataLabel={columns[3].label}>{labelHelper(modelsCount, 'Model', 'Models')}</Td>
      <Td isActionCell>
        <ActionsColumn
          data-testid="auth-policy-actions"
          items={[
            {
              title: 'View details',
              onClick: () => onViewDetailsAuthPolicy(authPolicy.name),
            },
            {
              title: 'Edit policy',
              onClick: () => onEditAuthPolicy(authPolicy.name),
            },
            {
              title: 'Delete policy',
              onClick: () => onDeleteAuthPolicy(authPolicy),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default AuthPoliciesTableRow;
