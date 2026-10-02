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
  ConnectionRef,
  UnstructuredFormat,
  StructuredFormat,
} from '~/app/types';
import { useConnections } from '~/app/hooks/useConnections';
import { confirmConnection } from '~/app/utilities/connectionUtils';
import {
  registerDataSchema,
  registerDataDefaults,
  RegisterDataFormData,
} from '~/app/schemas/registerData.schema';
import AssetDetailsSection from './register-data/AssetDetailsSection';
import DataLocationSection from './register-data/DataLocationSection';
import PropertiesSection from './register-data/PropertiesSection';
import CustomPropertiesSection from './register-data/CustomPropertiesSection';
import SchemaSection from './register-data/SchemaSection';

type RegisterDataModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  collections: string[];
  onCreated: () => void;
  onManageCollections: () => void;
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
  if (data.labels.length > 0) {
    request.labels = data.labels;
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
}) => {
  const [connections, connectionsLoaded, connectionsError, refreshConnections, connectionWarnings] =
    useConnections(project, isOpen);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const form = useForm<RegisterDataFormData>({
    resolver: zodResolver(registerDataSchema),
    defaultValues: registerDataDefaults,
    mode: 'onBlur',
  });

  const handleClose = React.useCallback(() => {
    form.reset(registerDataDefaults);
    setIsSubmitting(false);
    setError('');
    onClose();
  }, [form, onClose]);

  const handleSubmit = React.useCallback(
    async (data: RegisterDataFormData) => {
      setIsSubmitting(true);
      setError('');
      try {
        const connectionRef = data.connection
          ? await confirmConnection(data.connection, refreshConnections)
          : undefined;
        if (data.labels.length > 0) {
          await Promise.all(
            data.labels.map((label) =>
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
        form.reset(registerDataDefaults);
        onCreated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to register data asset');
      } finally {
        setIsSubmitting(false);
      }
    },
    [project, form, onCreated, onClose, refreshConnections],
  );

  const assetType = form.watch('assetType');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="medium" data-testid="register-data-modal">
      <ModalHeader
        title="Register data"
        description={
          <Content component="p">
            Create a new data asset and configure its source location, metadata, and schema.
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
          <Form>
            <AssetDetailsSection
              collections={collections}
              onManageCollections={onManageCollections}
            />
            <DataLocationSection
              connections={connections}
              connectionsLoaded={connectionsLoaded}
              connectionsError={connectionsError}
              connectionWarnings={connectionWarnings}
              isConnectionDisabled={isSubmitting}
            />
            <PropertiesSection />
            <CustomPropertiesSection />
            {assetType === 'structured' ? <SchemaSection /> : null}
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
