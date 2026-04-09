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
  const [rateLimitsTouched, setRateLimitsTouched] = React.useState<Set<number>>(new Set());

  const allModelsHaveRateLimits = models.every((m) => m.tokenRateLimits.length > 0);

  const rateLimitErrorIndices = React.useMemo(
    () =>
      new Set(
        models.reduce<number[]>((acc, m, i) => {
          if (rateLimitsTouched.has(i) && m.tokenRateLimits.length === 0) {
            acc.push(i);
          }
          return acc;
        }, []),
      ),
    [models, rateLimitsTouched],
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
    setRateLimitsTouched((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) {
          next.add(i);
        } else if (i > index) {
          next.add(i - 1);
        }
      });
      return next;
    });
  }, []);

  const handleRemoveModelsByRef = React.useCallback((refs: MaaSModelRefSummary[]) => {
    const keysToRemove = new Set(refs.map((r) => `${r.namespace}/${r.name}`));
    setModels((prev) => {
      const removedIndices = new Set<number>();
      prev.forEach((m, i) => {
        if (keysToRemove.has(`${m.modelRefSummary.namespace}/${m.modelRefSummary.name}`)) {
          removedIndices.add(i);
        }
      });
      setRateLimitsTouched((prevTouched) => {
        const next = new Set<number>();
        let offset = 0;
        for (let i = 0; i < prev.length; i++) {
          if (removedIndices.has(i)) {
            offset++;
          } else if (prevTouched.has(i)) {
            next.add(i - offset);
          }
        }
        return next;
      });
      return prev.filter((_, i) => !removedIndices.has(i));
    });
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
    setRateLimitsTouched((prev) => {
      if (editLimitsTarget == null) {
        return prev;
      }
      return new Set(prev).add(editLimitsTarget);
    });
    setEditLimitsTarget(null);
  }, [editLimitsTarget]);

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
