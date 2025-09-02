import * as React from 'react';
import ConnectionTypeDataFormField from '@odh-dashboard/internal/concepts/connectionTypes/fields/ConnectionTypeDataFormField';
import DataFormFieldGroup from '@odh-dashboard/internal/concepts/connectionTypes/fields/DataFormFieldGroup';
import SectionFormField from '@odh-dashboard/internal/concepts/connectionTypes/fields/SectionFormField';
import {
  ConnectionTypeDataField,
  ConnectionTypeField,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
  SectionField,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { OCIConnectionTypeKeys } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { useCallback } from 'react';

import { ConnectionTypeRefs, ModelLocationData, ModelLocationType } from './types';
import S3ConnectionField from './S3ConnectionField';
import OCIConnectionField from './OCIConnectionField';

type Props = {
  fields?: ConnectionTypeField[];
  isPreview?: boolean;
  setModelLocationData?: (data: ModelLocationData | undefined) => void;
  connectionType: string;
  modelLocationData?: ModelLocationData;
};

type FieldGroup = {
  section: SectionField | undefined;
  fields: ConnectionTypeDataField[];
};

const ConnectionTypeFormFields: React.FC<Props> = ({
  fields,
  isPreview,
  setModelLocationData,
  connectionType,
  modelLocationData,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fieldValues, setFieldValues] = React.useState<Record<string, any>>(() => {
    if (!modelLocationData) {
      return {};
    }
    switch (modelLocationData.type) {
      case ModelLocationType.URI:
        return { URI: modelLocationData.uri };
      case ModelLocationType.S3:
        return {
          AWS_ACCESS_KEY_ID: modelLocationData.accessKey,
          AWS_SECRET_ACCESS_KEY: modelLocationData.secretKey,
          AWS_S3_ENDPOINT: modelLocationData.endpoint,
          AWS_DEFAULT_REGION: modelLocationData.region,
          AWS_S3_BUCKET: modelLocationData.bucket,
          AWS_S3_FOLDER_PATH: modelLocationData.path,
        };
      case ModelLocationType.OCI:
        return {
          [OCIConnectionTypeKeys[0]]: modelLocationData.secretDetails,
          OCI_HOST: modelLocationData.registryHost,
          OCI_MODEL_URI: modelLocationData.uri,
          ACCESS_TYPE: (() => {
            try {
              if (Array.isArray(modelLocationData.accessType)) {
                return modelLocationData.accessType;
              }
              if (typeof modelLocationData.accessType === 'string') {
                return JSON.parse(modelLocationData.accessType);
              }
              return [];
            } catch {
              return [];
            }
          })(),
        };
      default:
        return {};
    }
  });

  const handleFieldChange = (field: ConnectionTypeDataField, value: ConnectionTypeValueType) => {
    setFieldValues((prev) => {
      const newFieldValues = { ...prev, [field.envVar]: value };

      const typedData = mapFieldValuesToLocationData(newFieldValues, connectionType);

      setModelLocationData?.(typedData);

      return newFieldValues;
    });
  };

  const mapFieldValuesToLocationData = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: Record<string, any>,
    type: string,
  ): ModelLocationData => {
    switch (type) {
      case ConnectionTypeRefs.URI:
        return {
          type: ModelLocationType.URI,
          uri: String(values.URI || ''),
        };
      case ConnectionTypeRefs.S3:
        return {
          type: ModelLocationType.S3,
          accessKey: String(values.AWS_ACCESS_KEY_ID || ''),
          secretKey: String(values.AWS_SECRET_ACCESS_KEY || ''),
          endpoint: String(values.AWS_S3_ENDPOINT || ''),
          region: String(values.AWS_DEFAULT_REGION || ''),
          bucket: String(values.AWS_S3_BUCKET || ''),
          path: String(values.AWS_S3_FOLDER_PATH || ''),
        };
      case ConnectionTypeRefs.OCI:
        return {
          type: ModelLocationType.OCI,
          secretDetails: String(values[OCIConnectionTypeKeys[0]] || ''),
          registryHost: String(values.OCI_HOST || ''),
          uri: String(values.OCI_MODEL_URI || ''),
          accessType: values.ACCESS_TYPE || '[]',
        };
      default:
        return {
          type: ModelLocationType.URI,
          uri: '',
        };
    }
  };

  const getFieldValue = (fieldName: string) => {
    return fieldValues[fieldName] ?? '';
  };

  const fieldGroups = React.useMemo(
    () =>
      fields?.reduce<FieldGroup[]>((acc, field) => {
        if (field.type === ConnectionTypeFieldType.Section) {
          acc.push({ section: field, fields: [] });
        } else if (acc.length === 0) {
          acc.push({ section: undefined, fields: [field] });
        } else {
          acc[acc.length - 1].fields.push(field);
        }
        return acc;
      }, []),
    [fields],
  );

  const renderDataFields = (dataFields: ConnectionTypeDataField[]) =>
    dataFields.map((field, i) => {
      const id = `field-${field.envVar}`;
      return (
        <DataFormFieldGroup key={i} field={field} id={id}>
          <ConnectionTypeDataFormField
            id={id}
            field={field}
            mode={isPreview ? 'preview' : 'instance'}
            onChange={(v) => handleFieldChange(field, v)}
            value={getFieldValue(field.envVar)}
            data-testid={`field ${field.envVar}`}
          />
        </DataFormFieldGroup>
      );
    });
  const memoizedSetModelUri = useCallback(
    (modelUri: string | undefined) => {
      setFieldValues((prev) => {
        const newFieldValues = { ...prev, OCI_MODEL_URI: modelUri || '' };
        const typedData = mapFieldValuesToLocationData(newFieldValues, connectionType);
        setModelLocationData?.(typedData);
        return newFieldValues;
      });
    },
    [connectionType, setModelLocationData],
  );
  const memoizedSetModelPath = useCallback(
    (path: string | undefined) => {
      setFieldValues((prev) => {
        const newFieldValues = { ...prev, AWS_S3_FOLDER_PATH: path || '' };
        const typedData = mapFieldValuesToLocationData(newFieldValues, connectionType);
        setModelLocationData?.(typedData);
        return newFieldValues;
      });
    },
    [connectionType, setModelLocationData],
  );

  const renderAdditionalFields = () => {
    if (connectionType === ConnectionTypeRefs.OCI) {
      return (
        <OCIConnectionField
          ociHost={getFieldValue('OCI_HOST')}
          modelUri={getFieldValue('OCI_MODEL_URI')}
          setModelUri={memoizedSetModelUri}
          isNewConnection
        />
      );
    }
    if (connectionType === ConnectionTypeRefs.S3) {
      return (
        <S3ConnectionField
          folderPath={getFieldValue('AWS_S3_FOLDER_PATH')}
          setFolderPath={memoizedSetModelPath}
        />
      );
    }
    return null;
  };
  return (
    <>
      {fieldGroups?.map((fieldGroup, i) =>
        fieldGroup.section ? (
          <SectionFormField field={fieldGroup.section} key={i} data-testid="fields-section">
            {renderDataFields(fieldGroup.fields)}
          </SectionFormField>
        ) : (
          <React.Fragment key={i}>{renderDataFields(fieldGroup.fields)}</React.Fragment>
        ),
      )}
      {renderAdditionalFields()}
    </>
  );
};

export default React.memo(ConnectionTypeFormFields);
