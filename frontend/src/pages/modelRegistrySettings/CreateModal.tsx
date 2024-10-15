import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import PasswordInput from '~/components/PasswordInput';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { ModelRegistryKind } from '~/k8sTypes';
import { ModelRegistryModel } from '~/api';
import { createModelRegistryBackend } from '~/services/modelRegistrySettingsService';
import { isValidK8sName, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { NameDescType } from '~/pages/projects/types';
import FormSection from '~/components/pf-overrides/FormSection';
import { AreaContext } from '~/concepts/areas/AreaContext';

type CreateModalProps = {
  onClose: () => void;
  refresh: () => Promise<unknown>;
};

const CreateModal: React.FC<CreateModalProps> = ({ onClose, refresh }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [nameDesc, setNameDesc] = React.useState<NameDescType>({
    name: '',
    k8sName: undefined,
    description: '',
  });
  const [host, setHost] = React.useState('');
  const [port, setPort] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [database, setDatabase] = React.useState('');
  const [isHostTouched, setIsHostTouched] = React.useState(false);
  const [isPortTouched, setIsPortTouched] = React.useState(false);
  const [isUsernameTouched, setIsUsernameTouched] = React.useState(false);
  const [isPasswordTouched, setIsPasswordTouched] = React.useState(false);
  const [isDatabaseTouched, setIsDatabaseTouched] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const { dscStatus } = React.useContext(AreaContext);

  const onBeforeClose = () => {
    setIsSubmitting(false);
    setError(undefined);
    setNameDesc({
      name: '',
      k8sName: undefined,
      description: '',
    });
    setHost('');
    setPort('');
    setUsername('');
    setPassword('');
    setDatabase('');
    setIsHostTouched(false);
    setIsPortTouched(false);
    setIsUsernameTouched(false);
    setIsPasswordTouched(false);
    setIsDatabaseTouched(false);
    setShowPassword(false);
    onClose();
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setError(undefined);
    const data: ModelRegistryKind = {
      apiVersion: `${ModelRegistryModel.apiGroup}/${ModelRegistryModel.apiVersion}`,
      kind: 'ModelRegistry',
      metadata: {
        name: nameDesc.k8sName || translateDisplayNameForK8s(nameDesc.name),
        namespace: dscStatus?.components?.modelregistry?.registriesNamespace || '',
        annotations: {
          'openshift.io/description': nameDesc.description,
          'openshift.io/display-name': nameDesc.name.trim(),
        },
      },
      spec: {
        grpc: {},
        rest: {},
        istio: {
          gateway: {
            grpc: { tls: {} },
            rest: { tls: {} },
          },
        },
        mysql: {
          host,
          port: Number(port),
          database,
          username,
          skipDBCreation: false,
        },
      },
    };
    try {
      await createModelRegistryBackend({ modelRegistry: data, databasePassword: password });
      await refresh();
      onBeforeClose();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      setIsSubmitting(false);
    }
  };

  const hasContent = (value: string): boolean => !!value.trim().length;

  const canSubmit = () =>
    !isSubmitting &&
    isValidK8sName(nameDesc.k8sName || translateDisplayNameForK8s(nameDesc.name)) &&
    hasContent(host) &&
    hasContent(password) &&
    hasContent(port) &&
    hasContent(username) &&
    hasContent(database);

  return (
    <Modal
      isOpen
      title="Create model registry"
      onClose={onBeforeClose}
      actions={[
        <Button key="create-button" variant="primary" isDisabled={!canSubmit()} onClick={onSubmit}>
          Create
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={onBeforeClose}>
          Cancel
        </Button>,
      ]}
      variant="medium"
      footer={
        <DashboardModalFooter
          onCancel={onBeforeClose}
          onSubmit={onSubmit}
          submitLabel="Create"
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!canSubmit()}
          error={error}
          alertTitle="Error creating model registry"
        />
      }
    >
      <Form>
        <NameDescriptionField
          nameFieldId="mr-name"
          descriptionFieldId="mr-description"
          data={nameDesc}
          showK8sName
          setData={(value) => {
            setNameDesc(value);
          }}
        />
        <FormSection
          title="Connect to external MySQL database"
          description="This external database is where model data is stored."
        >
          <FormGroup label="Host" isRequired fieldId="mr-host">
            <TextInput
              isRequired
              type="text"
              id="mr-host"
              name="mr-host"
              value={host}
              onBlur={() => setIsHostTouched(true)}
              onChange={(_e, value) => setHost(value)}
              validated={isHostTouched && !hasContent(host) ? 'error' : 'default'}
            />
            {isHostTouched && !hasContent(host) && (
              <HelperText>
                <HelperTextItem variant="error" data-testid="mr-host-error">
                  Host cannot be empty
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
          <FormGroup label="Port" isRequired fieldId="mr-port">
            <TextInput
              isRequired
              type="text"
              id="mr-port"
              name="mr-port"
              value={port}
              onBlur={() => setIsPortTouched(true)}
              onChange={(_e, value) => setPort(value)}
              validated={isPortTouched && !hasContent(port) ? 'error' : 'default'}
            />
            {isPortTouched && !hasContent(port) && (
              <HelperText>
                <HelperTextItem variant="error" data-testid="mr-port-error">
                  Port cannot be empty
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
          <FormGroup label="Username" isRequired fieldId="mr-username">
            <TextInput
              isRequired
              type="text"
              id="mr-username"
              name="mr-username"
              value={username}
              onBlur={() => setIsUsernameTouched(true)}
              onChange={(_e, value) => setUsername(value)}
              validated={isUsernameTouched && !hasContent(username) ? 'error' : 'default'}
            />
            {isUsernameTouched && !hasContent(username) && (
              <HelperText>
                <HelperTextItem variant="error" data-testid="mr-username-error">
                  Username cannot be empty
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
          <FormGroup label="Password" isRequired fieldId="mr-password">
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
          </FormGroup>
          <FormGroup label="Database" isRequired fieldId="mr-database">
            <TextInput
              isRequired
              type="text"
              id="mr-database"
              name="mr-database"
              value={database}
              onBlur={() => setIsDatabaseTouched(true)}
              onChange={(_e, value) => setDatabase(value)}
              validated={isDatabaseTouched && !hasContent(database) ? 'error' : 'default'}
            />
            {isDatabaseTouched && !hasContent(database) && (
              <HelperText>
                <HelperTextItem variant="error" data-testid="mr-database-error">
                  Database cannot be empty
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
        </FormSection>
      </Form>
    </Modal>
  );
};

export default CreateModal;
