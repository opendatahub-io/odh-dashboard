/* eslint-disable camelcase */
import React from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { DashboardModalFooter } from 'mod-arch-shared';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { GenAiContext } from '~/app/context/GenAiContext';
import { AIModel, LlamaModel, LlamaStackDistributionModel, MaaSModel } from '~/app/types';
import { deleteLSD, installLSD } from '~/app/services/llamaStackService';
import { convertMaaSModelToAIModel } from '~/app/utilities/utils';
import ChatbotConfigurationTable from './ChatbotConfigurationTable';
import ChatbotConfigurationState from './ChatbotConfigurationState';

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
}) => {
  const { namespace } = React.useContext(GenAiContext);

  // Convert pure MaaS models to AIModel format so they can be used in the table
  const maasAsAIModels: AIModel[] = React.useMemo(() => {
    const aiModelIds = new Set(aiModels.map((model) => model.model_id));
    // Only include MaaS models that aren't already in aiModels (i.e., not marked as AI assets)
    return maasModels
      .filter((maasModel) => !aiModelIds.has(maasModel.id))
      .map(convertMaaSModelToAIModel);
  }, [aiModels, maasModels]);

  // Merge all models and MaaS models for display
  const allModels = React.useMemo(
    () => [...aiModels, ...maasAsAIModels],
    [aiModels, maasAsAIModels],
  );

  const preSelectedModels = React.useMemo(() => {
    if (existingModels.length > 0) {
      const existingModelsSet = new Set(existingModels.map((model) => model.modelId));
      const existingAIModels = allModels.filter((model) => existingModelsSet.has(model.model_id));

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
    () => preSelectedModels.filter((model) => model.status === 'Running'),
    [preSelectedModels],
  );

  const [selectedModels, setSelectedModels] = React.useState<AIModel[]>(availableModels);

  const [configuringPlayground, setConfiguringPlayground] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [alertTitle, setAlertTitle] = React.useState<string>();

  const isUpdate = !!lsdStatus;

  const fireErrorEvents = (e: Error) => {
    fireFormTrackingEvent(isUpdate ? UPDATE_PLAYGROUND_EVENT_NAME : SETUP_PLAYGROUND_EVENT_NAME, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: e.message,
      namespace: namespace?.name,
    });
  };

  const onSubmit = () => {
    if (selectedModels.length === 0) {
      setAlertTitle('Select at least one model');
      const e = new Error(
        'To set up a playground, you must add at least one model. Select a model above to proceed.',
      );
      setError(e);
      fireErrorEvents(e);
      return;
    }
    if (!namespace?.name) {
      setError(new Error('Namespace is required'));
      return;
    }

    const install = () => {
      installLSD(
        namespace.name,
        selectedModels.map((model) => ({
          model_name: model.isMaaSModel && model.maasModelId ? model.maasModelId : model.model_name,
          is_maas_model: model.isMaaSModel || false,
        })),
      )
        .then(() => {
          fireFormTrackingEvent(
            isUpdate ? UPDATE_PLAYGROUND_EVENT_NAME : SETUP_PLAYGROUND_EVENT_NAME,
            {
              outcome: TrackingOutcome.submit,
              success: true,
              namespace: namespace.name,
              countModelsSelected: selectedModels.length,
              ...(isUpdate && { countPreviousModelsSelected: existingModels.length }),
            },
          );
          setConfiguringPlayground(true);
        })
        .catch((e) => {
          setError(e);
          fireErrorEvents(e);
          setConfiguringPlayground(false);
        });
    };

    // If LSD status is provided, delete the existing LSD and install the new models
    if (isUpdate) {
      deleteLSD(namespace.name, lsdStatus.name)
        .then(install)
        .catch((e) => {
          setError(e);
          fireErrorEvents(e);
          setConfiguringPlayground(false);
        });
    } else {
      install();
    }
  };

  const onBeforeClose = () => {
    setConfiguringPlayground(false);
    setError(undefined);
    setAlertTitle(undefined);
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
    <Modal isOpen onClose={onBeforeClose} variant={ModalVariant.large}>
      {!configuringPlayground && (
        <ModalHeader
          title="Configure playground"
          description={
            <>
              Choose the models you want to make available in this playground from your AI assets.
              You can add additional models by making them available from the{' '}
              <Link to={`/modelServing/${namespace?.name}`}>Model Deployments page</Link>.
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
          <ChatbotConfigurationTable
            allModels={allModels}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
          />
        )}
      </ModalBody>
      {!configuringPlayground && (
        <ModalFooter>
          <DashboardModalFooter
            submitLabel={isUpdate ? 'Update' : 'Create'}
            onSubmit={onSubmit}
            onCancel={onBeforeClose}
            error={error}
            alertTitle={alertTitle || 'Error configuring playground'}
          />
        </ModalFooter>
      )}
    </Modal>
  );
};

export default ChatbotConfigurationModal;
