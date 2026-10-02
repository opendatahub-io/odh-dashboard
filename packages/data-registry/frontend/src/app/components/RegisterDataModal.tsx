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
import {
  CreateVolumeRequest,
  CreateGenericTableRequest,
  ConnectionModel,
  ConnectionRef,
  UnstructuredFormat,
  StructuredFormat,
} from '~/app/types';
import { useConnections } from '~/app/hooks/useConnections';
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
};

const getConnectionRef = (
  connection: string,
  connections: ConnectionModel[],
): ConnectionRef | undefined => {
  if (!connection) {
    return undefined;
  }
  const selectedConnection = connections.find((c) => c.name === connection);
  const isDch = selectedConnection?.connectionType?.toLowerCase() === 'dch';
  return isDch ? { type: 'dch', id: connection } : { type: 'rhai', secret_name: connection };
};

type SharedCreateAssetRequest = Omit<CreateVolumeRequest, 'format'> & { format: string };

const UNSTRUCTURED_FORMAT_VALUES: UnstructuredFormat[] = [
  'documents',
  'images',
  'audio',
  'video',
  'binary',
  'other',
];

const STRUCTURED_FORMAT_VALUES: StructuredFormat[] = [
  'iceberg',
  'parquet',
  'csv',
  'delta',
  'postgresql',
  'milvus',
  'other',
];

const isUnstructuredFormat = (format: string): format is UnstructuredFormat =>
  UNSTRUCTURED_FORMAT_VALUES.some((value) => value === format);

const isStructuredFormat = (format: string): format is StructuredFormat =>
  STRUCTURED_FORMAT_VALUES.some((value) => value === format);

const getValidLabels = (labels: string[]): string[] => [
  ...new Set(labels.map((label) => label.trim()).filter(Boolean)),
];

const buildSharedAssetRequest = (
  data: RegisterDataFormData,
  connections: ConnectionModel[],
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
  if (data.connection) {
    request.connection_ref = getConnectionRef(data.connection, connections);
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
  connections: ConnectionModel[],
): CreateVolumeRequest => {
  const format = isUnstructuredFormat(data.format) ? data.format : 'other';
  return { ...buildSharedAssetRequest(data, connections), format };
};

const buildTableRequest = (
  data: RegisterDataFormData,
  connections: ConnectionModel[],
): CreateGenericTableRequest => {
  const request: CreateGenericTableRequest = {
    ...buildSharedAssetRequest(data, connections),
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
}) => {
  const [connections, connectionsLoaded, connectionsError] = useConnections(project);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

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
    resetAndClose();
  }, [resetAndClose]);

  const handleSubmit = React.useCallback(
    async (data: RegisterDataFormData) => {
      setIsSubmitting(true);
      setError('');
      try {
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
          await createVolume(project, data.collection, buildVolumeRequest(data, connections));
        } else {
          await createGenericTable(project, data.collection, buildTableRequest(data, connections));
        }
        form.reset(registerDataDefaults);
        onCreated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to register data asset');
      } finally {
        setIsSubmitting(false);
      }
    },
    [project, form, onCreated, onClose, connections],
  );

  const assetType = form.watch('assetType');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="medium" data-testid="register-data-modal">
      <ModalHeader
        title="Create data asset"
        description={
          <Content component="p">
            A data asset points to the exact location within a connection where the information is
            located. It can also record information about the structure of the data.
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
              connections={connections}
              connectionsLoaded={connectionsLoaded}
              connectionsError={connectionsError}
              showConnection
            />
            <RegistrationAssetFormatSection />
            {assetType === 'structured' ? <SchemaSection /> : null}
            <RegistrationOrganizationSection
              collections={collections}
              onManageCollections={onManageCollections}
            />
            <PropertiesSection />
          </Form>
        </FormProvider>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Register"
          onSubmit={form.handleSubmit(handleSubmit)}
          onCancel={handleClose}
          isSubmitDisabled={isSubmitting}
          isSubmitLoading={isSubmitting}
          submitButtonTestId="register-data-submit"
        />
      </ModalFooter>
    </Modal>
  );
};

export default RegisterDataModal;
