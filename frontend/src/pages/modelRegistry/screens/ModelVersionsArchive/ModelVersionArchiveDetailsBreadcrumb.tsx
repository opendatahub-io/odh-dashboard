import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import React from 'react';
import { Link } from 'react-router-dom';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import {
  modelVersionArchiveUrl,
  registeredModelUrl,
} from '~/pages/modelRegistry/screens/routeUtils';

type ModelVersionArchiveDetailsBreadcrumbProps = {
  preferredModelRegistry?: string;
  registeredModel: RegisteredModel | null;
  modelVersionName?: string;
};

const ModelVersionArchiveDetailsBreadcrumb: React.FC<ModelVersionArchiveDetailsBreadcrumbProps> = ({
  preferredModelRegistry,
  registeredModel,
  modelVersionName,
}) => (
  <Breadcrumb>
    <BreadcrumbItem
      render={() => <Link to="/modelRegistry">Model registry - {preferredModelRegistry}</Link>}
    />
    <BreadcrumbItem
      render={() =>
        !registeredModel?.name ? (
          'Loading...'
        ) : (
          <Link to={registeredModelUrl(registeredModel.id, preferredModelRegistry)}>
            {registeredModel.name}
          </Link>
        )
      }
    />
    <BreadcrumbItem
      render={() => (
        <Link to={modelVersionArchiveUrl(registeredModel?.id, preferredModelRegistry)}>
          Archived versions
        </Link>
      )}
    />
    <BreadcrumbItem isActive>{modelVersionName || 'Loading...'}</BreadcrumbItem>
  </Breadcrumb>
);

export default ModelVersionArchiveDetailsBreadcrumb;
