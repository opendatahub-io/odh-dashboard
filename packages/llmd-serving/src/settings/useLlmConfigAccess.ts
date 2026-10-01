import { useAccessReviewState } from '@odh-dashboard/plugin-core/host-api';
import { verbModelAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { LLMInferenceServiceConfigModel, type LLMInferenceServiceConfigKind } from '../types';

/** Row mutations are scoped to the resource, independently of presentation flags. */
export const useLlmConfigAccess = (
  config: LLMInferenceServiceConfigKind,
  editVerb: 'patch' | 'update' = 'patch',
): {
  canPatch: boolean;
  canEdit: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
} => {
  const { name, namespace } = config.metadata;
  const enabled = !!namespace && !!name;
  const get = useAccessReviewState(
    { ...verbModelAccess('get', LLMInferenceServiceConfigModel, namespace), name },
    enabled,
  );
  const edit = useAccessReviewState(
    { ...verbModelAccess(editVerb, LLMInferenceServiceConfigModel, namespace), name },
    enabled,
  );
  const remove = useAccessReviewState(
    { ...verbModelAccess('delete', LLMInferenceServiceConfigModel, namespace), name },
    enabled,
  );
  const create = useAccessReviewState(
    verbModelAccess('create', LLMInferenceServiceConfigModel, namespace),
    enabled,
  );
  return {
    canPatch: editVerb === 'patch' && edit.state === 'allowed',
    canEdit: get.state === 'allowed' && edit.state === 'allowed',
    canDuplicate: get.state === 'allowed' && create.state === 'allowed',
    canDelete: get.state === 'allowed' && remove.state === 'allowed',
  };
};
