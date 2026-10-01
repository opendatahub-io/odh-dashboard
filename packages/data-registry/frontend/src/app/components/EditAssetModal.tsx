/* eslint-disable camelcase */
import React from 'react';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import { Alert, Form, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AssetResponse,
  ConnectionModel,
  ConnectionRef,
  StructuredFormat,
  UnstructuredFormat,
  LICENSE_VALUES,
  MATURITY_VALUES,
  PII_STATUS_VALUES,
} from '~/app/types';
import {
  isConflictError,
  createLabel,
  updateGenericTable,
  updateVolume,
} from '~/app/api/dataRegistry';
import { useConnections } from '~/app/hooks/useConnections';
import { editAssetSchema, EditAssetFormData } from '~/app/schemas/editAsset.schema';
import AssetDetailsSection from './register-data/AssetDetailsSection';
import DataLocationSection from './register-data/DataLocationSection';
import PropertiesSection from './register-data/PropertiesSection';
import CustomPropertiesSection from './register-data/CustomPropertiesSection';
import SchemaSection from './register-data/SchemaSection';

type EditAssetModalProps = {
  asset: AssetResponse;
  assetKind: 'table' | 'volume';
  project: string;
  collection: string;
  name: string;
  onClose: () => void;
  onSaved: () => void;
};

const WELL_KNOWN_PROPERTIES = new Set(['purpose', 'license', 'maturity', 'domain', 'pii']);

const STRUCTURED_FORMATS: StructuredFormat[] = [
  'iceberg',
  'parquet',
  'csv',
  'delta',
  'postgresql',
  'milvus',
  'other',
];

const UNSTRUCTURED_FORMATS: UnstructuredFormat[] = [
  'documents',
  'images',
  'audio',
  'video',
  'binary',
  'other',
];

const isStructuredFormat = (format: string): format is StructuredFormat =>
  STRUCTURED_FORMATS.some((value) => value === format);

const isUnstructuredFormat = (format: string): format is UnstructuredFormat =>
  UNSTRUCTURED_FORMATS.some((value) => value === format);

const getEnumPropertyValue = <T extends string>(
  value: string | undefined,
  values: readonly T[],
): T | '' => values.find((option) => option === value) ?? '';

const getConnectionDisplayValue = (connectionRef?: ConnectionRef | null): string => {
  if (!connectionRef) {
    return '';
  }
  return connectionRef.type === 'rhai' ? connectionRef.secret_name : connectionRef.id;
};

const getConnectionRef = (
  connection: string,
  connections: ConnectionModel[],
): ConnectionRef | null => {
  if (!connection) {
    return null;
  }
  const selectedConnection = connections.find((item) => item.name === connection);
  return selectedConnection?.connectionType?.toLowerCase() === 'dch'
    ? { type: 'dch', id: connection }
    : { type: 'rhai', secret_name: connection };
};

const buildFormDefaults = (props: EditAssetModalProps, idStart: number): EditAssetFormData => {
  const { asset, assetKind, collection } = props;
  const properties = asset.properties ?? {};
  const customProperties = Object.entries(properties)
    .filter(([key]) => !WELL_KNOWN_PROPERTIES.has(key))
    .map(([key, value], index) => ({ id: idStart + index + 1, key, value }));

  return {
    assetType: assetKind === 'table' ? 'structured' : 'unstructured',
    name: asset.name,
    description: asset.description ?? '',
    format: asset.format,
    collection,
    labels: asset.labels ?? [],
    connection: getConnectionDisplayValue(asset.connection_ref),
    path: asset.storage_location ?? '',
    purpose: properties.purpose || '',
    license: getEnumPropertyValue(properties.license, LICENSE_VALUES),
    maturity: getEnumPropertyValue(properties.maturity, MATURITY_VALUES),
    domain: properties.domain || '',
    piiStatus: getEnumPropertyValue(properties.pii, PII_STATUS_VALUES),
    customProperties,
    schemaFields:
      assetKind === 'table'
        ? (asset.columns ?? []).map((column, index) => ({
            id: idStart + customProperties.length + index + 1,
            name: column.name,
            type: column.type,
            description: column.description ?? '',
            nullable: column.nullable ?? false,
          }))
        : [],
  };
};

