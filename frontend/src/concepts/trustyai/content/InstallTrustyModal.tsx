import * as React from 'react';
import { Form, Radio, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import TrustyDBSecretFields from '#~/concepts/trustyai/content/TrustyDBSecretFields';
import useTrustyInstallModalData, {
  TrustyInstallModalFormType,
} from '#~/concepts/trustyai/content/useTrustyInstallModalData';
import { UseManageTrustyAICRReturnType } from '#~/concepts/trustyai/useManageTrustyAICR';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import TrustyDBExistingSecretField from '#~/concepts/trustyai/content/TrustyDBExistingSecretField';
import { TRUSTYAI_INSTALL_MODAL_TEST_ID } from '#~/concepts/trustyai/const';

type InstallTrustyModalProps = {
  onClose: () => void;
  namespace: string;
  onInstallExistingDB: UseManageTrustyAICRReturnType['installCRForExistingDB'];
  onInstallNewDB: UseManageTrustyAICRReturnType['installCRForNewDB'];
};

const InstallTrustyModal: React.FC<InstallTrustyModalProps> = ({
  onClose,
  namespace,
  onInstallNewDB,
  onInstallExistingDB,
}) => {
  const [submitting, setSubmitting] = React.useState(false);
  const [installError, setInstallError] = React.useState<Error | undefined>();
  const formData = useTrustyInstallModalData(namespace);

  return (
    <Modal isOpen variant="medium" onClose={onClose}>
      <ModalHeader title="Configure TrustyAI service" />
      <ModalBody>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Radio
            id="existing"
            data-testid={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-radio-existing`}
            label={
              <>
                Specify an existing secret{' '}
                <FieldGroupHelpLabelIcon content="Provide the name of an existing Kubernetes secret within your project." />
              </>
            }
            name="secret-value"
            isChecked={formData.type === TrustyInstallModalFormType.EXISTING}
            onChange={() => formData.onModeChange(TrustyInstallModalFormType.EXISTING)}
            body={
              formData.type === TrustyInstallModalFormType.EXISTING && (
                <TrustyDBExistingSecretField formData={formData} />
              )
            }
          />
          <Radio
            id="new"
            data-testid={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-radio-new`}
            label={
              <>
                Create a new secret{' '}
                <FieldGroupHelpLabelIcon content="Consult the product documentation for more information on these fields." />
              </>
            }
            name="secret-value"
            isChecked={formData.type === TrustyInstallModalFormType.NEW}
            onChange={() => formData.onModeChange(TrustyInstallModalFormType.NEW)}
            body={
              formData.type === TrustyInstallModalFormType.NEW && (
                <TrustyDBSecretFields data={formData.data} onDataChange={formData.onDataChange} />
              )
            }
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={() => {
            let promise: Promise<void>;
            if (formData.type === TrustyInstallModalFormType.EXISTING) {
              promise = onInstallExistingDB(formData.data);
            } else {
              promise = onInstallNewDB(formData.data);
            }
            setSubmitting(true);
            setInstallError(undefined);
            promise
              .then(() => {
                onClose();
              })
              .catch((e) => {
                setInstallError(e);
              })
              .finally(() => {
                setSubmitting(false);
              });
          }}
          submitLabel="Configure"
          isSubmitLoading={submitting}
          isSubmitDisabled={!formData.canSubmit || submitting}
          error={installError}
          alertTitle="Install error"
        />
      </ModalFooter>
    </Modal>
  );
};

export default InstallTrustyModal;
