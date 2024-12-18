import React from 'react';
import { Alert, HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import PasswordInput from '~/components/PasswordInput';
import { ModelRegistryKind } from '~/k8sTypes';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { getModelRegistryBackend } from '~/services/modelRegistrySettingsService';

type ModelRegistryDatabasePasswordProps = {
  password: string | undefined;
  setPassword: (value: string) => void;
  showPassword?: boolean;
  isPasswordTouched?: boolean;
  setIsPasswordTouched: (value: boolean) => void;
  editRegistry?: ModelRegistryKind;
};

const ModelRegistryDatabasePassword: React.FC<ModelRegistryDatabasePasswordProps> = ({
  password = '',
  setPassword,
  showPassword,
  isPasswordTouched,
  setIsPasswordTouched,
  editRegistry: mr,
}) => {
  const [existingDbPassword, passwordLoaded, passwordLoadError] = useFetchState(
    React.useCallback<FetchStateCallbackPromise<string | undefined>>(async () => {
      if (!mr) {
        return Promise.reject(new NotReadyError('Model registry does not exist'));
      }

      const { databasePassword } = await getModelRegistryBackend(mr.metadata.name);
      return databasePassword;
    }, [mr]),
    undefined,
  );

  React.useEffect(() => {
    if (existingDbPassword && mr) {
      setPassword(existingDbPassword);
    }
  }, [existingDbPassword, setPassword, mr]);

  const hasContent = (value: string): boolean => !!value.trim().length;

  if (!passwordLoaded && !passwordLoadError && mr) {
    return <Skeleton screenreaderText="Loading contents" />;
  }

  if (passwordLoadError) {
    return (
      <Alert
        variant="danger"
        isInline
        isPlain
        title="Failed to load the password. The Secret file is missing."
      />
    );
  }

  return (
    <>
      <PasswordInput
        isRequired
        type={showPassword ? 'text' : 'password'}
        id="mr-password"
        name="mr-password"
        value={password}
        onBlur={() => setIsPasswordTouched(true)}
        onChange={(_e, value) => setPassword(value)}
        validated={isPasswordTouched && !hasContent(password) ? 'error' : 'default'}
      />
      {isPasswordTouched && !hasContent(password) && (
        <HelperText>
          <HelperTextItem variant="error" data-testid="mr-password-error">
            Password cannot be empty
          </HelperTextItem>
        </HelperText>
      )}
    </>
  );
};

export default ModelRegistryDatabasePassword;
