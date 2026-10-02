/* eslint-disable camelcase */
import React from 'react';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  Alert,
  Content,
} from '@patternfly/react-core';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createVolume,
  createGenericTable,
  createLabel,
  isConflictError,
} from '~/app/api/dataRegistry';
import { CreateVolumeRequest, CreateGenericTableRequest, ConnectionRef } from '~/app/types';
import { useConnections } from '~/app/hooks/useConnections';
import { confirmConnection } from '~/app/utilities/connectionUtils';
import { isStructuredFormat, isUnstructuredFormat } from '~/app/utilities/formatUtils';
import { useDataRegistryTrackEvent } from '~/app/hooks/useDataRegistryTrackEvent';
import { DATA_REGISTRY_EVENT_NAMES, getRegistrationErrorCategory } from '~/app/utilities/tracking';
import {
  registerDataSchema,
  registerDataDefaults,
  RegisterDataFormData,
} from '~/app/schemas/registerData.schema';
import DataLocationSection from './register-data/DataLocationSection';
import PropertiesSection from './register-data/PropertiesSection';
import SchemaSection from './register-data/SchemaSection';
import {
  RegistrationAssetFormatSection,
  RegistrationIdentitySection,
  RegistrationOrganizationSection,
} from './register-data/RegistrationAssetSections';
import './register-data/RegistrationForm.scss';

type RegisterDataModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  collections: string[];
  onCreated: () => void;
  onManageCollections: () => void;
  onManageLabels?: () => void;
  hasExistingDchConnectionReferences?: boolean;
  hasExistingRhaiConnectionReferences?: boolean;
};

type SharedCreateAssetRequest = Omit<CreateVolumeRequest, 'format'> & { format: string };

const getValidLabels = (labels: string[]): string[] => [
  ...new Set(labels.map((label) => label.trim()).filter(Boolean)),
];

const buildSharedAssetRequest = (
  data: RegisterDataFormData,
  connectionRef?: ConnectionRef,
): SharedCreateAssetRequest => {
  const request: SharedCreateAssetRequest = {
    name: data.name.trim(),
    format: data.format,
  };
  if (data.description) {
    request.description = data.description;
  }
  if (data.path && data.path !== '/') {
    request.storage_location = data.path;
  }
  if (connectionRef) {
    request.connection_ref = connectionRef;
  }
  const labels = getValidLabels(data.labels);
  if (labels.length > 0) {
    request.labels = labels;
  }
  const properties: Record<string, string> = {};
  if (data.purpose) {
    request.purpose = data.purpose;
  }
  if (data.license) {
    request.license = data.license;
  }
  if (data.maturity) {
    request.maturity = data.maturity;
  }
  if (data.domain) {
    request.domain = data.domain;
  }
  if (data.piiStatus) {
    request.pii = data.piiStatus;
  }
  data.customProperties.forEach((prop) => {
    if (prop.key && prop.value) {
      properties[prop.key] = prop.value;
    }
  });
  if (Object.keys(properties).length > 0) {
    request.properties = properties;
  }
  return request;
};

const buildVolumeRequest = (
  data: RegisterDataFormData,
  connectionRef?: ConnectionRef,
): CreateVolumeRequest => {
  const format = isUnstructuredFormat(data.format) ? data.format : 'other';
  return { ...buildSharedAssetRequest(data, connectionRef), format };
};

const buildTableRequest = (
  data: RegisterDataFormData,
  connectionRef?: ConnectionRef,
): CreateGenericTableRequest => {
  const request: CreateGenericTableRequest = {
    ...buildSharedAssetRequest(data, connectionRef),
    format: isStructuredFormat(data.format) ? data.format : 'other',
  };

  const filteredFields = data.schemaFields
    .filter((col) => col.name && col.type)
    .map((col) => ({
      name: col.name,
      type: col.type,
      ...(col.description ? { description: col.description } : {}),
      nullable: col.nullable,
    }));
  if (filteredFields.length > 0) {
    request.schema_fields = filteredFields;
  }
  return request;
};

