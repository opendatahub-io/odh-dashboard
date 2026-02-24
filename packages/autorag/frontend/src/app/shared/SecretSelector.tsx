import * as React from 'react';
import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  Skeleton,
  SelectOptionProps,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import { TypeaheadSelect } from 'mod-arch-shared';
import type { TypeaheadSelectProps } from 'mod-arch-shared/dist/components/TypeaheadSelect';
import { getSecrets } from '~/app/api/k8s';
import { SecretListItem } from '~/app/types';

export type SecretSelection = {
  uuid: string;
  name: string;
};

type TypeaheadSelectOption = Omit<SelectOptionProps, 'content' | 'isSelected'> & {
  content: string | number;
  value: string | number;
  isSelected?: boolean;
  description?: string;
};

type SecretSelectorProps = Omit<
  TypeaheadSelectProps,
  'selectOptions' | 'selected' | 'onSelect' | 'placeholder' | 'toggleWidth' | 'onChange'
> & {
  namespace: string;
  type?: string;
  value?: string; // The UUID of the selected secret
  onChange: (selection: SecretSelection | undefined) => void;
  label?: string;
  isFullWidth?: boolean;
};

const SecretSelector: React.FC<SecretSelectorProps> = ({
  namespace,
  type,
  value,
  onChange,
  label = 'Select a secret',
  isDisabled = false,
  isRequired = false,
  previewDescription = false,
  isFullWidth = false,
  dataTestId = 'secret-selector',
  ...props
}) => {
  const callback = React.useCallback<FetchStateCallbackPromise<SecretListItem[]>>(
    (opts: APIOptions) => getSecrets('')(namespace, type)(opts),
    [namespace, type],
  );

  const [secrets, loaded, error] = useFetchState<SecretListItem[]>(callback, []);

  const hasSecrets = secrets.length > 0;
  const hasError = !!error;
  const isLoading = !loaded;
  const isSelectDisabled = isDisabled || hasError || !hasSecrets || isLoading;

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      secrets.map((secret) => ({
        content: secret.name,
        value: secret.uuid,
        isSelected: secret.uuid === value,
        description: `Type: ${secret.type}`,
      })),
    [secrets, value],
  );

  if (isLoading) {
    return <Skeleton style={{ minWidth: 100 }} />;
  }

  return (
    <>
      <TypeaheadSelect
        {...props}
        placeholder={label}
        selectOptions={options}
        selected={value}
        dataTestId={dataTestId}
        isDisabled={isSelectDisabled}
        isRequired={isRequired}
        previewDescription={previewDescription}
        toggleWidth={isFullWidth ? '100%' : undefined}
        toggleProps={{
          status: hasError ? 'danger' : undefined,
        }}
        onSelect={(
          _:
            | React.MouseEvent<Element, MouseEvent>
            | React.KeyboardEvent<HTMLInputElement>
            | undefined,
          selection: string | number,
        ) => {
          const uuid = String(selection);
          const secret = secrets.find((s) => s.uuid === uuid);
          if (secret) {
            onChange({ uuid: secret.uuid, name: secret.name });
          } else {
            onChange(undefined);
          }
        }}
      />
      {hasError && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
              Secrets could not be fetched
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </>
  );
};

export default SecretSelector;
