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
  registerDataDraftSchema,
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
  onRegisterNewConnection?: () => void;
};

const REGISTER_DATA_DRAFT_STORAGE_PREFIX = 'odh-data-registry.register-data-draft';

const getDraftStorageKey = (project: string): string =>
  `${REGISTER_DATA_DRAFT_STORAGE_PREFIX}:${encodeURIComponent(project)}`;

const saveRegisterDataDraft = (project: string, data: RegisterDataFormData): void => {
  try {
    sessionStorage.setItem(getDraftStorageKey(project), JSON.stringify(data));
  } catch {
    // Ignore storage failures so registration still works when storage is unavailable.
  }
};

const loadRegisterDataDraft = (project: string): Partial<RegisterDataFormData> | undefined => {
  try {
    const storedDraft = sessionStorage.getItem(getDraftStorageKey(project));
    if (!storedDraft) {
      return undefined;
    }

    const result = registerDataDraftSchema.safeParse(JSON.parse(storedDraft));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
};

const clearRegisterDataDraft = (project: string): void => {
  try {
    sessionStorage.removeItem(getDraftStorageKey(project));
  } catch {
    // Ignore storage failures so closing the modal still works when storage is unavailable.
  }
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
  onRegisterNewConnection,
}) => {
  const [connections, connectionsLoaded, connectionsError] = useConnections(project);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const form = useForm<RegisterDataFormData>({
    resolver: zodResolver(registerDataSchema),
    defaultValues: registerDataDefaults,
    mode: 'onBlur',
  });

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const draft = loadRegisterDataDraft(project);
    if (draft) {
      form.reset({ ...registerDataDefaults, ...draft });
    }
  }, [form, isOpen, project]);

  const resetAndClose = React.useCallback(
    (preserveDraft = false) => {
      if (!preserveDraft) {
        clearRegisterDataDraft(project);
      }
      form.reset(registerDataDefaults);
      setIsSubmitting(false);
      setError('');
      onClose();
    },
    [form, onClose, project],
  );

  const handleClose = React.useCallback(() => {
    resetAndClose();
  }, [resetAndClose]);

  const handleRegisterNewConnection = React.useCallback(() => {
    saveRegisterDataDraft(project, form.getValues());
    resetAndClose(true);
    onRegisterNewConnection?.();
  }, [form, onRegisterNewConnection, project, resetAndClose]);

  const handleSubmit = React.useCallback(
    async (data: RegisterDataFormData) => {
      setIsSubmitting(true);
      setError('');
      try {
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
          await createVolume(project, data.collection, buildVolumeRequest(data, connections));
        } else {
          await createGenericTable(project, data.collection, buildTableRequest(data, connections));
        }
        form.reset(registerDataDefaults);
        clearRegisterDataDraft(project);
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
              onRegisterNewConnection={handleRegisterNewConnection}
              showConnection
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
