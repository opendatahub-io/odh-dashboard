import React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import type { K8sNameDescriptionFieldData, ProjectKind, SecretKind } from '@odh-dashboard/k8s-core';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import ConnectionTypeForm from '#~/concepts/connectionTypes/ConnectionTypeForm';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
  ConnectionTestStatus,
  ConnectionTestRequest,
  ConnectionTestResult,
} from '#~/concepts/connectionTypes/types';
import ConnectionTestStatusLabel from '#~/concepts/connectionTypes/ConnectionTestStatusLabel';
import { testConnection } from '#~/services/connectionTestService';
import {
  assembleConnectionSecret,
  filterEnabledConnectionTypes,
  getConnectionTypeRef,
  getDefaultValues,
  isConnectionTypeDataField,
  parseConnectionSecretValues,
  getConnectionProtocolType,
} from '#~/concepts/connectionTypes/utils';
import usePersistentData from './usePersistentData';

const buildFieldValues = (
  connectionValues: Record<string, ConnectionTypeValueType>,
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(connectionValues)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'boolean') {
      result[key] = String(value);
    } else if (typeof value === 'number') {
      result[key] = String(value);
    } else if (Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    }
  }
  return result;
};

type Props = {
  connection?: Connection;
  connectionTypes: ConnectionTypeConfigMapObj[];
  project: ProjectKind;
  onClose: (submitted?: boolean) => void;
  onSubmit: (connection: Connection) => Promise<SecretKind>;
  isEdit?: boolean;
};

