import React from 'react';
import { FormGroup, Radio } from '@patternfly/react-core';
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
          label="Default database on the cluster"
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
        />
        <Radio
          name="database-type-radio"
          data-testid="external-database-type-radio"
          id="external-database-type-radio"
          label="External MySQL database"
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
