/* eslint-disable camelcase */
import React from 'react';
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { ArrowLeftIcon } from '@patternfly/react-icons';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { GenAiContext } from '~/app/context/GenAiContext';
import {
  AIModel,
  ExternalVectorStoreSummary,
  LlamaModel,
  LlamaStackDistributionModel,
  MaaSModel,
  VectorStore,
} from '~/app/types';
import {
  computeEmbeddingModelStatus,
  convertMaaSModelToAIModel,
  isPlaygroundModelMatchForAIModel,
  splitLlamaModelId,
} from '~/app/utilities/utils';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import useAiAssetVectorStoresEnabled from '~/app/hooks/useAiAssetVectorStoresEnabled';
import ChatbotConfigurationTable from './ChatbotConfigurationTable';
import ChatbotConfigurationCollectionsTable from './ChatbotConfigurationCollectionsTable';
import ChatbotConfigurationState from './ChatbotConfigurationState';

type ModalStepConfig = {
  id: string;
  /** Whether this step is included in the wizard. Steps with enabled=false are skipped. */
  enabled: boolean;
  component: React.ReactNode;
  /** Label for the primary button when this is NOT the last active step */
  nextCTA: string;
  /** Label suffix for the back button on this step (← Back to {backCTA} is auto-composed) */
  backCTA: string;
};

type ChatbotConfigurationModalProps = {
  onClose: () => void;
  lsdStatus: LlamaStackDistributionModel | null;
  /** All available AI assets models in the namespace */
  aiModels: AIModel[];
  /** All available MaaS models in the namespace */
  maasModels?: MaaSModel[];
  /** Models that are already available in the playground,
   * passing this means that the modal will be in update mode */
  existingModels?: LlamaModel[];
  /** Models that we want to be selected in the table besides the existing models */
  extraSelectedModels?: AIModel[];
  /** Whether show the button in the modal to redirect to the playground after configuration */
  redirectToPlayground?: boolean;
  /** All available external vector store collections */
  allCollections: ExternalVectorStoreSummary[];
  /** Whether the collections fetch has completed */
  collectionsLoaded: boolean;
  /** Collections already registered in the playground — used to pre-select rows */
  existingCollections?: VectorStore[];
  /** Collections to pre-select in addition to existingCollections */
  extraSelectedCollections?: ExternalVectorStoreSummary[];
  /** Step id to open the modal on. Defaults to the first active step. */
  initialStepId?: string;
};

const SETUP_PLAYGROUND_EVENT_NAME = 'Playground Setup';
const UPDATE_PLAYGROUND_EVENT_NAME = 'Playground Config Update';

