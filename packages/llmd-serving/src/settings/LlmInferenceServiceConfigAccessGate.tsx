import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useAccessReviewState, useDashboardNamespace } from '@odh-dashboard/plugin-core/host-api';
import { verbModelAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { useParams } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import { LLMInferenceServiceConfigModel } from '../types';

/**
 * All settings routes watch configs. Forms additionally require only the reads
 * and mutation they perform; presentation flags never grant these permissions.
 */
const LlmInferenceServiceConfigAccessGate: React.FC<
  React.PropsWithChildren<{
    mode?: 'view' | 'create' | 'edit' | 'duplicate';
    editVerb?: 'patch' | 'update';
  }>
> = ({ children, mode = 'view', editVerb = 'patch' }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { configName } = useParams<{ configName: string }>();
  const list = useAccessReviewState(
    verbModelAccess('list', LLMInferenceServiceConfigModel, dashboardNamespace),
    !!dashboardNamespace,
  );
  const watch = useAccessReviewState(
    verbModelAccess('watch', LLMInferenceServiceConfigModel, dashboardNamespace),
    !!dashboardNamespace,
  );
  const needsSource = mode === 'edit' || mode === 'duplicate';
  const get = useAccessReviewState(
    {
      ...verbModelAccess('get', LLMInferenceServiceConfigModel, dashboardNamespace),
      name: configName,
    },
    !!dashboardNamespace && !!configName && needsSource,
  );
  const mutation = useAccessReviewState(
    {
      ...verbModelAccess(
        mode === 'edit' ? editVerb : 'create',
        LLMInferenceServiceConfigModel,
        dashboardNamespace,
      ),
      ...(mode === 'edit' && { name: configName }),
    },
    !!dashboardNamespace && mode !== 'view' && (!needsSource || !!configName),
  );
  const required = [
    list,
    watch,
    ...(needsSource ? [get] : []),
    ...(mode === 'view' ? [] : [mutation]),
  ];

  if (required.some(({ state }) => state === 'denied' || state === 'error')) {
    return <NotFound />;
  }

  if (required.some(({ state }) => state === 'loading')) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return <>{children}</>;
};

export default LlmInferenceServiceConfigAccessGate;