const RegisterDataModal: React.FC<RegisterDataModalProps> = ({
  isOpen,
  onClose,
  project,
  collections,
  onCreated,
  onManageCollections,
  onManageLabels,
  hasExistingDchConnectionReferences = false,
  hasExistingRhaiConnectionReferences = false,
}) => {
  const [
    connections,
    connectionsLoaded,
    connectionsError,
    refreshConnections,
    connectionWarnings,
    fetchedConnectionDisplayData,
  ] = useConnections(project, isOpen);
  const connectionDisplayData = fetchedConnectionDisplayData ?? connections;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const trackEvent = useDataRegistryTrackEvent();

  const form = useForm<RegisterDataFormData>({
    resolver: zodResolver(registerDataSchema),
    defaultValues: registerDataDefaults,
    mode: 'onBlur',
  });

  const resetAndClose = React.useCallback(() => {
    form.reset(registerDataDefaults);
    setIsSubmitting(false);
    setError('');
    onClose();
  }, [form, onClose]);

  const handleClose = React.useCallback(() => {
    if (isSubmitting) {
      return;
    }
    trackEvent({
      eventName: DATA_REGISTRY_EVENT_NAMES.registrationCanceled,
      properties: { cancelMethod: 'close_x', project },
    });
    resetAndClose();
  }, [isSubmitting, project, resetAndClose, trackEvent]);

  const handleCancel = React.useCallback(() => {
    if (isSubmitting) {
      return;
    }
    trackEvent({
      eventName: DATA_REGISTRY_EVENT_NAMES.registrationCanceled,
      properties: { cancelMethod: 'cancel_button', project },
    });
    resetAndClose();
  }, [isSubmitting, project, resetAndClose, trackEvent]);

  const handleSubmit = React.useCallback(
    async (data: RegisterDataFormData) => {
      setIsSubmitting(true);
      setError('');
      try {
        const connectionRef = data.connection
          ? await confirmConnection(data.connection, refreshConnections)
          : undefined;
        const labels = getValidLabels(data.labels);
        if (labels.length > 0) {
          await Promise.all(
            labels.map((label) =>
              createLabel(project, { name: label }).catch((err) => {
                if (isConflictError(err)) {
                  return;
                }
                throw err;
              }),
            ),
          );
        }
        if (data.assetType === 'unstructured') {
          await createVolume(project, data.collection, buildVolumeRequest(data, connectionRef));
        } else {
          await createGenericTable(
            project,
            data.collection,
            buildTableRequest(data, connectionRef),
          );
        }
        trackEvent({
          eventName: DATA_REGISTRY_EVENT_NAMES.registered,
          properties: {
            success: true,
            assetType: data.assetType,
            format: data.format,
            hasConnection: Boolean(data.connection),
            hasCollection: Boolean(data.collection),
            labelCount: labels.length,
            project,
          },
        });
        form.reset(registerDataDefaults);
        onCreated();
        onClose();
      } catch (err) {
        trackEvent({
          eventName: DATA_REGISTRY_EVENT_NAMES.registered,
          properties: {
            success: false,
            assetType: data.assetType,
            format: data.format,
            hasConnection: Boolean(data.connection),
            hasCollection: Boolean(data.collection),
            labelCount: getValidLabels(data.labels).length,
            project,
            error: getRegistrationErrorCategory(err),
          },
        });
        setError(err instanceof Error ? err.message : 'Failed to register data asset');
      } finally {
        setIsSubmitting(false);
      }
    },
    [project, form, onCreated, onClose, refreshConnections, trackEvent],
  );

  const assetType = form.watch('assetType');

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : handleClose}
      variant="medium"
      data-testid="register-data-modal"
    >
      <ModalHeader
        title="Create data asset"
        description={
          <Content component="p">
            A data asset is a metadata record that helps users discover and understand external
            data. It stores information like location, format, and schema, but not the data itself.
          </Content>
        }
      />
      <ModalBody>
        {error ? (
          <Alert variant="danger" isInline title="Error registering data asset">
            {error}
          </Alert>
        ) : null}
        <FormProvider {...form}>
          <Form className="odh-data-registry-registration-form">
            <RegistrationIdentitySection />
            <DataLocationSection
              project={project}
              connections={connections}
              connectionDisplayData={connectionDisplayData}
              connectionsLoaded={connectionsLoaded}
              connectionsError={connectionsError}
              connectionWarnings={connectionWarnings}
              showDchFallbackWarning={hasExistingDchConnectionReferences}
              showRhaiLookupWarning={hasExistingRhaiConnectionReferences}
              isConnectionDisabled={isSubmitting}
            />
            <RegistrationAssetFormatSection project={project} />
            {assetType === 'structured' ? <SchemaSection /> : null}
            <RegistrationOrganizationSection
              project={project}
              collections={collections}
              onManageCollections={onManageCollections}
              onManageLabels={onManageLabels}
            />
            <PropertiesSection />
          </Form>
        </FormProvider>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Register"
          onSubmit={form.handleSubmit(handleSubmit)}
          onCancel={handleCancel}
          isSubmitDisabled={isSubmitting}
          isSubmitLoading={isSubmitting}
          isCancelDisabled={isSubmitting}
          submitButtonTestId="register-data-submit"
        />
      </ModalFooter>
    </Modal>
  );
};

export default RegisterDataModal;
