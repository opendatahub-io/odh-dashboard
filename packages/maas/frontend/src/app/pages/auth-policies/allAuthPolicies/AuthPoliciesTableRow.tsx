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
  const onViewDetailsAuthPolicy = (authPolicyName: string) => {
    navigate(`${URL_PREFIX}/auth-policies/view/${authPolicyName}`);
  };
  const onEditAuthPolicy = (authPolicyName: string) => {
    navigate(`${URL_PREFIX}/auth-policies/edit/${authPolicyName}`);
  };
  const onDeleteAuthPolicy = (authPolicyToDelete: MaaSAuthPolicy) => {
    setDeleteAuthPolicy(authPolicyToDelete);
  };
  return (
    <Tr>
      <Td dataLabel={columns[0].label}>
        <TableRowTitleDescription
          title={
            <Link to={`${URL_PREFIX}/auth-policies/view/${authPolicy.name}`}>
              {authPolicy.name}
            </Link>
          }
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={columns[1].label}>
        <Label color="grey">{`${authPolicy.subjects.groups.length.toString()} ${authPolicy.subjects.groups.length === 1 ? 'Group' : 'Groups'}`}</Label>
      </Td>
      <Td dataLabel={columns[2].label}>
        <Label color="grey">{`${authPolicy.modelRefs.length.toString()} ${authPolicy.modelRefs.length === 1 ? 'Model' : 'Models'}`}</Label>
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