const EditAssetModal: React.FC<EditAssetModalProps> = ({
  asset,
  assetKind,
  project,
  collection,
  name,
  onClose,
  onSaved,
}) => {
  const isTable = assetKind === 'table';
  const [connections, connectionsLoaded, connectionsError] = useConnections(project);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const idRef = React.useRef(0);

  const defaults = React.useMemo(() => {
    const result = buildFormDefaults(
      { asset, assetKind, project, collection, name, onClose, onSaved },
      idRef.current,
    );
    idRef.current += result.customProperties.length + result.schemaFields.length;
    return result;
  }, [asset, assetKind, collection, name, onClose, onSaved, project]);

  const originalLabels = React.useMemo(() => asset.labels ?? [], [asset.labels]);

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

      const addLabels = data.labels.filter((label) => !originalLabels.includes(label));
      const removeLabels = originalLabels.filter((label) => !data.labels.includes(label));
      const customProperties: Record<string, string> = {};
      data.customProperties.forEach((property) => {
        if (property.key && property.value) {
          customProperties[property.key] = property.value;
        }
      });
      const incompleteCustomPropertyKeys = new Set(
        data.customProperties
          .filter((property) => property.key && !property.value)
          .map((property) => property.key),
      );
      const originalCustomPropertyKeys = Object.keys(asset.properties ?? {}).filter(
        (key) => !WELL_KNOWN_PROPERTIES.has(key),
      );
      const removeProperties = originalCustomPropertyKeys.filter(
        (key) =>
          !Object.prototype.hasOwnProperty.call(customProperties, key) &&
          !incompleteCustomPropertyKeys.has(key),
      );

      const originalConnection = getConnectionDisplayValue(asset.connection_ref);
      const connectionUpdate =
        data.connection !== originalConnection
          ? { connection_ref: getConnectionRef(data.connection, connections) }
          : {};

      const commonUpdate = {
        description: data.description,
        storage_location: data.path || null,
        ...connectionUpdate,
        ...(data.purpose !== defaults.purpose ? { purpose: data.purpose || null } : {}),
        ...(data.license !== defaults.license ? { license: data.license || null } : {}),
        ...(data.maturity !== defaults.maturity ? { maturity: data.maturity || null } : {}),
        ...(data.domain !== defaults.domain ? { domain: data.domain || null } : {}),
        ...(data.piiStatus !== defaults.piiStatus ? { pii: data.piiStatus || null } : {}),
        ...(addLabels.length > 0 ? { add_labels: addLabels } : {}),
        ...(removeLabels.length > 0 ? { remove_labels: removeLabels } : {}),
        ...(removeProperties.length > 0 ? { remove_properties: removeProperties } : {}),
        properties: customProperties,
      };

      try {
        if (addLabels.length > 0) {
          await Promise.all(
            addLabels.map((label) =>
              createLabel(project, { name: label }).catch((err) => {
                if (isConflictError(err)) {
                  return;
                }
                throw err;
              }),
            ),
          );
        }

        if (isTable) {
          await updateGenericTable(project, collection, name, {
            ...commonUpdate,
            ...(isStructuredFormat(data.format) ? { format: data.format } : {}),
            schema_fields: data.schemaFields.map((column) => ({
              name: column.name,
              type: column.type,
              description: column.description || undefined,
              nullable: column.nullable,
            })),
          });
        } else {
          await updateVolume(project, collection, name, {
            ...commonUpdate,
            ...(isUnstructuredFormat(data.format) ? { format: data.format } : {}),
          });
        }
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save changes');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      asset.connection_ref,
      collection,
      connections,
      defaults,
      isTable,
      name,
      onSaved,
      originalLabels,
      project,
      asset.properties,
    ],
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
              pathLabel="Storage location"
              showConnection
              connections={connections}
              connectionsLoaded={connectionsLoaded}
              connectionsError={connectionsError}
            />
            <PropertiesSection />
            <CustomPropertiesSection />
            {isTable ? <SchemaSection /> : null}
          </Form>
        </FormProvider>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Save"
          onSubmit={form.handleSubmit(handleSubmit)}
          onCancel={onClose}
          isSubmitDisabled={isSubmitting}
          isSubmitLoading={isSubmitting}
          isCancelDisabled={isSubmitting}
          submitButtonTestId="edit-asset-save"
          cancelButtonTestId="edit-asset-cancel"
        />
      </ModalFooter>
    </Modal>
  );
};

export default EditAssetModal;
