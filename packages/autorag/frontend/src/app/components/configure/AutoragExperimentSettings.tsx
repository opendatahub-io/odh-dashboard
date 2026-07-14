import {
  Alert,
  AlertActionCloseButton,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Link } from 'react-router';
import { ConfigureSchema, EXPERIMENT_SETTINGS_FIELDS } from '~/app/schemas/configure.schema';
import AutoragExperimentSettingsModelSelection from './AutoragExperimentSettingsModelSelection';

const MODEL_CATALOG_LANGUAGE_ALERT_DISMISSED_KEY = 'autorag-model-catalog-language-alert-dismissed';

const isModelCatalogAlertDismissed = (): boolean => {
  try {
    return localStorage.getItem(MODEL_CATALOG_LANGUAGE_ALERT_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
};

type AutoragExperimentSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  revertChanges: () => void;
};

const AutoragExperimentSettings: React.FC<AutoragExperimentSettingsProps> = ({
  isOpen,
  onClose,
  revertChanges,
}) => {
  const {
    formState: { isDirty, errors },
  } = useFormContext<ConfigureSchema>();

  const [isModelCatalogAlertVisible, setIsModelCatalogAlertVisible] = React.useState(
    () => !isModelCatalogAlertDismissed(),
  );

  const dismissModelCatalogAlert = React.useCallback(() => {
    setIsModelCatalogAlertVisible(false);
    try {
      localStorage.setItem(MODEL_CATALOG_LANGUAGE_ALERT_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors (e.g. private browsing).
    }
  }, []);

  const hasFieldErrors = EXPERIMENT_SETTINGS_FIELDS.some((field) => errors[field]);
  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => {
        revertChanges();
        onClose();
      }}
      data-testid="experiment-settings-modal"
    >
      <ModalHeader title="Model configuration" />
      <ModalBody>
        <Stack hasGutter>
          {isModelCatalogAlertVisible && (
            <StackItem>
              <Alert
                variant="info"
                isInline
                title="Model language support"
                actionClose={
                  <AlertActionCloseButton
                    onClose={dismissModelCatalogAlert}
                    data-testid="model-catalog-language-alert-dismiss"
                  />
                }
                data-testid="model-catalog-language-alert"
              >
                To verify model details, including language support, view the models in the{' '}
                <Button
                  variant="link"
                  isInline
                  data-testid="model-catalog-language-alert-link"
                  component={(props) => <Link {...props} to="/modelCatalog" />}
                >
                  Model catalog
                </Button>
                .
              </Alert>
            </StackItem>
          )}
          <StackItem>
            <AutoragExperimentSettingsModelSelection />
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={onClose}
          isDisabled={!isDirty || hasFieldErrors}
          data-testid="experiment-settings-save"
        >
          Save
        </Button>
        <Button
          variant="link"
          onClick={() => {
            revertChanges();
            onClose();
          }}
          data-testid="experiment-settings-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AutoragExperimentSettings;
