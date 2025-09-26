import React from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { DashboardModalFooter } from 'mod-arch-shared';
import { GenAiContext } from '~/app/context/GenAiContext';
import { AIModel, LlamaModel, LlamaStackDistributionModel } from '~/app/types';
import { deleteLSD, installLSD } from '~/app/services/llamaStackService';
import ChatbotConfigurationTable from './ChatbotConfigurationTable';
import ChatbotConfigurationState from './ChatbotConfigurationState';

type ChatbotConfigurationModalProps = {
  onClose: (onSubmitted: boolean) => void;
  lsdStatus: LlamaStackDistributionModel | null;
  /** All available AI assets models in the namespace */
  allModels: AIModel[];
  /** Models that are already available in the playground,
   * passing this means that the modal will be in update mode */
  existingModels?: LlamaModel[];
  /** Models that we want to be selected in the table besides the existing models */
  extraSelectedModels?: AIModel[];
  /** Whether show the button in the modal to redirect to the playground after configuration */
  redirectToPlayground?: boolean;
};

const ChatbotConfigurationModal: React.FC<ChatbotConfigurationModalProps> = ({
  onClose,
  lsdStatus,
  allModels,
  existingModels,
  extraSelectedModels,
  redirectToPlayground,
}) => {
  const { namespace } = React.useContext(GenAiContext);

  const preSelectedModels = React.useMemo(() => {
    if (existingModels) {
      const existingModelsSet = new Set(existingModels.map((model) => model.id));
      const existingAIModels = allModels.filter((model) => existingModelsSet.has(model.model_name));

      if (extraSelectedModels) {
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

  const [selectedModels, setSelectedModels] = React.useState<AIModel[]>(preSelectedModels);

  const [configuringPlayground, setConfiguringPlayground] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [alertTitle, setAlertTitle] = React.useState<string>();

  const onSubmit = () => {
    if (selectedModels.length === 0) {
      setAlertTitle('Select at least one model');
      setError(
        new Error(
          'To set up a playground, you must add at least one model. Select a model above to proceed.',
        ),
      );
      return;
    }
    if (!namespace?.name) {
      setError(new Error('Namespace is required'));
      return;
    }

    const install = () => {
      installLSD(
        namespace.name,
        selectedModels.map((model) => model.model_name),
      )
        .then(() => {
          setConfiguringPlayground(true);
        })
        .catch((e) => {
          setError(e);
          setConfiguringPlayground(false);
        });
    };

    // If LSD status is provided, delete the existing LSD and install the new models
    if (lsdStatus) {
      deleteLSD(namespace.name, lsdStatus.name)
        .then(install)
        .catch((e) => {
          setError(e);
          setConfiguringPlayground(false);
        });
    } else {
      install();
    }
  };

  const onBeforeClose = (submitted: boolean) => {
    setConfiguringPlayground(false);
    setError(undefined);
    setAlertTitle(undefined);
    onClose(submitted);
  };

  return (
    <Modal isOpen onClose={() => onBeforeClose(false)} variant={ModalVariant.large}>
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
          <ChatbotConfigurationState redirectToPlayground={redirectToPlayground} />
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
            submitLabel={existingModels ? 'Update configuration' : 'Configure'}
            onSubmit={onSubmit}
            onCancel={() => onBeforeClose(false)}
            error={error}
            alertTitle={alertTitle || 'Error configuring playground'}
          />
        </ModalFooter>
      )}
    </Modal>
  );
};

export default ChatbotConfigurationModal;
