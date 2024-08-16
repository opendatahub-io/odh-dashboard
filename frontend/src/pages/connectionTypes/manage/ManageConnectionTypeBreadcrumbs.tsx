import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';

const ManageConnectionTypeBreadcrumbs: React.FunctionComponent = () => (
  <Breadcrumb ouiaId="BasicBreadcrumb">
    <BreadcrumbItem>
      <Link to="/connectionTypes">Connection types</Link>
    </BreadcrumbItem>
    <BreadcrumbItem isActive>Create connection type</BreadcrumbItem>
  </Breadcrumb>
);

export default ManageConnectionTypeBreadcrumbs;