export const ManageConnectionModal: React.FC<Props> = ({
  connection,
  connectionTypes,
  project,
  onClose,
  onSubmit,
  isEdit = false,
}) => {
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isModified, setIsModified] = React.useState(false);

  // -- Test connection state --
  const [testStatus, setTestStatus] = React.useState<ConnectionTestStatus>(
    ConnectionTestStatus.NOT_TESTED,
  );
  const [testResult, setTestResult] = React.useState<ConnectionTestResult | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const enabledConnectionTypes = React.useMemo(
    () => filterEnabledConnectionTypes(connectionTypes),
    [connectionTypes],
  );

  const connectionTypeSource = getConnectionTypeRef(connection);

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(() => {
    if (isEdit) {
      return connectionTypes.find((t) => t.metadata.name === connectionTypeSource);
    }
    if (enabledConnectionTypes.length === 1) {
      return enabledConnectionTypes[0];
    }
    return undefined;
  });

  const connectionTypeName = selectedConnectionType?.metadata.name || connectionTypeSource;

  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData({
    initialData: connection,
  });
  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(() => {
    if (isEdit) {
      if (connection) {
        return parseConnectionSecretValues(connection, selectedConnectionType);
      }
    } else if (selectedConnectionType) {
      return getDefaultValues(selectedConnectionType);
    }
    return {};
  });

  const [connectionErrors, setConnectionErrors] = React.useState<{
    [key: string]: boolean | string;
  }>({});
  const isFormValid = React.useMemo(
    () =>
      !!connectionTypeName &&
      isK8sNameDescriptionDataValid(nameDescData) &&
      !selectedConnectionType?.data?.fields?.find(
        (field) =>
          isConnectionTypeDataField(field) &&
          field.required &&
          !connectionValues[field.envVar] &&
          field.type !== ConnectionTypeFieldType.Boolean,
      ) &&
      !Object.values(connectionErrors).find((e) => !!e),
    [connectionTypeName, selectedConnectionType, nameDescData, connectionValues, connectionErrors],
  );
  const protocolType = selectedConnectionType
    ? getConnectionProtocolType(selectedConnectionType)
    : undefined;

  const { changeSelectionType } = usePersistentData({
    setConnectionValues,
    setConnectionErrors,
    setSelectedConnectionType,
    connectionValues,
    selectedConnectionType,
  });

  // -- Test connection handlers --

  const resetTestStatus = React.useCallback(() => {
    setTestStatus(ConnectionTestStatus.NOT_TESTED);
    setTestResult(null);
  }, []);

  const handleAbortTest = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleTestConnection = React.useCallback(() => {
    if (!connectionTypeName) {
      return;
    }

    // Abort any in-progress test
    handleAbortTest();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTestStatus(ConnectionTestStatus.TESTING);
    setTestResult(null);

    const request: ConnectionTestRequest = {
      connectionType: connectionTypeName,
      fieldValues: buildFieldValues(connectionValues),
    };

    testConnection(request, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setTestStatus(
            result.success ? ConnectionTestStatus.VERIFIED : ConnectionTestStatus.FAILED,
          );
          setTestResult(result);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        if (!controller.signal.aborted) {
          setTestStatus(ConnectionTestStatus.FAILED);
          setTestResult({
            success: false,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
  }, [connectionTypeName, connectionValues, handleAbortTest]);

  const handleClose = React.useCallback(
    (submitted?: boolean) => {
      handleAbortTest();
      onClose(submitted);
    },
    [handleAbortTest, onClose],
  );

  const handleSubmit = React.useCallback(() => {
    setIsSaving(true);
    setSubmitError(undefined);

    if (!connectionTypeName) {
      setSubmitError(new Error('No connection type selected'));
      setIsSaving(false);
      return;
    }

    const assembledConnection = assembleConnectionSecret(
      project.metadata.name,
      connectionTypeName,
      nameDescData,
      connectionValues,
    );
    assembledConnection.metadata.annotations = {
      ...assembledConnection.metadata.annotations,
      ...(protocolType && { 'opendatahub.io/connection-type-protocol': protocolType }),
    };

    onSubmit(assembledConnection)
      .then(() => {
        handleClose(true);
      })
      .catch((e) => {
        setSubmitError(e);
        setIsSaving(false);
      });
  }, [
    connectionTypeName,
    project.metadata.name,
    nameDescData,
    connectionValues,
    protocolType,
    onSubmit,
    handleClose,
  ]);

  const connectionTypeDisplayName =
    selectedConnectionType?.metadata.annotations?.['openshift.io/display-name'] ||
    connectionTypeName ||
    'connection';

  const isTesting = testStatus === ConnectionTestStatus.TESTING;

  return (
    <Modal
      isOpen
      onClose={() => {
        handleClose();
      }}
      variant="medium"
    >
      <ModalHeader
        title={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{isEdit ? 'Edit connection' : 'Create connection'}</FlexItem>
            <FlexItem>
              <ConnectionTestStatusLabel status={testStatus} />
            </FlexItem>
          </Flex>
        }
        description="Define a connection type and name to create your asset. Testing the connection to verify your credentials and registry host settings is completely optional and will not block you from saving."
      />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            {isEdit && (
              <Alert
                className="pf-v6-u-mb-lg"
                variant="warning"
                isInline
                title="Dependent resources require further action"
              >
                Connection changes are not applied to dependent resources until those resources are
                restarted, redeployed, or otherwise regenerated.
              </Alert>
            )}
            <Form>
              <ConnectionTypeForm
                options={!isEdit ? enabledConnectionTypes : undefined}
                connectionType={
                  selectedConnectionType || (isEdit ? connectionTypeSource : undefined)
                }
                setConnectionType={(name: string) => {
                  const obj = connectionTypes.find((c) => c.metadata.name === name);
                  if (!isModified) {
                    setIsModified(true);
                  }
                  changeSelectionType(obj);
                  resetTestStatus();
                }}
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
                  if (testStatus !== ConnectionTestStatus.NOT_TESTED) {
                    resetTestStatus();
                  }
                }}
                onValidate={(field, error) =>
                  setConnectionErrors((prev) => ({ ...prev, [field.envVar]: !!error }))
                }
              />
            </Form>
          </StackItem>

          {testStatus === ConnectionTestStatus.VERIFIED && testResult ? (
            <StackItem>
              <Alert
                data-testid="connection-test-success-alert"
                variant="success"
                isInline
                title="Connection successful"
              >
                The {connectionTypeDisplayName} is reachable.
              </Alert>
            </StackItem>
          ) : null}
          {testStatus === ConnectionTestStatus.FAILED && testResult ? (
            <StackItem>
              <Alert
                data-testid="connection-test-failure-alert"
                variant="danger"
                isInline
                isExpandable
                title="Connection failed"
              >
                {testResult.message}
              </Alert>
            </StackItem>
          ) : null}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Stack hasGutter className="pf-v6-u-flex-grow-1">
          {submitError ? (
            <StackItem>
              <Alert data-testid="error-message-alert" isInline variant="danger" title="">
                {submitError.message}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <ActionList>
              <ActionListGroup>
                <ActionListItem>
                  <Button
                    key="submit"
                    variant="primary"
                    isDisabled={!isFormValid || !isModified || isSaving}
                    onClick={handleSubmit}
                    isLoading={isSaving}
                    data-testid="modal-submit-button"
                  >
                    {isEdit ? 'Save' : 'Create'}
                  </Button>
                </ActionListItem>
                <ActionListItem>
                  <Button
                    key="test"
                    variant="secondary"
                    onClick={handleTestConnection}
                    isLoading={isTesting}
                    isDisabled={isTesting || !connectionTypeName}
                    data-testid="test-connection-button"
                  >
                    {isTesting ? 'Testing...' : 'Test connection'}
                  </Button>
                </ActionListItem>
                <ActionListItem>
                  <Button
                    key="cancel"
                    variant="link"
                    onClick={() => handleClose()}
                    data-testid="modal-cancel-button"
                  >
                    Cancel
                  </Button>
                </ActionListItem>
              </ActionListGroup>
            </ActionList>
          </StackItem>
        </Stack>
      </ModalFooter>
    </Modal>
  );
};
