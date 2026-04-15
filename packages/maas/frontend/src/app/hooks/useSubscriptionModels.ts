import React from 'react';
import {
  MaaSModelRefSummary,
  SubscriptionModelEntry,
  TokenRateLimit,
} from '~/app/types/subscriptions';

type UseSubscriptionModelsReturn = {
  models: SubscriptionModelEntry[];
  isAddModelsModalOpen: boolean;
  setIsAddModelsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editLimitsTarget: number | null;
  setEditLimitsTarget: React.Dispatch<React.SetStateAction<number | null>>;
  editingModel: SubscriptionModelEntry | null;
  rateLimitErrorIndices: Set<number>;
  allModelsHaveRateLimits: boolean;
  handleAddModels: (refs: MaaSModelRefSummary[]) => void;
  handleRemoveModel: (index: number) => void;
  handleRemoveModelsByRef: (refs: MaaSModelRefSummary[]) => void;
  handleSaveRateLimits: (rateLimits: TokenRateLimit[]) => void;
  handleCloseRateLimitsModal: () => void;
};

export const useSubscriptionModels = (
  initialModels: SubscriptionModelEntry[] = [],
): UseSubscriptionModelsReturn => {
  const [models, setModels] = React.useState<SubscriptionModelEntry[]>(initialModels);
  const [isAddModelsModalOpen, setIsAddModelsModalOpen] = React.useState(false);
  const [editLimitsTarget, setEditLimitsTarget] = React.useState<number | null>(null);

  const allModelsHaveRateLimits = models.every((m) => m.tokenRateLimits.length > 0);

  const rateLimitErrorIndices = React.useMemo(
    () =>
      new Set(
        models.reduce<number[]>((acc, m, i) => {
          if (m.tokenRateLimits.length === 0) {
            acc.push(i);
          }
          return acc;
        }, []),
      ),
    [models],
  );

  const editingModel = editLimitsTarget != null ? models[editLimitsTarget] : null;

  const handleAddModels = React.useCallback((selectedRefs: MaaSModelRefSummary[]) => {
    setModels((prev) => {
      const existingKeys = new Set(
        prev.map((m) => `${m.modelRefSummary.namespace}/${m.modelRefSummary.name}`),
      );
      const newEntries: SubscriptionModelEntry[] = selectedRefs
        .filter((ref) => !existingKeys.has(`${ref.namespace}/${ref.name}`))
        .map((ref) => ({
          modelRefSummary: ref,
          tokenRateLimits: [],
        }));
      return [...prev, ...newEntries];
    });
  }, []);

  const handleRemoveModel = React.useCallback((index: number) => {
    setModels((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveModelsByRef = React.useCallback((refs: MaaSModelRefSummary[]) => {
    const keysToRemove = new Set(refs.map((r) => `${r.namespace}/${r.name}`));
    setModels((prev) =>
      prev.filter(
        (m) => !keysToRemove.has(`${m.modelRefSummary.namespace}/${m.modelRefSummary.name}`),
      ),
    );
  }, []);

  const handleSaveRateLimits = React.useCallback(
    (rateLimits: TokenRateLimit[]) => {
      if (editLimitsTarget == null) {
        return;
      }
      setModels((prev) =>
        prev.map((entry, i) =>
          i === editLimitsTarget ? { ...entry, tokenRateLimits: rateLimits } : entry,
        ),
      );
    },
    [editLimitsTarget],
  );

  const handleCloseRateLimitsModal = React.useCallback(() => {
    setEditLimitsTarget(null);
  }, []);

  return {
    models,
    isAddModelsModalOpen,
    setIsAddModelsModalOpen,
    editLimitsTarget,
    setEditLimitsTarget,
    editingModel,
    rateLimitErrorIndices,
    allModelsHaveRateLimits,
    handleAddModels,
    handleRemoveModel,
    handleRemoveModelsByRef,
    handleSaveRateLimits,
    handleCloseRateLimitsModal,
  };
};
