import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';

export const CreateConnectionTypeBreadcrumbs: React.FunctionComponent = () => (
  <Breadcrumb ouiaId="BasicBreadcrumb">
    <BreadcrumbItem to="/connectionTypes">Connection types</BreadcrumbItem>
    <BreadcrumbItem to="#" isActive>
      Create connection type
    </BreadcrumbItem>
  </Breadcrumb>
);
