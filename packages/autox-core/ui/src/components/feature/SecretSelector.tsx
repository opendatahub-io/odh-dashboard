import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  SelectOptionProps,
  Skeleton,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { TypeaheadSelect } from '@odh-dashboard/ui-core';
import type { TypeaheadSelectProps } from '@odh-dashboard/ui-core';
import * as React from 'react';
import type { SecretListItem } from '../../api/k8s/types';
import { useSecretsQuery } from '../../hooks';
import { formatMissingKeysMessage, getMissingRequiredKeys } from '../../utils/secretValidation';

export interface SecretSelection extends SecretListItem {
  invalid?: boolean;
}

type TypeaheadSelectOption = Omit<SelectOptionProps, 'content' | 'isSelected'> & {
  content: string | number;
  value: string | number;
  isSelected?: boolean;
  dropdownLabel?: React.ReactNode;
  description?: React.ReactNode;
};

type DatabaseProvider = 'milvus' | 'pgvector' | 'neo4j';

const getDatabaseProviders = (secret: SecretListItem): DatabaseProvider[] => {
  const keys = new Set(Object.keys(secret.data ?? {}));
  return [
    keys.has('MILVUS_URI') ? 'milvus' : undefined,
    ['PGVECTOR_HOST', 'PGVECTOR_PORT', 'PGVECTOR_DB', 'PGVECTOR_USER', 'PGVECTOR_PASSWORD'].every(
      (key) => keys.has(key),
    )
      ? 'pgvector'
      : undefined,
    keys.has('NEO4J_URI') ? 'neo4j' : undefined,
  ].filter((provider): provider is DatabaseProvider => provider !== undefined);
};

export type SecretSelectorProps = Omit<
  TypeaheadSelectProps,
  'selectOptions' | 'selected' | 'onSelect' | 'onChange'
> & {
  namespace: string;
  type?: string;
  provider?: 'milvus' | 'pgvector' | 'neo4j';
  allowedProviders?: readonly ('milvus' | 'pgvector' | 'neo4j')[];
  preserveSelectedValue?: boolean;
  preservedSelection?: SecretSelection;
  value?: string;
  valueName?: string;
  onChange: (selection: SecretSelection | undefined) => void;
  additionalRequiredKeys?: Readonly<Partial<Record<string, readonly string[]>>>;
  onRefreshReady?: (refresh: () => Promise<SecretListItem[] | undefined>) => void;
  showDescription?: boolean;
  showType?: boolean;
};

