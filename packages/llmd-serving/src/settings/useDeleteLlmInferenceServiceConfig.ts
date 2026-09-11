import * as React from 'react';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { deleteLlmInferenceServiceConfigIfUnreferenced } from '../api/LLMInferenceServiceConfigs';
import type { LLMInferenceServiceConfigKind } from '../types';
import {
  fireRoutingConfigDeleted,
  fireTopologyConfigDeleted,
} from '../tracking/llmdTrackingConstants';
import { CONFIG_DELETION_PENDING_MESSAGE, type LlmConfigRefType } from '../utils';

type UseDeleteLlmInferenceServiceConfigResult = {
  deleteConfig: LLMInferenceServiceConfigKind | undefined;
  setDeleteConfig: React.Dispatch<React.SetStateAction<LLMInferenceServiceConfigKind | undefined>>;
  isDeleting: boolean;
  error: Error | undefined;
  handleDelete: () => Promise<void>;
  closeDeleteModal: () => void;
};

export const useDeleteLlmInferenceServiceConfig = (
  refType: LlmConfigRefType,
): UseDeleteLlmInferenceServiceConfigResult => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [deleteConfig, setDeleteConfig] = React.useState<LLMInferenceServiceConfigKind>();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const fireConfigDeleted =
    refType === 'routing' ? fireRoutingConfigDeleted : fireTopologyConfigDeleted;

  const closeDeleteModal = () => {
    fireConfigDeleted({ outcome: TrackingOutcome.cancel });
    setDeleteConfig(undefined);
    setIsDeleting(false);
    setError(undefined);
  };

  const handleDelete = async () => {
    if (!deleteConfig) {
      return;
    }

    setIsDeleting(true);
    setError(undefined);

    try {
      const outcome = await deleteLlmInferenceServiceConfigIfUnreferenced(
        deleteConfig.metadata.name,
        dashboardNamespace,
        refType,
      );

      if (outcome === 'blocked-pending') {
        setError(new Error(CONFIG_DELETION_PENDING_MESSAGE));
        fireConfigDeleted({ outcome: TrackingOutcome.submit, success: false });
        return;
      }

      fireConfigDeleted({ outcome: TrackingOutcome.submit, success: true });
      setDeleteConfig(undefined);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      fireConfigDeleted({ outcome: TrackingOutcome.submit, success: false });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteConfig,
    setDeleteConfig,
    isDeleting,
    error,
    handleDelete,
    closeDeleteModal,
  };
};
