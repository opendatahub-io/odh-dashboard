/* eslint-disable camelcase */
import React from 'react';
import {
  Alert,
  Button,
  Form,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AssetResponse, ConnectionRef, VolumeInfo } from '~/app/types';
import { ApiError, createLabel, updateGenericTable, updateVolume } from '~/app/api/dataRegistry';
import { editAssetSchema, EditAssetFormData } from '~/app/schemas/editAsset.schema';
import AssetDetailsSection from './register-data/AssetDetailsSection';
import DataLocationSection from './register-data/DataLocationSection';
import PropertiesSection from './register-data/PropertiesSection';
import CustomPropertiesSection from './register-data/CustomPropertiesSection';
import SchemaSection from './register-data/SchemaSection';

type EditTableModalProps = {
  asset: AssetResponse;
  assetKind: 'table';
  project: string;
  collection: string;
  name: string;
  onClose: () => void;
  onSaved: () => void;
};

type EditVolumeModalProps = {
  asset: VolumeInfo;
  assetKind: 'volume';
  project: string;
  collection: string;
  name: string;
  onClose: () => void;
  onSaved: () => void;
};

type EditAssetModalProps = EditTableModalProps | EditVolumeModalProps;

const WELL_KNOWN_PROPERTIES = new Set(['purpose', 'license', 'maturity', 'pii_status']);

const getConnectionDisplayValue = (connectionRef?: ConnectionRef | string | null): string => {
  if (!connectionRef) {
    return 'None';
  }
  if (typeof connectionRef === 'string') {
    return connectionRef;
  }
  if (connectionRef.type === 'rhai') {
    return connectionRef.secret_name || 'None';
  }
  return connectionRef.id || 'None';
};

const buildFormDefaults = (props: EditAssetModalProps, idStart: number): EditAssetFormData => {
  const { asset, assetKind, collection } = props;
  const isTable = assetKind === 'table';
  const properties = asset.properties ?? {};

  const customProperties = Object.entries(properties)
    .filter(([key]) => !WELL_KNOWN_PROPERTIES.has(key))
    .map(([key, value], index) => ({ id: idStart + index + 1, key, value }));

  return {
    assetType: isTable ? 'structured' : 'unstructured',
    name: asset.name,
    description: isTable ? (asset.description ?? '') : (asset.comment ?? ''),
    format: isTable ? asset.format || 'other' : asset.config?.content_type || 'other',
    collection,
    labels: asset.labels ?? [],
    connection: isTable
      ? getConnectionDisplayValue(asset.connection_ref)
      : asset.properties?.['connection-ref'] || '',
    path: isTable ? (asset.location ?? '') : asset['storage-location'],
    purpose: properties.purpose || '',
    license: properties.license || '',
    maturity: properties.maturity || '',
    piiStatus: properties.pii_status || '',
    customProperties,
    schemaFields: isTable
      ? (asset.columns ?? []).map((col, index) => ({
          id: idStart + customProperties.length + index + 1,
          name: col.name,
          type: col.type,
          description: col.description ?? '',
          nullable: col.nullable ?? false,
        }))
      : [],
  };
};

const EditAssetModal: React.FC<EditAssetModalProps> = (props) => {
  const { asset, assetKind, project, collection, name, onClose, onSaved } = props;
  const isTable = assetKind === 'table';

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const idRef = React.useRef(0);

  const defaults = React.useMemo(() => {
    const result = buildFormDefaults(props, idRef.current);
    idRef.current += result.customProperties.length + result.schemaFields.length;
    return result;
    // buildFormDefaults only reads these stable asset inputs from props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, assetKind, collection]);
  const originalLabels = React.useMemo(() => asset.labels ?? [], [asset]);

  const form = useForm<EditAssetFormData>({
    resolver: zodResolver(editAssetSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  React.useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const handleSubmit = React.useCallback(
    async (data: EditAssetFormData) => {
      setIsSubmitting(true);
      setError('');

      const addLabels = data.labels.filter((l) => !originalLabels.includes(l));
      const removeLabels = originalLabels.filter((l) => !data.labels.includes(l));

      const customProps: Record<string, string> = {};
      data.customProperties.forEach((prop) => {
        if (prop.key && prop.value) {
          customProps[prop.key] = prop.value;
        }
      });

      try {
        if (addLabels.length > 0) {
          await Promise.all(
            addLabels.map((label) =>
              createLabel(project, { name: label }).catch((err) => {
                if (err instanceof ApiError && err.status === 409) {
                  return;
                }
                throw err;
              }),
            ),
          );
        }
        if (isTable) {
          await updateGenericTable(project, collection, name, {
            description: data.description,
            format: data.format,
            location: data.path,
            purpose: data.purpose,
            license: data.license,
            maturity: data.maturity,
            pii: data.piiStatus,
            ...(addLabels.length > 0 ? { add_labels: addLabels } : {}),
            ...(removeLabels.length > 0 ? { remove_labels: removeLabels } : {}),
            properties: customProps,
            schema_fields: data.schemaFields.map((col) => ({
              name: col.name,
              type: col.type,
              description: col.description || undefined,
              nullable: col.nullable,
            })),
          });
        } else {
          const allProperties: Record<string, string> = { ...customProps };
          if (data.purpose) {
            allProperties.purpose = data.purpose;
          }
          if (data.license) {
            allProperties.license = data.license;
          }
          if (data.maturity) {
            allProperties.maturity = data.maturity;
          }
          if (data.piiStatus) {
            allProperties.pii_status = data.piiStatus;
          }

          await updateVolume(project, collection, name, {
            comment: data.description,
            storage_location: data.path,
            ...(addLabels.length > 0 ? { add_labels: addLabels } : {}),
            ...(removeLabels.length > 0 ? { remove_labels: removeLabels } : {}),
            properties: allProperties,
          });
        }
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save changes');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isTable, project, collection, name, originalLabels, onSaved],
  );

  return (
    <Modal
      isOpen
      onClose={isSubmitting ? undefined : onClose}
      variant="medium"
      data-testid="edit-asset-modal"
    >
      <ModalHeader title={`Edit "${asset.name}"`} />
      <ModalBody>
        {error ? (
          <Alert
            variant="danger"
            isInline
            title="Error saving changes"
            data-testid="edit-asset-error"
          >
            {error}
          </Alert>
        ) : null}
        <FormProvider {...form}>
          <Form>
            <AssetDetailsSection isEditMode />
            <DataLocationSection
              pathLabel={isTable ? 'Path' : 'Storage location'}
              showConnection
              isConnectionReadOnly
            />
            <PropertiesSection />
            <CustomPropertiesSection />
            {isTable ? <SchemaSection /> : null}
          </Form>
        </FormProvider>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={form.handleSubmit(handleSubmit)}
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
          data-testid="edit-asset-save"
        >
          Save
        </Button>
        <Button
          variant="link"
          onClick={onClose}
          isDisabled={isSubmitting}
          data-testid="edit-asset-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditAssetModal;
