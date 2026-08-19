import React from 'react';
import { Alert, Form, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import './AutoragConnectionModal.scss';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import ConnectionTypeForm from '@odh-dashboard/internal/concepts/connectionTypes/ConnectionTypeForm';
import {
  ConnectionTypeFieldType,
  isK8sNameDescriptionDataValid,
  assembleConnectionSecret,
  filterEnabledConnectionTypes,
  getConnectionProtocolType,
  getDefaultValues,
  isConnectionTypeDataField,
  withRequiredFields,
} from '@odh-dashboard/k8s-core';
import type {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
  K8sNameDescriptionFieldData,
} from '@odh-dashboard/k8s-core';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { createSecret } from '@odh-dashboard/internal/api/k8s/secrets';
import {
  AUTORAG_FAILURE_CATEGORY,
  fireAutoragS3ConnectionCreated,
  TrackingOutcome,
} from '~/app/utilities/tracking';

const S3_REQUIRED_ENV_VARS = ['AWS_DEFAULT_REGION', 'AWS_S3_BUCKET'];

type Props = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  project: string;
  onClose: (submitted?: boolean) => void;
  onSubmit: (connection: Connection) => void | Promise<void>;
};

const AutoragConnectionModal: React.FC<Props> = ({
  connectionTypes,
  project,
  onClose,
  onSubmit,
}) => {
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isModified, setIsModified] = React.useState(false);

  const enabledConnectionTypes = React.useMemo(() => {
    const filtered = filterEnabledConnectionTypes(connectionTypes);
    return filtered.map((ct) =>
      getConnectionProtocolType(ct) === 's3'
        ? (withRequiredFields(ct, S3_REQUIRED_ENV_VARS) ?? ct)
        : ct,
    );
  }, [connectionTypes]);

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(() => {
    if (enabledConnectionTypes.length === 1) {
      return enabledConnectionTypes[0];
    }
    return undefined;
  });

  const connectionTypeName = selectedConnectionType?.metadata.name;

  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();

  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(() => {
    if (selectedConnectionType) {
      return getDefaultValues(selectedConnectionType);
    }
    return {};
  });

  const [connectionErrors, setConnectionErrors] = React.useState<{
    [key: string]: boolean | string;
  }>({});

  const isFormValid = React.useMemo(() => {
    const hasMissingRequiredField = selectedConnectionType?.data?.fields?.find((field) => {
      if (
        !isConnectionTypeDataField(field) ||
        !field.required ||
        field.type === ConnectionTypeFieldType.Boolean
      ) {
        return false;
      }
      const value = connectionValues[field.envVar];
      if (value === undefined || (typeof value === 'string' && value.trim() === '')) {
        return true;
      }
      if (
        field.type === ConnectionTypeFieldType.Dropdown &&
        Array.isArray(value) &&
        value.length === 0
      ) {
        return true;
      }
      return false;
    });
    return (
      !!connectionTypeName &&
      isK8sNameDescriptionDataValid(nameDescData) &&
      !hasMissingRequiredField &&
      !Object.values(connectionErrors).find((e) => !!e)
    );
  }, [
    connectionTypeName,
    selectedConnectionType,
    nameDescData,
    connectionValues,
    connectionErrors,
  ]);

  const protocolType = selectedConnectionType
    ? getConnectionProtocolType(selectedConnectionType)
    : undefined;

  // Holds the Connection object once createSecret has actually succeeded, so a later retry
  // (after an onSubmit failure) can skip re-creating the already-existing Secret and simply
  // retry onSubmit with the same connection.
  const createdConnectionRef = React.useRef<Connection>();

  // Tracks whether a creation outcome (success OR failure) has already been reported for this
  // modal instance, so a later close/cancel doesn't emit a conflicting cancel event once that
  // outcome has already been reported.
  const hasReportedOutcomeRef = React.useRef(false);

  const handleClose = React.useCallback(() => {
    // Block close requests (Escape, X button, Cancel button) while creation is in flight — the
    // Secret may already exist by the time this resolves, so closing now would leave the parent
    // unaware and could still race with the in-flight submit's own onClose(true) call.
    if (isSaving) {
      return;
    }
    if (!hasReportedOutcomeRef.current) {
      fireAutoragS3ConnectionCreated({ outcome: TrackingOutcome.cancel });
    }
    onClose();
  }, [isSaving, onClose]);

  const handleConnectionTypeChange = (name: string) => {
    if (name === selectedConnectionType?.metadata.name) {
      return;
    }

    const obj = enabledConnectionTypes.find((c) => c.metadata.name === name);
    if (!isModified) {
      setIsModified(true);
    }
    setSelectedConnectionType(obj);
    setConnectionErrors({});
    setConnectionValues(obj ? getDefaultValues(obj) : {});
  };

  // Once the Secret has actually been created, the fields must be locked: assembleConnectionSecret
  // captures a snapshot at submit time, and a retry after an onSubmit failure intentionally reuses
  // that already-created connection (see the `submit` callback below) rather than re-creating the
  // Secret. Leaving fields editable here would let a user change values that silently never reach
  // the Secret or the retried onSubmit call.
  const isLockedForRetry = !!createdConnectionRef.current;

  return (
    <Modal isOpen onClose={handleClose} variant="medium">
      <ModalHeader title="Add a connection" />
      <ModalBody>
        {isLockedForRetry && (
          <Alert
            variant="info"
            isInline
            isPlain
            title="This connection was created. Retry saving it, or cancel to discard it."
            data-testid="connection-locked-for-retry-alert"
          />
        )}
        <Form>
          <fieldset
            disabled={isLockedForRetry}
            className="autorag-connection-modal__fieldset"
            data-testid="connection-form-fieldset"
          >
            <ConnectionTypeForm
              options={enabledConnectionTypes}
              connectionType={selectedConnectionType}
              setConnectionType={handleConnectionTypeChange}
              connectionNameDesc={nameDescData}
              setConnectionNameDesc={(key: keyof K8sNameDescriptionFieldData, value: string) => {
                if (!isModified) {
                  setIsModified(true);
                }
                setNameDescData(key, value);
              }}
              connectionValues={connectionValues}
              onChange={(field, value) => {
                if (!isModified) {
                  setIsModified(true);
                }
                setConnectionValues((prev) => ({ ...prev, [field.envVar]: value }));
              }}
              onValidate={(field, error) =>
                setConnectionErrors((prev) => ({ ...prev, [field.envVar]: !!error }))
              }
              connectionErrors={connectionErrors}
            />
          </fieldset>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Add connection"
          onCancel={handleClose}
          onSubmit={() => {
            setIsSaving(true);
            setSubmitError(undefined);

            if (!connectionTypeName) {
              setSubmitError(new Error('No connection type selected'));
              setIsSaving(false);
              return;
            }

            const assembledConnection = assembleConnectionSecret(
              project,
              connectionTypeName,
              nameDescData,
              connectionValues,
            );
            assembledConnection.metadata.annotations = {
              ...assembledConnection.metadata.annotations,
              ...(protocolType && { 'opendatahub.io/connection-type-protocol': protocolType }),
            };

            const submit = async () => {
              // If a previous attempt already created the Secret (and only onSubmit failed),
              // don't re-create it on retry — reuse the already-created connection instead.
              let connectionToSubmit = createdConnectionRef.current;

              if (!connectionToSubmit) {
                try {
                  await createSecret(assembledConnection);
                } catch {
                  // Secret creation itself failed — the resource does not exist. Mark the
                  // outcome as reported so a later close/cancel doesn't emit a conflicting
                  // cancel event, but don't surface the raw error to the user — it may
                  // contain credentials or internal endpoint details from the backend.
                  hasReportedOutcomeRef.current = true;
                  setSubmitError(
                    new Error(
                      'Failed to create the S3 connection. Please check your connection details and try again.',
                    ),
                  );
                  setIsSaving(false);
                  fireAutoragS3ConnectionCreated({
                    outcome: TrackingOutcome.submit,
                    success: false,
                    error: AUTORAG_FAILURE_CATEGORY,
                  });
                  return;
                }

                // The Secret now exists — report that outcome immediately, independent of
                // whatever onSubmit does next, so a later onSubmit failure can't overwrite it.
                // Also remember the created connection and mark creation as complete so a
                // later retry doesn't re-create the Secret and a later close/cancel doesn't
                // emit a conflicting cancel event for the same creation attempt.
                createdConnectionRef.current = assembledConnection;
                hasReportedOutcomeRef.current = true;
                fireAutoragS3ConnectionCreated({
                  outcome: TrackingOutcome.submit,
                  success: true,
                });
                connectionToSubmit = assembledConnection;
              }

              try {
                await onSubmit(connectionToSubmit);
                onClose(true);
              } catch {
                // The Secret was already created successfully, so this is not a creation
                // failure. Surface it to the user, but don't emit a false S3_CONNECTION_CREATED.
                // Don't render the raw error — onSubmit is caller-supplied and its failure
                // could originate from a backend/proxy response we can't guarantee is safe
                // to display verbatim.
                setSubmitError(
                  new Error(
                    'The connection was created, but AutoRAG could not select it. Retry saving it.',
                  ),
                );
                setIsSaving(false);
              }
            };

            void submit();
          }}
          error={submitError}
          isSubmitDisabled={!isFormValid || !isModified || isSaving}
          isSubmitLoading={isSaving}
          alertTitle=""
        />
      </ModalFooter>
    </Modal>
  );
};

export default AutoragConnectionModal;
