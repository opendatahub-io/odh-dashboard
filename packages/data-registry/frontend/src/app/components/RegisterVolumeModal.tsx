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
import { createVolume } from '~/app/api/dataRegistry';
import { CreateVolumeRequest } from '~/app/types';
import {
  registerVolumeSchema,
  registerVolumeDefaults,
  RegisterVolumeFormData,
} from '~/app/schemas/registerVolume.schema';
import AssetDetailsSection from './register-volume/AssetDetailsSection';
import DataLocationSection from './register-volume/DataLocationSection';
import PropertiesSection from './register-volume/PropertiesSection';
import CustomPropertiesSection from './register-volume/CustomPropertiesSection';

type RegisterVolumeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  collections: string[];
  onCreated: () => void;
  onManageCollections: () => void;
};

const buildRequest = (data: RegisterVolumeFormData): CreateVolumeRequest => {
  const request: CreateVolumeRequest = {
    name: data.name.trim(),
    // eslint-disable-next-line camelcase
    content_type: data.format,
  };
  if (data.description) {
    request.description = data.description;
  }
  if (data.path && data.path !== '/') {
    request.location = data.path;
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

const RegisterVolumeModal: React.FC<RegisterVolumeModalProps> = ({
  isOpen,
  onClose,
  project,
  collections,
  onCreated,
  onManageCollections,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const form = useForm<RegisterVolumeFormData>({
    resolver: zodResolver(registerVolumeSchema),
    defaultValues: registerVolumeDefaults,
    mode: 'onBlur',
  });

  const handleClose = React.useCallback(() => {
    form.reset(registerVolumeDefaults);
    setError('');
    onClose();
  }, [form, onClose]);

  const handleSubmit = React.useCallback(
    async (data: RegisterVolumeFormData) => {
      setIsSubmitting(true);
      setError('');
      try {
        await createVolume(project, data.collection, buildRequest(data));
        form.reset(registerVolumeDefaults);
        onCreated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to register volume');
      } finally {
        setIsSubmitting(false);
      }
    },
    [project, form, onCreated, onClose],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="medium"
      data-testid="register-volume-modal"
    >
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
          <Alert variant="danger" isInline title="Error registering volume">
            {error}
          </Alert>
        ) : null}
        <FormProvider {...form}>
          <Form>
            <AssetDetailsSection
              collections={collections}
              onManageCollections={onManageCollections}
            />
            <DataLocationSection />
            <PropertiesSection />
            <CustomPropertiesSection />
          </Form>
        </FormProvider>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={form.handleSubmit(handleSubmit)}
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
          data-testid="register-volume-submit"
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

export default RegisterVolumeModal;
