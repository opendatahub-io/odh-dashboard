import React from 'react';
import { Alert, Form, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
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
import './ConnectionModal.scss';

const S3_REQUIRED_ENV_VARS = ['AWS_DEFAULT_REGION', 'AWS_S3_BUCKET'];

export type ConnectionModalOutcome = {
  outcome: 'submit' | 'cancel';
  success?: boolean;
};

export type ConnectionModalProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  project: string;
  onClose: (submitted?: boolean) => void;
  onSubmit: (connection: Connection) => void | Promise<void>;
  onOutcome: (outcome: ConnectionModalOutcome) => void;
  getCreateError: (error: unknown) => Error;
  getSubmitError: (error: unknown) => Error;
  retryAlertTitle?: string;
};

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  connectionTypes,
  project,
  onClose,
  onSubmit,
  onOutcome,
  getCreateError,
  getSubmitError,
  retryAlertTitle,
}) => {
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isModified, setIsModified] = React.useState(false);
  const submittingRef = React.useRef(false);
  const createdConnectionRef = React.useRef<Connection>();
  const hasReportedOutcomeRef = React.useRef(false);

  const enabledConnectionTypes = React.useMemo(() => {
    const filtered = filterEnabledConnectionTypes(connectionTypes);
    return filtered.map((ct) =>
      getConnectionProtocolType(ct) === 's3'
        ? withRequiredFields(ct, S3_REQUIRED_ENV_VARS) ?? ct
        : ct,
    );
  }, [connectionTypes]);

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(() => (enabledConnectionTypes.length === 1 ? enabledConnectionTypes[0] : undefined));
  const connectionTypeName = selectedConnectionType?.metadata.name;
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(() => (selectedConnectionType ? getDefaultValues(selectedConnectionType) : {}));
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
      return (
        value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
        (field.type === ConnectionTypeFieldType.Dropdown &&
          Array.isArray(value) &&
          value.length === 0)
      );
    });
    return (
      !!connectionTypeName &&
      isK8sNameDescriptionDataValid(nameDescData) &&
      !hasMissingRequiredField &&
      !Object.values(connectionErrors).find((error) => !!error)
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
  const isLockedForRetry = !!createdConnectionRef.current;

  const handleClose = React.useCallback(() => {
    if (submittingRef.current) {
      return;
    }
    if (!hasReportedOutcomeRef.current) {
      onOutcome({ outcome: 'cancel' });
    }
    onClose();
  }, [onClose, onOutcome]);

  const handleSubmit = async (): Promise<void> => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setIsSaving(true);
    setSubmitError(undefined);

    if (!connectionTypeName) {
      setSubmitError(new Error('No connection type selected'));
      submittingRef.current = false;
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

    let connectionToSubmit = createdConnectionRef.current;
    if (!connectionToSubmit) {
      try {
        await createSecret(assembledConnection);
      } catch (error) {
        hasReportedOutcomeRef.current = true;
        setSubmitError(getCreateError(error));
        onOutcome({ outcome: 'submit', success: false });
        submittingRef.current = false;
        setIsSaving(false);
        return;
      }
      createdConnectionRef.current = assembledConnection;
      hasReportedOutcomeRef.current = true;
      onOutcome({ outcome: 'submit', success: true });
      connectionToSubmit = assembledConnection;
    }

    try {
      await onSubmit(connectionToSubmit);
      onClose(true);
    } catch (error) {
      setSubmitError(getSubmitError(error));
      submittingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleConnectionTypeChange = (name: string) => {
    if (name === selectedConnectionType?.metadata.name) {
      return;
    }
    const obj = enabledConnectionTypes.find(
      (connectionType) => connectionType.metadata.name === name,
    );
    setIsModified(true);
    setSelectedConnectionType(obj);
    setConnectionErrors({});
    setConnectionValues(obj ? getDefaultValues(obj) : {});
  };

  return (
    <Modal isOpen onClose={handleClose} variant="medium">
      <ModalHeader title="Add a connection" />
      <ModalBody>
        {isLockedForRetry && retryAlertTitle ? (
          <Alert
            variant="info"
            isInline
            isPlain
            title={retryAlertTitle}
            data-testid="connection-locked-for-retry-alert"
          />
        ) : null}
        <Form>
          <fieldset
            disabled={isLockedForRetry}
            className="autox-connection-modal__fieldset"
            data-testid="connection-form-fieldset"
          >
            <ConnectionTypeForm
              options={enabledConnectionTypes}
              connectionType={selectedConnectionType}
              setConnectionType={handleConnectionTypeChange}
              connectionNameDesc={nameDescData}
              setConnectionNameDesc={(key: keyof K8sNameDescriptionFieldData, value: string) => {
                setIsModified(true);
                setNameDescData(key, value);
              }}
              connectionValues={connectionValues}
              onChange={(field, value) => {
                setIsModified(true);
                setConnectionValues((previous) => ({ ...previous, [field.envVar]: value }));
              }}
              onValidate={(field, error) =>
                setConnectionErrors((previous) => ({ ...previous, [field.envVar]: !!error }))
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
          onSubmit={() => void handleSubmit()}
          error={submitError}
          isSubmitDisabled={!isFormValid || !isModified || isSaving}
          isSubmitLoading={isSaving}
          alertTitle=""
        />
      </ModalFooter>
    </Modal>
  );
};

export default ConnectionModal;
