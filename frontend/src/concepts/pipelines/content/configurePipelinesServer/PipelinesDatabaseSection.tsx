import React from 'react';
import { Alert, FormGroup, Radio, Stack, StackItem } from '@patternfly/react-core';
import FormSection from '#~/components/pf-overrides/FormSection';
import DatabaseConnectionField from './DatabaseConnectionField';
import { PipelineServerConfigType } from './types';

type PipelinesDatabaseSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

export const PipelinesDatabaseSection = ({
  setConfig,
  config,
}: PipelinesDatabaseSectionProps): React.JSX.Element => (
  <FormSection
    title="Database"
    description="Choose where to store pipeline metadata and run information."
  >
    <FormGroup hasNoPaddingTop isStack>
      <FormGroup hasNoPaddingTop isStack>
        <Radio
          name="database-type-radio"
          id="default-database-connection-type-radio"
          label="Default database (non-production)"
          description="MariaDB database enabled by default on the cluster."
          isChecked={config.database.useDefault}
          onChange={() =>
            setConfig({
              ...config,
              database: {
                ...config.database,
                useDefault: true,
              },
            })
          }
          body={
            config.database.useDefault && (
              <Stack hasGutter>
                <StackItem>
                  <Alert
                    variant="info"
                    isInline
                    isPlain
                    title="This default database is for development and testing purposes only. It is not supported by Red Hat for production use cases."
                  />
                </StackItem>
              </Stack>
            )
          }
        />
        <Radio
          name="database-type-radio"
          data-testid="external-database-type-radio"
          id="external-database-type-radio"
          label="External database"
          description="Connect a MySQL database."
          isChecked={!config.database.useDefault}
          onChange={() =>
            setConfig({
              ...config,
              database: {
                ...config.database,
                useDefault: false,
              },
            })
          }
          body={
            !config.database.useDefault && (
              <DatabaseConnectionField
                values={config.database.value}
                onUpdate={(newEnvData) =>
                  setConfig({
                    ...config,
                    database: {
                      useDefault: false,
                      value: newEnvData,
                    },
                  })
                }
              />
            )
          }
        />
      </FormGroup>
    </FormGroup>
  </FormSection>
);