const ChatbotConfigurationModal: React.FC<ChatbotConfigurationModalProps> = ({
  onClose,
  lsdStatus,
  aiModels,
  maasModels = [],
  existingModels = [],
  extraSelectedModels,
  redirectToPlayground,
  allCollections,
  collectionsLoaded,
  existingCollections = [],
  extraSelectedCollections,
  initialStepId,
}) => {
  const { namespace } = React.useContext(GenAiContext);
  const { api, apiAvailable } = useGenAiAPI();
  const guardrailsEnabled = useGuardrailsEnabled();
  const vectorStoresEnabled = useAiAssetVectorStoresEnabled();

  const maasAsAIModels: AIModel[] = React.useMemo(
    () => maasModels.map(convertMaaSModelToAIModel),
    [maasModels],
  );

  // Merge all models and MaaS models for display
  const allModels = React.useMemo(
    () => [...aiModels, ...maasAsAIModels],
    [aiModels, maasAsAIModels],
  );

  const preSelectedModels = React.useMemo(() => {
    if (existingModels.length > 0) {
      const existingAIModels = allModels.filter((model) =>
        existingModels.some((m) => isPlaygroundModelMatchForAIModel(m, model)),
      );

      if (extraSelectedModels && extraSelectedModels.length > 0) {
        const extraSelectedModelsSet = new Set(
          extraSelectedModels.map((model) => model.model_name),
        );
        const merged = [
          ...extraSelectedModels,
          ...existingAIModels.filter((model) => !extraSelectedModelsSet.has(model.model_name)),
        ];
        return merged;
      }
      return existingAIModels;
    }
    return extraSelectedModels ?? allModels;
  }, [existingModels, extraSelectedModels, allModels]);

  const availableModels = React.useMemo(
    () =>
      preSelectedModels.filter(
        (model) => model.status === 'Running' || model.model_source_type === 'custom_endpoint',
      ),
    [preSelectedModels],
  );

  const [maxTokensMap, setMaxTokensMap] = React.useState<Map<string, number | undefined>>(
    new Map(),
  );
  const [embeddingDimensionMap, setEmbeddingDimensionMap] = React.useState<
    Map<string, number | undefined>
  >(new Map());

  const availableCollections = React.useMemo(
    () =>
      allCollections.filter(
        (c) =>
          computeEmbeddingModelStatus(c.embedding_model, allModels, existingModels) !==
          'not_available',
      ),
    [allCollections, allModels, existingModels],
  );

  const preSelectedCollections = React.useMemo(() => {
    const existingIds = new Set(existingCollections.map((vs) => vs.id));
    const fromExisting = availableCollections.filter((c) => existingIds.has(c.vector_store_id));

    if (!extraSelectedCollections || extraSelectedCollections.length === 0) {
      return fromExisting;
    }

    const extraIds = new Set(extraSelectedCollections.map((c) => c.vector_store_id));
    const filteredExtras = extraSelectedCollections.filter((c) =>
      availableCollections.some((ac) => ac.vector_store_id === c.vector_store_id),
    );
    return [...filteredExtras, ...fromExisting.filter((c) => !extraIds.has(c.vector_store_id))];
  }, [existingCollections, availableCollections, extraSelectedCollections]);

  const [selectedModels, setSelectedModels] = React.useState<AIModel[]>(() => {
    // Start from available models (preserve duplicates) and add any embedding models
    // required by pre-selected collections that are not already present.
    const result = [...availableModels];
    const existingNames = new Set(availableModels.map((m) => m.model_name));
    preSelectedCollections.forEach((c) => {
      const { id: normEmbedId } = splitLlamaModelId(c.embedding_model);
      const found = allModels.find((m) => {
        const { id: normModelId } = splitLlamaModelId(m.model_id);
        return m.model_id === c.embedding_model || normModelId === normEmbedId;
      });
      if (found && !existingNames.has(found.model_name)) {
        result.push(found);
        existingNames.add(found.model_name);
      }
    });
    return result;
  });

  const [modelTypeMap, setModelTypeMap] = React.useState<Map<string, string>>(() => {
    // Pre-mark embedding models required by pre-selected collections as "Embedding"
    const map = new Map<string, string>();
    preSelectedCollections.forEach((c) => {
      const { id: normEmbedId } = splitLlamaModelId(c.embedding_model);
      const found = allModels.find((m) => {
        const { id: normModelId } = splitLlamaModelId(m.model_id);
        return m.model_id === c.embedding_model || normModelId === normEmbedId;
      });
      if (found) {
        map.set(found.model_name, 'Embedding');
      }
    });
    return map;
  });

  const [selectedCollections, setSelectedCollections] =
    React.useState<ExternalVectorStoreSummary[]>(preSelectedCollections);

  const lockedModelNames = React.useMemo(() => {
    const names = new Set<string>();
    selectedCollections.forEach((c) => {
      const { id: normEmbedId } = splitLlamaModelId(c.embedding_model);
      const found = allModels.find((m) => {
        const { id: normModelId } = splitLlamaModelId(m.model_id);
        return m.model_id === c.embedding_model || normModelId === normEmbedId;
      });
      if (found) {
        names.add(found.model_name);
      }
    });
    return names;
  }, [selectedCollections, allModels]);

  const handleSetSelectedCollections = React.useCallback<
    React.Dispatch<React.SetStateAction<ExternalVectorStoreSummary[]>>
  >(
    (updater) => {
      setSelectedCollections((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;

        const findEmbeddingModel = (embedModelId: string) => {
          const { id: normEmbedId } = splitLlamaModelId(embedModelId);
          return allModels.find((m) => {
            const { id: normModelId } = splitLlamaModelId(m.model_id);
            return m.model_id === embedModelId || normModelId === normEmbedId;
          });
        };

        // Only act on newly selected collections — never remove models when deselecting.
        // Use composite key (model_source_type + model_id) so a MaaS and a namespace model
        // sharing the same model_name are not collapsed into one entry.
        const modelKey = (m: AIModel) => `${m.model_source_type}-${m.model_id}`;
        const nextRequired = new Map<string, AIModel>();
        next.forEach((c) => {
          const m = findEmbeddingModel(c.embedding_model);
          if (m) {
            nextRequired.set(modelKey(m), m);
          }
        });

        setSelectedModels((prevModels) => {
          const byKey = new Map(prevModels.map((m) => [modelKey(m), m]));
          nextRequired.forEach((model, key) => byKey.set(key, model));
          return Array.from(byKey.values());
        });

        setModelTypeMap((prevMap) => {
          const newMap = new Map(prevMap);
          // modelTypeMap is keyed by model_name everywhere else — keep that convention here.
          nextRequired.forEach((model) => newMap.set(model.model_name, 'Embedding'));
          return newMap;
        });

        return next;
      });
    },
    [allModels],
  );

  const initialIndex = React.useMemo(() => {
    if (!initialStepId) {
      return 0;
    }
    // Mirror the same enabled logic used in the steps array so the index is
    // clamped to the actual active steps rather than a hardcoded order.
    const collectionsEnabled =
      vectorStoresEnabled && collectionsLoaded && availableCollections.length > 0;
    const activeStepIds = collectionsEnabled ? ['models', 'collections'] : ['models'];
    const idx = activeStepIds.indexOf(initialStepId);
    return Math.max(0, Math.min(idx >= 0 ? idx : 0, activeStepIds.length - 1));
  }, [initialStepId, vectorStoresEnabled, collectionsLoaded, availableCollections]);

  const [currentStepIndex, setCurrentStepIndex] = React.useState(initialIndex);
  const [submitting, setSubmitting] = React.useState(false);
  const [configuringPlayground, setConfiguringPlayground] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [alertTitle, setAlertTitle] = React.useState<string>();

  const isUpdate = !!lsdStatus;

  /**
   * Handles changes to the max_tokens value for a specific model.
   * Updates the maxTokensMap state with the new value, or removes the entry if undefined.
   *
   * @param modelName - The name of the model whose max_tokens value is being changed
   * @param value - The new max_tokens value, or undefined to remove the limit
   */
  const handleModelTypeChange = React.useCallback((modelName: string, value: string) => {
    setModelTypeMap((prev) => new Map(prev).set(modelName, value));
  }, []);

  const handleEmbeddingDimensionChange = React.useCallback(
    (modelName: string, value: number | undefined) => {
      setEmbeddingDimensionMap((prev) => {
        const newMap = new Map(prev);
        if (value === undefined) {
          newMap.delete(modelName);
        } else {
          newMap.set(modelName, value);
        }
        return newMap;
      });
    },
    [],
  );

  const handleMaxTokensChange = React.useCallback(
    (modelName: string, value: number | undefined) => {
      setMaxTokensMap((prev) => {
        const newMap = new Map(prev);
        if (value === undefined) {
          newMap.delete(modelName);
        } else {
          newMap.set(modelName, value);
        }
        return newMap;
      });
    },
    [],
  );

  const steps: ModalStepConfig[] = React.useMemo(
    () => [
      {
        id: 'models',
        enabled: true,
        component: (
          <ChatbotConfigurationTable
            allModels={allModels}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            modelTypeMap={modelTypeMap}
            onModelTypeChange={handleModelTypeChange}
            maxTokensMap={maxTokensMap}
            onMaxTokensChange={handleMaxTokensChange}
            embeddingDimensionMap={embeddingDimensionMap}
            onEmbeddingDimensionChange={handleEmbeddingDimensionChange}
            lockedModelNames={lockedModelNames}
          />
        ),
        nextCTA: 'Next: select collections',
        backCTA: '',
      },
      {
        id: 'collections',
        enabled: vectorStoresEnabled && collectionsLoaded && availableCollections.length > 0,
        component: (
          <ChatbotConfigurationCollectionsTable
            allCollections={availableCollections}
            selectedCollections={selectedCollections}
            setSelectedCollections={handleSetSelectedCollections}
          />
        ),
        nextCTA: '',
        backCTA: 'Inference models',
      },
    ],
    [
      allModels,
      selectedModels,
      modelTypeMap,
      handleModelTypeChange,
      maxTokensMap,
      handleMaxTokensChange,
      embeddingDimensionMap,
      handleEmbeddingDimensionChange,
      vectorStoresEnabled,
      collectionsLoaded,
      availableCollections,
      selectedCollections,
      lockedModelNames,
      handleSetSelectedCollections,
    ],
  );

  const activeSteps = React.useMemo(() => steps.filter((s) => s.enabled), [steps]);
  const currentStep = activeSteps[currentStepIndex] ?? activeSteps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === activeSteps.length - 1;
  // True while we don't yet know if the collections step will be present
  const isStepsLoading = vectorStoresEnabled && !collectionsLoaded;

  const goNext = () => setCurrentStepIndex((i) => Math.min(i + 1, activeSteps.length - 1));
  const goBack = () => setCurrentStepIndex((i) => Math.max(i - 1, 0));

  const fireErrorEvents = (e: Error) => {
    fireFormTrackingEvent(isUpdate ? UPDATE_PLAYGROUND_EVENT_NAME : SETUP_PLAYGROUND_EVENT_NAME, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: e.message,
      namespace: namespace?.name,
    });
  };

  const isNemoGuardrailsConflict = (e: unknown): boolean =>
    e instanceof Error && 'code' in e && e.code === '409';

  const onSubmit = () => {
    if (submitting) {
      return;
    }
    if (selectedModels.length === 0) {
      setAlertTitle('Select at least one model');
      const e = new Error(
        'To set up a playground, you must add at least one model. Select a model above to proceed.',
      );
      setError(e);
      fireErrorEvents(e);
      return;
    }
    if (!apiAvailable) {
      setError(new Error('API is not available'));
      return;
    }

    setSubmitting(true);

    const install = () => {
      const installLSDPromise = api.installLSD({
        models: selectedModels.map((model) => {
          const isMaaS = model.model_source_type === 'maas';
          const resolvedType =
            modelTypeMap.get(model.model_name) ??
            (model.model_type === 'embedding' ? 'Embedding' : 'Inference');
          const apiModelType = resolvedType === 'Embedding' ? 'embedding' : 'llm';
          const maxTokens = maxTokensMap.get(model.model_name);
          const embeddingDimension = embeddingDimensionMap.get(model.model_name);
          return {
            model_name: isMaaS ? model.model_id : model.model_name,
            model_source_type: model.model_source_type,
            model_type: apiModelType,
            ...(apiModelType === 'llm' && maxTokens !== undefined && { max_tokens: maxTokens }),
            ...(apiModelType === 'embedding' &&
              embeddingDimension !== undefined && { embedding_dimension: embeddingDimension }),
          };
        }),
        enable_guardrails: guardrailsEnabled,
        ...(selectedCollections.length > 0 && {
          vector_stores: selectedCollections.map((c) => ({ vector_store_id: c.vector_store_id })),
        }),
      });

      // If guardrails are enabled, init NemoGuardrails. A 409 (already initialised) is swallowed —
      // the status poller in ChatbotConfigurationState handles waiting for ready.
      // Any other error (network fault, server error) is rethrown to surface in the wizard.
      const nemoPromise: Promise<void> = guardrailsEnabled
        ? api
            .initNemoGuardrails({})
            .then(() => undefined)
            .catch((e: unknown) => {
              if (isNemoGuardrailsConflict(e)) {
                return undefined;
              }
              throw e;
            })
        : Promise.resolve();

      Promise.all([installLSDPromise, nemoPromise])
        .then(() => {
          fireFormTrackingEvent(
            isUpdate ? UPDATE_PLAYGROUND_EVENT_NAME : SETUP_PLAYGROUND_EVENT_NAME,
            {
              outcome: TrackingOutcome.submit,
              success: true,
              namespace: namespace?.name,
              countModelsSelected: selectedModels.length,
              ...(isUpdate && { countPreviousModelsSelected: existingModels.length }),
            },
          );
          setConfiguringPlayground(true);
        })
        .catch((e) => {
          setError(e);
          fireErrorEvents(e);
          setSubmitting(false);
          setConfiguringPlayground(false);
        });
    };

    // If LSD status is provided, delete the existing LSD and install the new models
    if (isUpdate) {
      api
        .deleteLSD({
          name: lsdStatus.name,
        })
        .then(install)
        .catch((e) => {
          setError(e);
          fireErrorEvents(e);
          setSubmitting(false);
          setConfiguringPlayground(false);
        });
    } else {
      install();
    }
  };

  const onBeforeClose = () => {
    setSubmitting(false);
    setConfiguringPlayground(false);
    setCurrentStepIndex(0);
    setError(undefined);
    setAlertTitle(undefined);
    setModelTypeMap(new Map());
    setMaxTokensMap(new Map());
    setEmbeddingDimensionMap(new Map());
    fireFormTrackingEvent(isUpdate ? UPDATE_PLAYGROUND_EVENT_NAME : SETUP_PLAYGROUND_EVENT_NAME, {
      outcome: TrackingOutcome.cancel,
      namespace: namespace?.name,
    });
    onClose();
  };

  const onSuccessClose = () => {
    setConfiguringPlayground(false);
    setError(undefined);
    setAlertTitle(undefined);
    // No cancel tracking event here – success was already tracked
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onBeforeClose}
      variant={ModalVariant.large}
      data-testid="configure-playground-modal"
    >
      {!configuringPlayground && (
        <ModalHeader
          title="Configure playground"
          description={
            <>
              Select the endpoints of deployed models to try in the {namespace?.name} project
              playground.
              {error && (
                <Alert
                  variant="danger"
                  title={alertTitle || 'Error configuring playground'}
                  isInline
                  style={{ marginTop: '1rem' }}
                >
                  {error.message}
                </Alert>
              )}
            </>
          }
        />
      )}
      <ModalBody>
        {configuringPlayground ? (
          <ChatbotConfigurationState
            redirectToPlayground={redirectToPlayground}
            onClose={onSuccessClose}
          />
        ) : (
          currentStep.component
        )}
      </ModalBody>
      {!configuringPlayground && (
        <ModalFooter>
          {!isStepsLoading && isLastStep ? (
            <Button
              variant="primary"
              onClick={onSubmit}
              isDisabled={submitting}
              data-testid="modal-submit-button"
            >
              {isUpdate ? 'Configure' : 'Create'}
            </Button>
          ) : (
            <Button variant="primary" onClick={goNext} isDisabled={isStepsLoading || submitting}>
              {currentStep.nextCTA}
            </Button>
          )}
          {!isFirstStep && (
            <Button variant="secondary" onClick={goBack} isDisabled={submitting}>
              <ArrowLeftIcon /> Back to {currentStep.backCTA}
            </Button>
          )}
          <Button variant="link" onClick={onBeforeClose} isDisabled={submitting}>
            Cancel
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
};

export default ChatbotConfigurationModal;
