import * as React from 'react';
import {
  Flex,
  FlexItem,
  FormGroup,
  Grid,
  GridItem,
  Radio,
  Select,
  SelectOption,
  Title,
} from '@patternfly/react-core';
import DatabaseProviderCard from '../../components/DatabaseProviderCard';
import { mockDataSources } from '../../mockData';
import { DATA_SOURCE, Notebook, NotebookList } from 'types';

type DatabaseAccessFormProps = {
  notebookList: NotebookList | undefined;
  setInfo: (info) => void;
};

const DatabaseAccessForm: React.FC<DatabaseAccessFormProps> = React.memo(
  ({ notebookList, setInfo }) => {
    const [selectedDatabaseProvider, setSelectedDatabaseProvider] = React.useState('');
    const [dbProviderAccountDropdownOpen, setDbProviderAccountDropdownOpen] = React.useState(false);
    const [dbProviderAccount, setDbProviderAccount] = React.useState('');
    const [selectedDatabase, setSelectedDatabase] = React.useState('');
    const [isNotebookSelectOpen, setIsNotebookSelectOpen] = React.useState(false);
    const [selectedNotebook, setSelectedNotebook] = React.useState<Notebook | undefined>(undefined);

    const db = mockDataSources.find((ds) => ds.id === DATA_SOURCE.database);

    let notebookSelectOptions = [<SelectOption key={0} value="None" />];
    if (notebookList?.items?.length) {
      notebookSelectOptions = notebookSelectOptions.concat(
        notebookList?.items?.map((notebook, index) => (
          <SelectOption key={index + 1} value={notebook.metadata.name} />
        )),
      );
    }

    const handleDbProviderAccountSelection = (e, selection) => {
      setDbProviderAccount(selection);
      setDbProviderAccountDropdownOpen(false);
    };

    const handleDatabaseSelection = (_, event) => {
      const { value } = event.currentTarget;
      setSelectedDatabase(value);
    };

    const handleDatabaseProviderSelect = (event: React.MouseEvent) => {
      const { id } = event.currentTarget;
      const newSelected = id === selectedDatabaseProvider ? '' : id;
      setSelectedDatabaseProvider(newSelected);
      setDbProviderAccount('');
      setSelectedDatabase('');
    };

    const handleNotebookSelection = (e, value, isPlaceholder) => {
      if (value === 'None') {
        setSelectedNotebook(undefined);
      } else {
        const selected = notebookList?.items.find((nb) => nb.metadata.name === value);
        setSelectedNotebook(selected);
      }
      setIsNotebookSelectOpen(false);
    };

    const renderDatabaseProviderSelect = () => {
      const provider = db?.providers?.find((provider) => provider.id === selectedDatabaseProvider);
      if (!provider) {
        return null;
      }
      return (
        <>
          <Title headingLevel="h4" size="md">
            Choose a provider account:
          </Title>
          <FormGroup fieldId="database-access-provider-account">
            <Select
              isOpen={dbProviderAccountDropdownOpen}
              onToggle={() => setDbProviderAccountDropdownOpen(!dbProviderAccountDropdownOpen)}
              aria-labelledby="database-access-provider-account-dropdown"
              placeholderText="Choose one"
              selections={dbProviderAccount}
              onSelect={handleDbProviderAccountSelection}
              menuAppendTo="parent"
            >
              {provider.spec.accounts.map((dbAccount, index) => (
                <SelectOption key={index} value={dbAccount} />
              ))}
            </Select>
          </FormGroup>
          <Title headingLevel="h4" size="md">
            Choose a database:
          </Title>
          <FormGroup fieldId="database-access-database">
            <Grid sm={12} md={6} lg={6} xl={6} xl2={6} hasGutter>
              {provider.spec.database.map((database) => (
                <GridItem key={`${provider.id}-database-${database}`}>
                  <Radio
                    key={`${provider.id}-database-${database}`}
                    isChecked={selectedDatabase === database}
                    name={`${provider.id}-database-${database}`}
                    id={`${provider.id}-database-${database}`}
                    label={database}
                    value={database}
                    onChange={handleDatabaseSelection}
                  />
                </GridItem>
              ))}
            </Grid>
          </FormGroup>
        </>
      );
    };

    return (
      <>
        <Title headingLevel="h4" size="md">
          Choose a provider:
        </Title>
        <FormGroup fieldId="database-access-provider">
          <Flex>
            {db?.providers?.map((provider) => (
              <FlexItem key={provider.id}>
                <DatabaseProviderCard
                  provider={provider}
                  isSelected={selectedDatabaseProvider === provider.id}
                  onSelect={handleDatabaseProviderSelect}
                />
              </FlexItem>
            ))}
          </Flex>
        </FormGroup>
        {renderDatabaseProviderSelect()}
      </>
    );
  },
);

DatabaseAccessForm.displayName = 'DatabaseAccessForm';

export default DatabaseAccessForm;
