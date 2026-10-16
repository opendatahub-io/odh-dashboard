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
import type { DatabaseProvider, SecretListItem } from '../../api/k8s/types';
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

const getDatabaseProviders = (secret: SecretListItem): DatabaseProvider[] =>
  secret.databaseProviders ?? [];

const isDatabaseSecretType = (type?: string): boolean =>
  type === 'database' || type === 'vector-db';

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
  const availableSecrets = React.useMemo(() => {
    const allSecrets = Array.isArray(secrets) ? secrets : [];
    if (!isDatabaseSecretType(type)) {
      return allSecrets;
    }
    const filteredSecrets = allSecrets.filter((secret) => {
      const matchingProviders = getDatabaseProviders(secret);
      return (
        matchingProviders.length === 1 &&
        (!allowedProviders || allowedProviders.includes(matchingProviders[0]))
      );
    });
    return filteredSecrets;
  }, [allowedProviders, secrets, type]);
  const displaySecrets = React.useMemo(() => {
    if (!preserveSelectedValue || !valueName || !isDatabaseSecretType(type)) {
      return availableSecrets;
    }
    if (
      availableSecrets.some((secret) => secret.name === valueName) ||
      preservedSelection?.name !== valueName
    ) {
      return availableSecrets;
    }
    return [...availableSecrets, preservedSelection];
  }, [availableSecrets, preserveSelectedValue, preservedSelection, type, valueName]);
  const hasSecrets = displaySecrets.length > 0;
  const hasError = !!error;
  const isLoading = !loaded;
  const hasNoSecrets = loaded && !hasError && !hasSecrets;
  const isSelectDisabled = isDisabled || hasError || !hasSecrets || isLoading;
  const selectedValue = valueName
    ? availableSecrets.find((secret) => secret.name === valueName)?.uuid
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
    if (!selectedValue || availableSecrets.length === 0) {
      setValidationError('');
      return;
    }
    const secret = availableSecrets.find((s) => s.uuid === selectedValue);
    if (!secret) {
      setValidationError('');
      return;
    }
    const missingKeys = validateSecretKeys(secret);
    setValidationError(formatMissingKeysMessage(missingKeys));
  }, [availableSecrets, selectedValue, validateSecretKeys]);

  React.useEffect(() => {
    if (!loaded || error || !valueName) {
      return;
    }
    if (!availableSecrets.some((secret) => secret.name === valueName)) {
      onChange(undefined);
    }
  }, [availableSecrets, error, loaded, onChange, valueName]);

  React.useEffect(() => {
    if (!loaded || error || !selectedValue) {
      return;
    }
    if (availableSecrets.length === 0) {
      onChange(undefined);
      return;
    }
    const isValueInList = availableSecrets.some((secret) => secret.uuid === selectedValue);
    if (!isValueInList) {
      onChange(undefined);
    }
  }, [availableSecrets, error, loaded, onChange, selectedValue]);

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      displaySecrets.map((secret) => {
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
            isDatabaseSecretType(type) &&
            (() => {
              const isUnavailable =
                secret.name === valueName &&
                !availableSecrets.some((item) => item.name === secret.name);
              const hasInvalidMetadata =
                matchingProviders.length !== 1 ||
                (!!allowedProviders && !allowedProviders.includes(matchingProviders[0]));
              return isUnavailable || hasInvalidMetadata;
            })(),
          description: labels.length ? (
            <LabelGroup className="pf-v6-u-mt-sm">{labels}</LabelGroup>
          ) : undefined,
        };
      }),
    [
      allowedProviders,
      preserveSelectedValue,
      availableSecrets,
      displaySecrets,
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
          const secret = availableSecrets.find((item) => item.uuid === String(selection));
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
