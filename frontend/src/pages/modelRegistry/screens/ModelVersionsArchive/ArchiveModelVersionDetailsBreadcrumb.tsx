import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import React from 'react';
import { Link } from 'react-router-dom';
import { RegisteredModel } from '#~/concepts/modelRegistry/types';
import {
  registeredModelArchiveDetailsRoute,
  registeredModelArchiveRoute,
} from '#~/routes/modelRegistry/modelArchive';

type ArchiveModelVersionDetailsBreadcrumbProps = {
  preferredModelRegistry?: string;
  registeredModel: RegisteredModel | null;
  modelVersionName?: string;
};

const ArchiveModelVersionDetailsBreadcrumb: React.FC<ArchiveModelVersionDetailsBreadcrumbProps> = ({
  preferredModelRegistry,
  registeredModel,
  modelVersionName,
}) => (
  <Breadcrumb>
    <BreadcrumbItem
      render={() => <Link to="/modelRegistry">Model registry - {preferredModelRegistry}</Link>}
    />
    <BreadcrumbItem
      render={() => (
        <Link to={registeredModelArchiveRoute(preferredModelRegistry)}>Archived models</Link>
      )}
    />
    <BreadcrumbItem
      render={() =>
        !registeredModel?.name ? (
          'Loading...'
        ) : (
          <Link to={registeredModelArchiveDetailsRoute(registeredModel.id, preferredModelRegistry)}>
            {registeredModel.name}
          </Link>
        )
      }
    />
    <BreadcrumbItem isActive>{modelVersionName || 'Loading...'}</BreadcrumbItem>
  </Breadcrumb>
);

export default ArchiveModelVersionDetailsBreadcrumb;
