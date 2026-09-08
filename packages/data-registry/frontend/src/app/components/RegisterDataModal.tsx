import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  Alert,
  Content,
} from '@patternfly/react-core';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSettings } from 'mod-arch-core';
import { createVolume, createGenericTable, createLabel, ApiError } from '~/app/api/dataRegistry';
import { CreateVolumeRequest, CreateGenericTableRequest } from '~/app/types';
import { useConnections } from '~/app/hooks/useConnections';
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

const buildVolumeRequest = (data: RegisterDataFormData): CreateVolumeRequest => {
  const request: CreateVolumeRequest = {
    name: data.name.trim(),
    // eslint-disable-next-line camelcase
    content_type: data.format,
  };
  if (data.description) {
    request.description = data.description;
  }
  if (data.owner) {
    request.owner = data.owner;
  }
  if (data.path && data.path !== '/') {
    request.location = data.path;
  }
  if (data.connection) {
    // eslint-disable-next-line camelcase
    request.connection_ref = data.connection;
  }
  if (data.labels.length > 0) {
    request.labels = data.labels;
  }
  const properties: Record<string, string> = {};
  if (data.purpose) {
    properties.purpose = data.purpose;
  }
  if (data.license) {
    properties.license = data.license;
  }
  if (data.maturity) {
    properties.maturity = data.maturity;
  }
  if (data.piiStatus) {
    // eslint-disable-next-line camelcase
    properties.pii_status = data.piiStatus;
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

const buildTableRequest = (data: RegisterDataFormData): CreateGenericTableRequest => {
  const request: CreateGenericTableRequest = {
    name: data.name.trim(),
    format: data.format,
  };
  if (data.description) {
    request.description = data.description;
  }
  if (data.owner) {
    request.owner = data.owner;
  }
  if (data.path && data.path !== '/') {
    request.location = data.path;
  }
  if (data.connection) {
    // eslint-disable-next-line camelcase
    request.connection_ref = data.connection;
  }
  if (data.labels.length > 0) {
    request.labels = data.labels;
  }
  if (data.purpose) {
    request.purpose = data.purpose;
  }
  if (data.license) {
    request.license = data.license;
  }
  if (data.maturity) {
    request.maturity = data.maturity;
  }
  if (data.piiStatus) {
    request.pii = data.piiStatus;
  }
  const filteredFields = data.schemaFields
    .filter((col) => col.name && col.type)
    .map((col) => ({
      name: col.name,
      type: col.type,
      ...(col.description ? { description: col.description } : {}),
      nullable: col.nullable,
    }));
  if (filteredFields.length > 0) {
    // eslint-disable-next-line camelcase
    request.schema_fields = filteredFields;
  }
  const properties: Record<string, string> = {};
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

const RegisterDataModal: React.FC<RegisterDataModalProps> = ({
  isOpen,
  onClose,
  project,
  collections,
  onCreated,
  onManageCollections,
}) => {
  const { userSettings } = useSettings();
  const userId = typeof userSettings?.userId === 'string' ? userSettings.userId : '';
  const [connections, connectionsLoaded, connectionsError] = useConnections(project);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const form = useForm<RegisterDataFormData>({
    resolver: zodResolver(registerDataSchema),
    defaultValues: { ...registerDataDefaults, owner: '' },
    mode: 'onBlur',
  });

  React.useEffect(() => {
    if (userId && !form.getValues('owner')) {
      form.setValue('owner', userId);
    }
  }, [userId, form]);

  const handleClose = React.useCallback(() => {
    form.reset({ ...registerDataDefaults, owner: userId });
    setIsSubmitting(false);
    setError('');
    onClose();
  }, [form, onClose, userId]);

  const handleSubmit = React.useCallback(
    async (data: RegisterDataFormData) => {
      setIsSubmitting(true);
      setError('');
      try {
        if (data.labels.length > 0) {
          await Promise.all(
            data.labels.map((label) =>
              createLabel(project, { name: label }).catch((err) => {
                if (err instanceof ApiError && err.status === 409) {
                  return;
                }
                throw err;
              }),
            ),
          );
        }
        if (data.assetType === 'unstructured') {
          await createVolume(project, data.collection, buildVolumeRequest(data));
        } else {
          await createGenericTable(project, data.collection, buildTableRequest(data));
        }
        form.reset({ ...registerDataDefaults, owner: userId });
        onCreated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to register data asset');
      } finally {
        setIsSubmitting(false);
      }
    },
    [project, form, onCreated, onClose, userId],
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
            />
            <PropertiesSection />
            <CustomPropertiesSection />
            {assetType === 'structured' ? <SchemaSection /> : null}
          </Form>
        </FormProvider>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={form.handleSubmit(handleSubmit)}
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
          data-testid="register-data-submit"
        >
          Register
        </Button>
        <Button variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RegisterDataModal;
