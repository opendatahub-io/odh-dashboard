import {
  FormSection,
  Title,
  FormGroup,
  ExpandableSection,
  Radio,
  Text,
} from '@patternfly/react-core';
import React from 'react';
import DatabaseConnectionField from './DatabaseConnectionField';
import { PipelineServerConfigType } from './types';
import './ConfigurePipelinesServerModal.scss';

type PipelinesDatabaseSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
};

export const PipelinesDatabaseSection = ({ setConfig, config }: PipelinesDatabaseSectionProps) => {
  const [databaseIsExpanded, setDatabaseIsExpanded] = React.useState(false);

  return (
    <FormSection
      title={
        <>
          <Title headingLevel="h2">Database</Title>
          <Text component="p" className="form-subtitle-text">
            To store data science pipelines. By default we include a database that will store this
            on your cluster.
          </Text>
        </>
      }
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
              className="checkbox-radio-fix-body-width"
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
              className="checkbox-radio-fix-body-width"
              name="database-type-radio"
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
