import * as React from 'react';
import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  Skeleton,
  SelectOptionProps,
  Form,
  FormGroup,
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
  'selectOptions' | 'selected' | 'onSelect' | 'onChange'
> & {
  namespace: string;
  type?: 'storage' | 'lls';
  value?: string; // The UUID of the selected secret
  onChange: (selection: SecretSelection | undefined) => void;
  label?: string;
};

const SecretSelector: React.FC<SecretSelectorProps> = ({
  namespace,
  type,
  value,
  onChange,
  label = '',
  placeholder = 'Select a secret',
  isDisabled = false,
  isRequired = false,
  previewDescription = false,
  toggleWidth = '100%',
  dataTestId = 'secret-selector',
  ...props
}) => {
  const uniqueId = React.useId();
  const callback = React.useCallback<FetchStateCallbackPromise<SecretListItem[]>>(
    (opts: APIOptions) => getSecrets('')(namespace, type)(opts),
    [namespace, type],
  );

  const [secrets, loaded, error] = useFetchState<SecretListItem[]>(callback, []);
  // Memoize to prevent new array reference on every render
  const secretsList = React.useMemo(() => secrets, [secrets]);
  const hasSecrets = secretsList.length > 0;
  const hasError = !!error;
  const isLoading = !loaded;
  const hasNoSecrets = loaded && !hasError && !hasSecrets;
  const isSelectDisabled = isDisabled || hasError || !hasSecrets || isLoading;

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      secretsList.map((secret) => ({
        content: secret.name,
        value: secret.uuid,
        isSelected: secret.uuid === value,
        description: secret.type ? `Type: ${secret.type}` : '',
      })),
    [secretsList, value],
  );

  if (isLoading) {
    return <Skeleton width={toggleWidth} />;
  }

  const typeahead = (
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
          const secret = secretsList.find((s) => s.uuid === uuid);
          if (secret) {
            onChange({ uuid: secret.uuid, name: secret.name });
          } else {
            onChange(undefined);
          }
        }}
      />
      {(hasError || hasNoSecrets) && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem
              variant={hasError ? 'error' : 'indeterminate'}
              icon={hasError ? <ExclamationCircleIcon /> : undefined}
            >
              {hasError
                ? 'Secrets could not be fetched'
                : 'There are no secrets in the selected namespace'}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </>
  );

  return label ? (
    <Form>
      <FormGroup label={label} isRequired={isRequired} fieldId={uniqueId}>
        {typeahead}
      </FormGroup>
    </Form>
  ) : (
    typeahead
  );
};

export default SecretSelector;
