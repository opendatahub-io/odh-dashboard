/* eslint-disable camelcase */
import React from 'react';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import { Alert, Form, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AssetResponse, LICENSE_VALUES, MATURITY_VALUES, PII_STATUS_VALUES } from '~/app/types';
import {
  isConflictError,
  createLabel,
  updateGenericTable,
  updateVolume,
} from '~/app/api/dataRegistry';
import { useConnections } from '~/app/hooks/useConnections';
import { confirmConnection, getConnectionKey } from '~/app/utilities/connectionUtils';
import { editAssetSchema, EditAssetFormData } from '~/app/schemas/editAsset.schema';
import { isStructuredFormat, isUnstructuredFormat } from '~/app/utilities/formatUtils';
import DataLocationSection from './register-data/DataLocationSection';
import PropertiesSection from './register-data/PropertiesSection';
import SchemaSection from './register-data/SchemaSection';
import {
  RegistrationAssetFormatSection,
  RegistrationIdentitySection,
  RegistrationOrganizationSection,
} from './register-data/RegistrationAssetSections';
import './register-data/RegistrationForm.scss';

type EditAssetModalProps = {
  isOpen?: boolean;
  asset: AssetResponse;
  assetKind: 'table' | 'volume';
  project: string;
  collection: string;
  name: string;
  onClose: () => void;
  onSaved: () => void;
  onManageCollections?: () => void;
  onManageLabels?: () => void;
  hasExistingDchConnectionReferences?: boolean;
};

const WELL_KNOWN_PROPERTIES = new Set(['purpose', 'license', 'maturity', 'domain', 'pii']);

const getEnumPropertyValue = <T extends string>(
  value: string | undefined,
  values: readonly T[],
): T | '' => values.find((option) => option === value) ?? '';

const getValidLabels = (labels: string[]): string[] => [
  ...new Set(labels.map((label) => label.trim()).filter(Boolean)),
];

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
    labels: getValidLabels(asset.labels ?? []),
    connection: asset.connection_ref ? getConnectionKey(asset.connection_ref) : '',
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
  isOpen = true,
  asset,
  assetKind,
  project,
  collection,
  name,
  onClose,
  onSaved,
  onManageCollections,
  onManageLabels,
  hasExistingDchConnectionReferences,
}) => {
  const isTable = assetKind === 'table';
  const [
    connections,
    connectionsLoaded,
    connectionsError,
    refreshConnections,
    connectionWarnings,
    fetchedConnectionDisplayData,
  ] = useConnections(project);
  const connectionDisplayData = fetchedConnectionDisplayData ?? connections;
  const originalConnectionKey = asset.connection_ref ? getConnectionKey(asset.connection_ref) : '';
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const idRef = React.useRef(0);
  const assetKey = `${project}:${collection}:${name}:${assetKind}`;

  const defaults = React.useMemo(() => {
    const result = buildFormDefaults(
      { asset, assetKind, project, collection, name, onClose, onSaved },
      idRef.current,
    );
    idRef.current += result.customProperties.length + result.schemaFields.length;
    return result;
  }, [asset, assetKind, collection, name, onClose, onSaved, project]);

  const assetLabels = React.useMemo(() => getValidLabels(asset.labels ?? []), [asset.labels]);
  const originalLabels = assetLabels;

  const form = useForm<EditAssetFormData>({
    resolver: zodResolver(editAssetSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  const previousAssetKey = React.useRef<string>();
  React.useEffect(() => {
    if (previousAssetKey.current !== assetKey) {
      previousAssetKey.current = assetKey;
      form.reset(defaults);
    }
  }, [assetKey, defaults, form]);

  React.useEffect(() => {
    if (!form.getFieldState('labels').isDirty) {
      form.setValue('labels', assetLabels, { shouldDirty: false });
    }
  }, [assetLabels, form]);

  const handleSubmit = React.useCallback(
    async (data: EditAssetFormData) => {
      setIsSubmitting(true);
      setError('');

      const labels = getValidLabels(data.labels);
      const addLabels = labels.filter((label) => !originalLabels.includes(label));
      const removeLabels = originalLabels.filter((label) => !labels.includes(label));
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

      try {
        const connectionUpdate =
          data.connection !== originalConnectionKey
            ? {
                connection_ref: data.connection
                  ? await confirmConnection(data.connection, refreshConnections)
                  : null,
              }
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
      collection,
      defaults,
      isTable,
      name,
      onSaved,
      originalLabels,
      originalConnectionKey,
      project,
      asset.properties,
      refreshConnections,
    ],
  );

  return (
    <Modal
      isOpen={isOpen}
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
          <Form className="odh-data-registry-registration-form">
            <RegistrationIdentitySection isEditMode />
            <DataLocationSection
              connections={connections}
              connectionDisplayData={connectionDisplayData}
              connectionsLoaded={connectionsLoaded}
              connectionsError={connectionsError}
              connectionWarnings={connectionWarnings}
              showDchFallbackWarning={
                hasExistingDchConnectionReferences || asset.connection_ref?.type === 'dch'
              }
              showRhaiLookupWarning={asset.connection_ref?.type === 'secret'}
              currentConnection={asset.connection_ref}
              isConnectionDisabled={isSubmitting}
            />
            <RegistrationAssetFormatSection isEditMode />
            {isTable ? <SchemaSection /> : null}
            <RegistrationOrganizationSection
              isEditMode
              onManageCollections={onManageCollections}
              onManageLabels={onManageLabels}
            />
            <PropertiesSection />
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
