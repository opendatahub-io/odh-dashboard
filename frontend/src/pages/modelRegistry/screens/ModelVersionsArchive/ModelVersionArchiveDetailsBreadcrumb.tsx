import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import React from 'react';
import { Link } from 'react-router-dom';
import { RegisteredModel } from '#~/concepts/modelRegistry/types';
import { modelVersionArchiveRoute } from '#~/routes/modelRegistry/modelVersionArchive';
import { registeredModelRoute } from '#~/routes/modelRegistry/registeredModels';

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
      render={() => <Link to="/ai-hub/registry">Model registry - {preferredModelRegistry}</Link>}
    />
    <BreadcrumbItem
      render={() =>
        !registeredModel?.name ? (
          'Loading...'
        ) : (
          <Link to={registeredModelRoute(registeredModel.id, preferredModelRegistry)}>
            {registeredModel.name}
          </Link>
        )
      }
    />
    <BreadcrumbItem
      render={() => (
        <Link to={modelVersionArchiveRoute(registeredModel?.id, preferredModelRegistry)}>
          Archived versions
        </Link>
      )}
    />
    <BreadcrumbItem isActive>{modelVersionName || 'Loading...'}</BreadcrumbItem>
  </Breadcrumb>
);

export default ModelVersionArchiveDetailsBreadcrumb;
