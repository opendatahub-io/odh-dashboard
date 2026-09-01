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
import { TypeaheadSelect } from '@odh-dashboard/ui-core';
import type { TypeaheadSelectProps } from '@odh-dashboard/ui-core';
import * as React from 'react';
import { useAutoXApi } from '../../context';
import type { SecretListItem } from '../../api/k8s';
import { formatMissingKeysMessage, getMissingRequiredKeys } from '../../utils/secretValidation';

export interface SecretSelection extends SecretListItem {
  invalid?: boolean;
}

type TypeaheadSelectOption = Omit<SelectOptionProps, 'content' | 'isSelected'> & {
  content: string | number;
  value: string | number;
  isSelected?: boolean;
  description?: React.ReactNode;
};

export type SecretSelectorProps = Omit<
  TypeaheadSelectProps,
  'selectOptions' | 'selected' | 'onSelect' | 'onChange'
> & {
  namespace: string;
  type?: string;
  value?: string;
  onChange: (selection: SecretSelection | undefined) => void;
  additionalRequiredKeys?: Readonly<Partial<Record<string, readonly string[]>>>;
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
  const { k8s } = useAutoXApi();
  const [validationError, setValidationError] = React.useState<string>('');

  const callback = React.useCallback<FetchStateCallbackPromise<SecretListItem[]>>(
    (opts: APIOptions) => k8s.getSecrets('')(namespace, type)(opts),
    [k8s, namespace, type],
  );

  const [secrets, loaded, error, refresh] = useFetchState<SecretListItem[]>(callback, []);

  React.useEffect(() => {
    onRefreshReady?.(refresh);
  }, [refresh, onRefreshReady]);

  const secretsList = React.useMemo(() => (Array.isArray(secrets) ? secrets : []), [secrets]);
  const hasSecrets = secretsList.length > 0;
  const hasError = !!error;
  const isLoading = !loaded;
  const hasNoSecrets = loaded && !hasError && !hasSecrets;
  const isSelectDisabled = isDisabled || hasError || !hasSecrets || isLoading;

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
    if (!value || secretsList.length === 0) {
      setValidationError('');
      return;
    }
    const secret = secretsList.find((item) => item.uuid === value);
    if (!secret) {
      setValidationError('');
      return;
    }
    setValidationError(formatMissingKeysMessage(validateSecretKeys(secret)));
  }, [value, secretsList, validateSecretKeys]);

  React.useEffect(() => {
    if (!loaded || error || !value) {
      return;
    }
    if (secretsList.length === 0 || !secretsList.some((secret) => secret.uuid === value)) {
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
          isSelected: secret.uuid === value,
          description: labels.length ? (
            <LabelGroup className="pf-v6-u-mt-sm">{labels}</LabelGroup>
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
