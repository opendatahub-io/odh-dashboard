import * as React from 'react';
import {
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  Truncate,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import { getSecrets } from '~/app/api/k8s';
import { SecretListItem } from '~/app/types';

export type SecretSelection = {
  uuid: string;
  name: string;
};

type SecretSelectorProps = {
  namespace: string;
  type?: string;
  value?: string; // The UUID of the selected secret
  onChange: (selection: SecretSelection | undefined) => void;
  label?: string;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  dataTestId?: string;
};

const SecretSelector: React.FC<SecretSelectorProps> = ({
  namespace,
  type,
  value,
  onChange,
  label = 'Select a secret',
  isDisabled = false,
  isFullWidth = false,
  dataTestId = 'secret-selector',
}) => {
  const [open, setOpen] = React.useState(false);

  const callback = React.useCallback<FetchStateCallbackPromise<SecretListItem[]>>(
    (opts: APIOptions) => getSecrets('')(namespace, type)(opts),
    [namespace, type],
  );

  const [secrets, loaded, error] = useFetchState<SecretListItem[]>(callback, []);

  const selectedSecret = secrets.find((secret) => secret.uuid === value);
  const selectedLabel = selectedSecret?.name ?? label;

  const hasSecrets = secrets.length > 0;
  const hasError = !!error;
  const isLoading = !loaded;
  const isSelectDisabled = isDisabled || hasError || !hasSecrets || isLoading;

  if (isLoading) {
    return <Skeleton style={{ minWidth: 100 }} />;
  }

  return (
    <>
      <Select
        isOpen={open}
        selected={value}
        onSelect={(e, selectValue) => {
          const uuid = String(selectValue);
          const secret = secrets.find((s) => s.uuid === uuid);
          if (secret) {
            onChange({ uuid: secret.uuid, name: secret.name });
          } else {
            onChange(undefined);
          }
          setOpen(false);
        }}
        onOpenChange={setOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            data-testid={dataTestId}
            aria-label={label}
            onClick={() => setOpen(!open)}
            isExpanded={open}
            isDisabled={isSelectDisabled}
            isFullWidth={isFullWidth}
            status={hasError ? 'danger' : undefined}
          >
            <Truncate content={selectedLabel} className="truncate-no-min-width" />
          </MenuToggle>
        )}
        shouldFocusToggleOnSelect
        popperProps={{ maxWidth: 'trigger' }}
      >
        <SelectList>
          {secrets.map((secret) => (
            <SelectOption
              key={secret.uuid}
              value={secret.uuid}
              description={`Type: ${secret.type}`}
              data-testid={`${dataTestId}-option-${secret.name}`}
            >
              {secret.name}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
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