const SecretSelector: React.FC<SecretSelectorProps> = ({
  namespace,
  type,
  provider,
  allowedProviders,
  preserveSelectedValue = false,
  preservedSelection,
  value,
  valueName,
  onChange,
  placeholder = 'Select a secret',
  isDisabled = false,
  isRequired = false,
  previewDescription = false,
  toggleWidth = '100%',
  dataTestId = 'secret-selector',
  additionalRequiredKeys,
  onRefreshReady,
  showDescription = false,
  showType = false,
  toggleProps: userToggleProps,
  ...props
}) => {
  const [validationError, setValidationError] = React.useState<string>('');
  const {
    data: secrets,
    isPending: loading,
    error,
    refetch,
  } = useSecretsQuery(namespace, type, provider);
  const refresh = React.useCallback(async () => (await refetch()).data, [refetch]);

  React.useEffect(() => {
    onRefreshReady?.(refresh);
  }, [refresh, onRefreshReady]);

  const loaded = !loading;
  const secretsList = React.useMemo(() => {
    const allSecrets = Array.isArray(secrets) ? secrets : [];
    if (!allowedProviders || !['database', 'vector-db'].includes(type ?? '')) {
      return allSecrets;
    }
    const filteredSecrets = allSecrets.filter((secret) => {
      const matchingProviders = getDatabaseProviders(secret);
      return matchingProviders.length === 1 && allowedProviders.includes(matchingProviders[0]);
    });
    if (preserveSelectedValue && valueName) {
      const selectedSecret =
        allSecrets.find((secret) => secret.name === valueName) ??
        (preservedSelection?.name === valueName ? preservedSelection : undefined);
      if (selectedSecret && !filteredSecrets.some((secret) => secret.name === valueName)) {
        return [...filteredSecrets, selectedSecret];
      }
    }
    return filteredSecrets;
  }, [allowedProviders, preserveSelectedValue, preservedSelection, secrets, type, valueName]);
  const hasSecrets = secretsList.length > 0;
  const hasError = !!error;
  const isLoading = !loaded;
  const hasNoSecrets = loaded && !hasError && !hasSecrets;
  const isSelectDisabled = isDisabled || hasError || !hasSecrets || isLoading;
  const selectedValue = valueName
    ? secretsList.find((secret) => secret.name === valueName)?.uuid
    : value;

  const validateSecretKeys = React.useCallback(
    (secret: SecretListItem): string[] => {
      if (!additionalRequiredKeys || !secret.type) {
        return [];
      }
      const requiredKeysForType = additionalRequiredKeys[secret.type];
      // The map is partial at runtime even though its index is string-based.
      if (!requiredKeysForType) {
        return [];
      }
      return getMissingRequiredKeys(requiredKeysForType, Object.keys(secret.data ?? {}));
    },
    [additionalRequiredKeys],
  );

  React.useEffect(() => {
    if (!selectedValue || secretsList.length === 0) {
      setValidationError('');
      return;
    }
    const secret = secretsList.find((s) => s.uuid === selectedValue);
    if (!secret) {
      setValidationError('');
      return;
    }
    const missingKeys = validateSecretKeys(secret);
    setValidationError(formatMissingKeysMessage(missingKeys));
  }, [selectedValue, secretsList, validateSecretKeys]);

  React.useEffect(() => {
    if (!loaded || error || !valueName) {
      return;
    }
    if (!secretsList.some((secret) => secret.name === valueName)) {
      onChange(undefined);
    }
  }, [error, loaded, onChange, secretsList, valueName]);

  React.useEffect(() => {
    if (!loaded || error || !selectedValue) {
      return;
    }
    if (secretsList.length === 0) {
      onChange(undefined);
      return;
    }
    const isValueInList = secretsList.some((secret) => secret.uuid === selectedValue);
    if (!isValueInList) {
      onChange(undefined);
    }
  }, [loaded, error, secretsList, selectedValue, onChange]);

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      secretsList.map((secret) => {
        const labels = [];
        const matchingProviders = getDatabaseProviders(secret);
        const providerLabel =
          ['database', 'vector-db'].includes(type ?? '') && matchingProviders.length === 1
            ? matchingProviders[0] === 'pgvector'
              ? 'PGVector'
              : matchingProviders[0] === 'milvus'
              ? 'Milvus'
              : 'Neo4j'
            : undefined;
        if (showType && secret.type) {
          labels.push(
            <Label key="type" color="teal" isCompact>
              Type: {secret.type}
            </Label>,
          );
        }
        if (showDescription && secret.description) {
          labels.push(
            <div
              key="desc"
              className="pf-v6-u-w-25 pf-v6-u-text-truncate"
              title={secret.description}
            >
              {secret.description}
            </div>,
          );
        }
        return {
          content: secret.displayName || secret.name,
          value: secret.uuid,
          dropdownLabel: providerLabel ? (
            <Label color="grey" variant="outline" isCompact>
              {providerLabel}
            </Label>
          ) : undefined,
          isSelected: secret.uuid === selectedValue,
          isDisabled:
            preserveSelectedValue &&
            secret.name === valueName &&
            type !== undefined &&
            ['database', 'vector-db'].includes(type) &&
            !!allowedProviders &&
            (() => {
              const filteredProviders = getDatabaseProviders(secret);
              return (
                (preservedSelection?.name === secret.name &&
                  !secrets?.some((item) => item.name === secret.name)) ||
                filteredProviders.length !== 1 ||
                !allowedProviders.includes(filteredProviders[0])
              );
            })(),
          description: labels.length ? (
            <LabelGroup className="pf-v6-u-mt-sm">{labels}</LabelGroup>
          ) : undefined,
        };
      }),
    [
      allowedProviders,
      preserveSelectedValue,
      preservedSelection,
      secrets,
      secretsList,
      selectedValue,
      showDescription,
      showType,
      type,
      valueName,
    ],
  );

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <>
      <TypeaheadSelect
        {...props}
        placeholder={placeholder}
        selectOptions={options}
        selected={selectedValue}
        dataTestId={dataTestId}
        isDisabled={isSelectDisabled}
        isRequired={isRequired}
        previewDescription={previewDescription}
        toggleWidth={toggleWidth}
        toggleProps={{ ...userToggleProps, status: hasError ? 'danger' : userToggleProps?.status }}
        onSelect={(
          _:
            | React.MouseEvent<Element, MouseEvent>
            | React.KeyboardEvent<HTMLInputElement>
            | undefined,
          selection: string | number,
        ) => {
          const secret = secretsList.find((item) => item.uuid === String(selection));
          if (!secret) {
            setValidationError('');
            onChange(undefined);
            return;
          }
          const missingKeys = validateSecretKeys(secret);
          setValidationError(formatMissingKeysMessage(missingKeys));
          onChange({ ...secret, invalid: missingKeys.length > 0 });
        }}
      />
      {(hasError || hasNoSecrets || validationError) && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem
              variant={hasError || validationError ? 'error' : 'indeterminate'}
              icon={hasError || validationError ? <ExclamationCircleIcon /> : undefined}
            >
              {validationError ||
                (hasError
                  ? 'Secrets could not be fetched'
                  : 'There are no secrets in the selected namespace')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </>
  );
};

export default SecretSelector;
