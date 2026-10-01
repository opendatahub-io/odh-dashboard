import * as React from 'react';
import { useAccessReviewState, useDashboardNamespace } from '@odh-dashboard/plugin-core/host-api';
import { verbModelAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { LLMInferenceServiceConfigModel } from '../types';

/** Create controls use the operator namespace, never the selected deployment project. */
const LlmConfigCreateAccess: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const access = useAccessReviewState(
    verbModelAccess('create', LLMInferenceServiceConfigModel, dashboardNamespace),
    !!dashboardNamespace,
  );
  return access.state === 'allowed' ? <>{children}</> : null;
};

export default LlmConfigCreateAccess;
