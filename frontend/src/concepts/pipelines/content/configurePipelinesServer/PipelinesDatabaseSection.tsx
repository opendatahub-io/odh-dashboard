import React from 'react';
import { FormGroup, ExpandableSection, Radio } from '@patternfly/react-core';
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
}: PipelinesDatabaseSectionProps): React.JSX.Element => {
  const [databaseIsExpanded, setDatabaseIsExpanded] = React.useState(false);

  return (
    <FormSection
      title="Database"
      description="This is where your pipeline data is stored. Use the default database to store data on your cluster, or connect to an external database."
    >
      <FormGroup hasNoPaddingTop isStack>
        <ExpandableSection
          isIndented
          toggleText={`${databaseIsExpanded ? 'Hide' : 'Show'} advanced database options`}
          onToggle={() => setDatabaseIsExpanded(!databaseIsExpanded)}
          isExpanded={databaseIsExpanded}
        >
          <FormGroup hasNoPaddingTop isStack>
            <Radio
              name="database-type-radio"
              id="default-database-connection-type-radio"
              label="Use default database stored on your cluster"
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
              label="Connect to external MySQL database"
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
        </ExpandableSection>
      </FormGroup>
    </FormSection>
  );
};
