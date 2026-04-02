import { TableRowTitleDescription } from '@odh-dashboard/internal/components/table/index';
import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { Label } from '@patternfly/react-core';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';

type AuthPoliciesTableRowProps = {
  authPolicy: MaaSAuthPolicy;
  columns: SortableData<MaaSAuthPolicy>[];
  setDeleteAuthPolicy: (authPolicy: MaaSAuthPolicy) => void;
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
              {authPolicy.name}
            </Link>
          }
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={columns[1].label}>
        <Label color="grey">{`${groupsCount.toString()} ${groupsCount === 1 ? 'Group' : 'Groups'}`}</Label>
      </Td>
      <Td dataLabel={columns[2].label}>
        <Label color="grey">{`${modelsCount.toString()} ${modelsCount === 1 ? 'Model' : 'Models'}`}</Label>
      </Td>
      <Td isActionCell>
        <ActionsColumn
          data-testid="auth-policy-actions"
          items={[
            {
              title: 'View details',
              onClick: () => onViewDetailsAuthPolicy(authPolicy.name),
            },
            {
              title: 'Edit auth policy',
              onClick: () => onEditAuthPolicy(authPolicy.name),
            },
            {
              title: 'Delete auth policy',
              onClick: () => onDeleteAuthPolicy(authPolicy),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default AuthPoliciesTableRow;
