import * as React from 'react';
import { Alert, Button, Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import './ConfigurePipelinesServerModal.scss';
import { convertAWSSecretData } from '~/pages/projects/screens/detail/data-connections/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { isAWSValid } from '~/pages/projects/screens/spawner/spawnerUtils';
import { createPipelinesCR, deleteSecret } from '~/api';
import useDataConnections from '~/pages/projects/screens/detail/data-connections/useDataConnections';
import { PipelinesDatabaseSection } from './PipelinesDatabaseSection';
import { ObjectStorageSection } from './ObjectStorageSection';
import {
  DATABASE_CONNECTION_FIELDS,
  DATABASE_CONNECTION_KEYS,
  EMPTY_DATABASE_CONNECTION,
  EXTERNAL_DATABASE_SECRET,
} from './const';
import { configureDSPipelineResourceSpec } from './utils';
import { PipelineServerConfigType } from './types';

type ConfigurePipelinesServerModalProps = {
  open: boolean;
  onClose: () => void;
};

const FORM_DEFAULTS: PipelineServerConfigType = {
  database: { useDefault: true, value: EMPTY_DATABASE_CONNECTION },
  objectStorage: { useExisting: true, existingName: '', existingValue: EMPTY_AWS_SECRET_DATA },
};

export const ConfigurePipelinesServerModal: React.FC<ConfigurePipelinesServerModalProps> = ({
  onClose,
  open,
}) => {
  const { project, namespace } = usePipelinesAPI();
  const [dataConnections, , , refresh] = useDataConnections(namespace);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [config, setConfig] = React.useState<PipelineServerConfigType>(FORM_DEFAULTS);

  React.useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  const canSubmit = () => {
    const databaseIsValid = config.database.useDefault
      ? true
      : config.database.value.every(({ key, value }) =>
          DATABASE_CONNECTION_FIELDS.filter((field) => field.isRequired)
            .map((field) => field.key)
            .includes(key as DATABASE_CONNECTION_KEYS)
            ? !!value
            : true,
        );

    const objectStorageIsValid = config.objectStorage.useExisting
      ? !!config.objectStorage.existingName
      : isAWSValid(config.objectStorage.newValue);

    return databaseIsValid && objectStorageIsValid;
  };

  const onBeforeClose = () => {
    onClose();
    setFetching(false);
    setError(null);
    setConfig(FORM_DEFAULTS);
  };

  const submit = () => {
    let objectStorage: PipelineServerConfigType['objectStorage'];
    if (config.objectStorage.useExisting) {
      const existingName = config.objectStorage.existingName;
      const existingValue = dataConnections?.find((dc) => dc.data.metadata.name === existingName);
      if (existingValue) {
        objectStorage = {
          existingValue: convertAWSSecretData(existingValue),
          existingName,
          useExisting: true,
        };
      } else {
        throw new Error('Selected data connection does not exist');
      }
    } else {
      objectStorage = {
        newValue: config.objectStorage.newValue,
        useExisting: false,
      };
    }
    setFetching(true);
    setError(null);

    const configureConfig: PipelineServerConfigType = {
      ...config,
      objectStorage,
    };

    configureDSPipelineResourceSpec(configureConfig, project.metadata.name)
      .then((spec) => {
        createPipelinesCR(namespace, spec)
          .then(() => {
            onBeforeClose();
          })
          .catch((e) => {
            setFetching(false);
            setError(e);

            // Cleanup created password secret
            deleteSecret(project.metadata.name, EXTERNAL_DATABASE_SECRET.NAME);
          });
      })
      .catch((e) => {
        setFetching(false);
        setError(e);
      });
  };

  return (
    <Modal
      title="Configure pipeline server"
      variant="medium"
      isOpen={open}
      onClose={onBeforeClose}
      actions={[
        <Button
          key="configure"
          variant="primary"
          isDisabled={!canSubmit() || fetching}
          isLoading={fetching}
          onClick={submit}
        >
          Configure
        </Button>,
        <Button key="cancel" variant="link" onClick={onBeforeClose}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <ObjectStorageSection
              setConfig={setConfig}
              config={config}
              dataConnections={dataConnections}
            />
            <PipelinesDatabaseSection setConfig={setConfig} config={config} />
          </Form>
        </StackItem>
        {error && (
          <StackItem>
            <Alert variant="danger" isInline title="Error configuring pipeline server">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};
