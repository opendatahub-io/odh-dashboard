import React from 'react';
import { Form, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
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
  AUTOML_FAILURE_CATEGORY,
  fireAutomlS3ConnectionCreated,
  TrackingOutcome,
} from '~/app/utilities/tracking';

const S3_REQUIRED_ENV_VARS = ['AWS_DEFAULT_REGION', 'AWS_S3_BUCKET'];

type Props = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  project: string;
  onClose: (submitted?: boolean) => void;
  onSubmit: (connection: Connection) => void | Promise<void>;
};

const AutomlConnectionModal: React.FC<Props> = ({
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

  React.useEffect(() => {
    if (selectedConnectionType === undefined && enabledConnectionTypes.length === 1) {
      const connectionType = enabledConnectionTypes[0];
      setSelectedConnectionType(connectionType);
      setConnectionValues(getDefaultValues(connectionType));
    }
  }, [enabledConnectionTypes, selectedConnectionType]);

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

  // Tracks whether createSecret has already resolved for this modal instance, so a later
  // close/cancel doesn't emit a conflicting cancel event once a success (or failure) outcome
  // has already been reported for the creation attempt.
  const hasCreatedSecretRef = React.useRef(false);

  const handleClose = React.useCallback(() => {
    // Block close requests (Escape, X button, Cancel button) while creation is in flight —
    // the Secret may already exist by the time this resolves, so closing now would leave the
    // parent unaware and could still race with the in-flight submit's own onClose(true) call.
    if (isSaving) {
      return;
    }
    if (!hasCreatedSecretRef.current) {
      fireAutomlS3ConnectionCreated({ outcome: TrackingOutcome.cancel });
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

  return (
    <Modal isOpen onClose={handleClose} variant="medium">
      <ModalHeader title="Add a connection" />
      <ModalBody>
        <Form>
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
              try {
                await createSecret(assembledConnection);
              } catch (e) {
                // Secret creation itself failed — the resource does not exist.
                setSubmitError(e instanceof Error ? e : new Error(String(e)));
                setIsSaving(false);
                fireAutomlS3ConnectionCreated({
                  outcome: TrackingOutcome.submit,
                  success: false,
                  error: AUTOML_FAILURE_CATEGORY,
                });
                return;
              }

              // The Secret now exists — report that outcome immediately, independent of
              // whatever onSubmit does next, so a later onSubmit failure can't overwrite it.
              // Also mark creation as complete so a later close/cancel doesn't emit a
              // conflicting cancel event for the same creation attempt.
              hasCreatedSecretRef.current = true;
              fireAutomlS3ConnectionCreated({ outcome: TrackingOutcome.submit, success: true });

              try {
                await onSubmit(assembledConnection);
                onClose(true);
              } catch (e) {
                // The Secret was already created successfully, so this is not a creation
                // failure. Surface it to the user, but don't emit a false S3_CONNECTION_CREATED.
                setSubmitError(e instanceof Error ? e : new Error(String(e)));
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

export default AutomlConnectionModal;
