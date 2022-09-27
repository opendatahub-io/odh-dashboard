import * as React from 'react';
import { useLocation } from 'react-router';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { pathToOdhRoute } from '../utilities/routeUtils';

const OdhBreadcrumb: React.FC = () => {
  const location = useLocation();

  // Use the map to build the bread crumb
  const subRoutes = pathToOdhRoute(location.pathname);

  return (
    <Breadcrumb>
      {subRoutes?.map((value, index) => (
        <BreadcrumbItem to={value?.path} isActive={subRoutes.length === index + 1}>
          {value?.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
};

export default OdhBreadcrumb;
