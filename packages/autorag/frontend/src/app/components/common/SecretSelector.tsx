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
import { APIOptions, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import { TypeaheadSelect } from 'mod-arch-shared';
import type { TypeaheadSelectProps } from 'mod-arch-shared/dist/components/TypeaheadSelect';
import * as React from 'react';
import { getSecrets } from '~/app/api/k8s';
import { SecretListItem } from '~/app/types';
import { formatMissingKeysMessage, getMissingRequiredKeys } from '~/app/utilities/secretValidation';

export interface SecretSelection extends SecretListItem {
  invalid?: boolean;
}

type TypeaheadSelectOption = Omit<SelectOptionProps, 'content' | 'isSelected'> & {
  content: string | number;
  value: string | number;
  isSelected?: boolean;
  description?: React.ReactNode;
};

type SecretSelectorProps = Omit<
  TypeaheadSelectProps,
  'selectOptions' | 'selected' | 'onSelect' | 'onChange'
> & {
  namespace: string;
  type?: 'storage' | 'lls';
  value?: string; // The UUID of the selected secret
  onChange: (selection: SecretSelection | undefined) => void;
  /**
   * Additional keys that must be present in the secret for this specific use case.
   * These are beyond the keys required for secret type classification (handled by the BFF).
   *
   * For example, S3 secrets are classified by keys like 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
   * etc., but a specific use case might additionally require 'AWS_S3_BUCKET' to be present.
   *
   * @example
   * additionalRequiredKeys={{ s3: ['AWS_S3_BUCKET'] }}
   */
  additionalRequiredKeys?: { [type: string]: string[] };
  /**
   * Called with the refresh function so the parent can trigger a secrets list refresh
   * (e.g. after creating a new connection). Refresh returns the updated list.
   */
  onRefreshReady?: (refresh: () => Promise<SecretListItem[] | undefined>) => void;
  showDescription?: boolean;
  showType?: boolean;
};

const SecretSelector: React.FC<SecretSelectorProps> = ({
  namespace,
  type,
  value,
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

  const callback = React.useCallback<FetchStateCallbackPromise<SecretListItem[]>>(
    (opts: APIOptions) => getSecrets('')(namespace, type)(opts),
    [namespace, type],
  );

  const [secrets, loaded, error, refresh] = useFetchState<SecretListItem[]>(callback, []);

  React.useEffect(() => {
    onRefreshReady?.(refresh);
  }, [refresh, onRefreshReady]);

  // Memoize to prevent new array reference on every render and to ensure secrets is always an array
  const secretsList = React.useMemo(() => (Array.isArray(secrets) ? secrets : []), [secrets]);
  const hasSecrets = secretsList.length > 0;
  const hasError = !!error;
  const isLoading = !loaded;
  const hasNoSecrets = loaded && !hasError && !hasSecrets;
  const isSelectDisabled = isDisabled || hasError || !hasSecrets || isLoading;

  // Validate if a secret has all additional required keys for this use case (case-insensitive)
  const validateSecretKeys = React.useCallback(
    (secret: SecretListItem): string[] => {
      if (!additionalRequiredKeys || !secret.type) {
        return [];
      }

      const requiredKeysForType = additionalRequiredKeys[secret.type];
      // TypeScript thinks this check is unnecessary because additionalRequiredKeys is typed as { [type: string]: string[] }
      // and secret.type is 's3' | 'lls' at this point (after the !secret.type check above).
      // However, additionalRequiredKeys is optional and may not contain entries for all possible secret types,
      // so this runtime check is needed.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!requiredKeysForType) {
        return [];
      }

      return getMissingRequiredKeys(requiredKeysForType, Object.keys(secret.data));
    },
    [additionalRequiredKeys],
  );

  // When value changes (including when parent sets selection programmatically), validate the
  // selected secret and show or clear validation error so invalid state is visible.
  React.useEffect(() => {
    if (!value) {
      setValidationError('');
      return;
    }

    // If secrets list becomes empty, clear the selection
    if (secretsList.length === 0) {
      setValidationError('');
      return;
    }

    const secret = secretsList.find((s) => s.uuid === value);
    if (!secret) {
      setValidationError('');
      return;
    }
    const missingKeys = validateSecretKeys(secret);
    if (missingKeys.length > 0) {
      setValidationError(formatMissingKeysMessage(missingKeys));
      // Don't auto-clear invalid selections - let the parent handle invalid state
      // The onSelect handler already sets invalid: true on the secret
    } else {
      setValidationError('');
    }
  }, [value, secretsList, validateSecretKeys, onChange]);

  // Clear stale selection when secrets refresh and current value is no longer valid
  React.useEffect(() => {
    if (!loaded || error || !value) {
      return;
    }
    // Clear selection if secrets list is empty
    if (secretsList.length === 0) {
      onChange(undefined);
      return;
    }
    // Clear selection if value is no longer in the list
    const isValueInList = secretsList.some((secret) => secret.uuid === value);
    if (!isValueInList) {
      onChange(undefined);
    }
  }, [loaded, error, secretsList, value, onChange]);

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      secretsList.map((secret) => {
        const labels = [];
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
              style={{
                width: '250px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={secret.description}
            >
              {secret.description}
            </div>,
          );
        }

        return {
          content: secret.displayName || secret.name,
          value: secret.uuid,
          isSelected: secret.uuid === value,
          description: labels.length ? (
            <LabelGroup style={{ marginTop: '0.5rem' }}>{labels}</LabelGroup>
          ) : undefined,
        };
      }),
    [secretsList, value, showDescription, showType],
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
        selected={value}
        dataTestId={dataTestId}
        isDisabled={isSelectDisabled}
        isRequired={isRequired}
        previewDescription={previewDescription}
        toggleWidth={toggleWidth}
        toggleProps={{
          ...userToggleProps,
          status: hasError ? 'danger' : userToggleProps?.status,
        }}
        onSelect={(
          _:
            | React.MouseEvent<Element, MouseEvent>
            | React.KeyboardEvent<HTMLInputElement>
            | undefined,
          selection: string | number,
        ) => {
          const uuid = String(selection);
          const secret = secretsList.find((s) => s.uuid === uuid);

          if (secret) {
            // Validate if the secret has all required keys
            const missingKeys = validateSecretKeys(secret);

            if (missingKeys.length > 0) {
              // Secret is missing required keys - set error and call onChange with invalid: true
              setValidationError(formatMissingKeysMessage(missingKeys));
              onChange({ ...secret, invalid: true });
            } else {
              // Secret is valid - clear error and call onChange with selection
              setValidationError('');
              onChange({ ...secret, invalid: false });
            }
          } else {
            setValidationError('');
            onChange(undefined);
          }
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
