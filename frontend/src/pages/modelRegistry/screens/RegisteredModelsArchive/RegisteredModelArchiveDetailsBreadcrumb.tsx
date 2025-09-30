import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import React from 'react';
import { Link } from 'react-router-dom';
import { RegisteredModel } from '#~/concepts/modelRegistry/types';
import { registeredModelArchiveRoute } from '#~/routes/modelRegistry/modelArchive';

type RegisteredModelArchiveDetailsBreadcrumbProps = {
  preferredModelRegistry?: string;
  registeredModel: RegisteredModel | null;
};

const RegisteredModelArchiveDetailsBreadcrumb: React.FC<
  RegisteredModelArchiveDetailsBreadcrumbProps
> = ({ preferredModelRegistry, registeredModel }) => (
  <Breadcrumb>
    <BreadcrumbItem
      render={() => <Link to="/modelRegistry">Model registry - {preferredModelRegistry}</Link>}
    />
    <BreadcrumbItem
      render={() => (
        <Link to={registeredModelArchiveRoute(preferredModelRegistry)}>Archived models</Link>
      )}
    />
    <BreadcrumbItem isActive>{registeredModel?.name || 'Loading...'}</BreadcrumbItem>
  </Breadcrumb>
);

export default RegisteredModelArchiveDetailsBreadcrumb;
