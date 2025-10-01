import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';

type Props = {
  name: string;
};

const ManageConnectionTypeBreadcrumbs: React.FC<Props> = ({ name }) => (
  <Breadcrumb ouiaId="BasicBreadcrumb">
    <BreadcrumbItem>
      <Link to="/settings/environment-setup/connection-types">Connection types</Link>
    </BreadcrumbItem>
    <BreadcrumbItem isActive>{name}</BreadcrumbItem>
  </Breadcrumb>
);

export default ManageConnectionTypeBreadcrumbs;
