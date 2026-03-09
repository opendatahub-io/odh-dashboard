import * as React from 'react';
import {
  Alert,
  Button,
  Spinner,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { OdhApplication } from '#~/types';
import { EnableApplicationStatus, useEnableApplication } from '#~/utilities/useEnableApplication';
import { useNIMAccountConfig } from '#~/pages/modelServing/screens/projects/nim/useNIMAccountConfig';
import EnableModal from '#~/pages/exploreApplication/EnableModal';

type NIMEnableModalProps = {
  selectedApp: OdhApplication;
  onClose: () => void;
};

const NIMEnableModal: React.FC<NIMEnableModalProps> = ({ selectedApp, onClose }) => {
  const accountConfig = useNIMAccountConfig();

  if (accountConfig.loading) {
    return null;
  }

  if (!accountConfig.isAirGapped) {
    return <EnableModal selectedApp={selectedApp} onClose={onClose} />;
  }

  return <NIMEnableModalAirGapped selectedApp={selectedApp} onClose={onClose} />;
};

const NIMEnableModalAirGapped: React.FC<NIMEnableModalProps> = ({ selectedApp, onClose }) => {
  const [postError, setPostError] = React.useState('');
  const [validationInProgress, setValidationInProgress] = React.useState(false);
  const [enableValues, setEnableValues] = React.useState<{ [key: string]: string }>({});

  const [validationStatus, validationErrorMessage] = useEnableApplication(
    validationInProgress,
    selectedApp.metadata.name,
    selectedApp.spec.displayName,
    enableValues,
    selectedApp.spec.internalRoute,
  );

  const { enable } = selectedApp.spec;

  const onDoEnableApp = () => {
    setPostError('');

    if (enable?.variables) {
      const dummyValues: { [key: string]: string } = {};
      Object.keys(enable.variables).forEach((key) => {
        dummyValues[key] = 'air-gapped-placeholder-key';
      });
      setEnableValues(dummyValues);
    }

    setValidationInProgress(true);
  };

  const handleClose = React.useCallback(() => {
    setEnableValues({});
    setPostError('');
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (validationInProgress && validationStatus === EnableApplicationStatus.SUCCESS) {
      setValidationInProgress(false);
      // TODO: Disable rule below temporarily. Refactor to notify the owner and avoid modifying the object directly.
      /* eslint-disable no-param-reassign */
      selectedApp.spec.isEnabled = true;
      selectedApp.spec.shownOnEnabledPage = true;
      /* eslint-enable no-param-reassign */
      handleClose();
    }
    if (validationInProgress && validationStatus === EnableApplicationStatus.FAILED) {
      setValidationInProgress(false);
      setPostError(validationErrorMessage);
    }
  }, [
    handleClose,
    selectedApp.spec,
    validationErrorMessage,
    validationInProgress,
    validationStatus,
  ]);

  return (
    <Modal
      aria-label={`Enable ${selectedApp.spec.displayName}`}
      className="odh-enable-modal"
      data-id="enable-modal"
      variant="small"
      isOpen
      onClose={handleClose}
    >
      <ModalHeader title={`Enable ${selectedApp.spec.displayName}`} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert
              variant="info"
              isInline
              title="Air-Gapped Configuration Detected"
              data-testid="air-gapped-info-alert"
            >
              <p>NGC credentials are not required in air-gapped mode.</p>
              <p>
                The system will automatically configure model serving to use your internal registry.
              </p>
            </Alert>
          </StackItem>
          <StackItem>
            <p>Click Enable to activate NIM model serving.</p>
          </StackItem>
          <StackItem>
            <p style={{ fontSize: 'var(--pf-v6-global--FontSize--sm)' }}>
              Contact your cluster administrator if you need to modify air-gapped settings.
            </p>
          </StackItem>
          {validationInProgress ? (
            <StackItem>
              <Alert
                className="m-no-alert-icon"
                variantLabel="information"
                variant="info"
                title={
                  <div className="odh-enable-modal__progress-title">
                    <Spinner size="md" />
                    <div>Configuring NIM model serving for air-gapped environment</div>
                  </div>
                }
                aria-live="polite"
                isInline
              />
            </StackItem>
          ) : null}
          {postError ? (
            <StackItem>
              <Alert
                variantLabel="error"
                variant="danger"
                title="Enablement failed"
                aria-live="polite"
                isInline
              >
                {postError}
              </Alert>
            </StackItem>
          ) : null}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="enable-app-submit"
          key="confirm"
          variant="primary"
          onClick={onDoEnableApp}
          isDisabled={validationInProgress}
        >
          Enable NIM
        </Button>
        <Button key="cancel" variant="link" onClick={handleClose}>
          {validationInProgress ? 'Close' : 'Cancel'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default NIMEnableModal;
