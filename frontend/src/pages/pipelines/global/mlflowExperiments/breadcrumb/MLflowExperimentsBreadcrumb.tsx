import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import {
  buildParentPathQuery,
  MLFLOW_DEFAULT_PATH,
  normalizePathQuery,
} from '#~/routes/pipelines/mlflowExperiments';
import { useMlflowEntityNames } from '#~/pages/pipelines/global/mlflowExperiments/context/MlflowEntityNamesContext';
import { buildBreadcrumbsFromMlflowPathQuery } from './utils';

const MLflowExperimentsBreadcrumb: React.FC = () => {
  const { pathname, search } = useLocation();
  const { getName } = useMlflowEntityNames();
  const pathQuery =
    normalizePathQuery(buildParentPathQuery(pathname, search)) || MLFLOW_DEFAULT_PATH;
  const breadcrumbs = buildBreadcrumbsFromMlflowPathQuery(pathQuery, getName);
  if (breadcrumbs.length === 0) {
    return null;
  }
  return (
    <Breadcrumb data-testid="mlflow-experiments-breadcrumb">
      {breadcrumbs.map((b, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <BreadcrumbItem
            key={b.path}
            isActive={isLast}
            render={() => (isLast ? b.label : <Link to={b.path}>{b.label}</Link>)}
          />
        );
      })}
    </Breadcrumb>
  );
};

export default MLflowExperimentsBreadcrumb;
