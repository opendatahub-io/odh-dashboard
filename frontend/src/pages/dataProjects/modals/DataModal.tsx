import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Grid,
  GridItem,
  InputGroup,
  InputGroupText,
  Modal,
  ModalVariant,
  Radio,
  Select,
  SelectOption,
  TextInput,
  Title,
} from '@patternfly/react-core';
import DatabaseProviderCard from '../components/DatabaseProviderCard';
import { mockDatabaseProvider } from '../mockData';

type DataModalProps = {
  isModalOpen: boolean;
  onClose: () => void;
  data: any;
};

const DataModal: React.FC<DataModalProps> = React.memo(({ data, isModalOpen, onClose }) => {
  const action = data ? 'Edit' : 'Add';
  const [dataSource, setDataSource] = React.useState('');
  const [dataSourceDropdownOpen, setDataSourceDropdownOpen] = React.useState(false);
  // PV states
  const [isCreatePVChecked, setCreatePVChecked] = React.useState(true);
  const [newPVName, setNewPVName] = React.useState('');
  const [newPVDescription, setNewPVDescription] = React.useState('');
  const [isConnectToAllEnvChecked, setConnectToAllEnvChecked] = React.useState(true);
  const [newPVSize, setNewPVSize] = React.useState('');
  // Database states
  const [selectedDatabaseProvider, setSelectedDatabaseProvider] = React.useState('');
  const [dbProviderAccountDropdownOpen, setDbProviderAccountDropdownOpen] = React.useState(false);
  const [dbProviderAccount, setDbProviderAccount] = React.useState('');
  const [selectedDatabase, setSelectedDatabase] = React.useState('');

  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isModalOpen && nameInputRef && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isModalOpen]);

  React.useEffect(() => {
    if (data) {
      setDataSource('');
    } else {
      setDataSource('');
    }
  }, [data]);

  const handleDataSourceSelection = (e, selection) => {
    setDataSource(selection);
    setDataSourceDropdownOpen(false);
  };

  const handleDbProviderAccountSelection = (e, selection) => {
    setDbProviderAccount(selection);
    setDbProviderAccountDropdownOpen(false);
  };

  const handleDatabaseSelection = (_, event) => {
    const { value } = event.currentTarget;
    setSelectedDatabase(value);
  };

  const dataSources = [
    'PV (persistent volume)',
    'Database Access',
    'Starburst',
    'S3 Bucket',
    'Other data source',
  ];

  const dataSourceOptions = dataSources.map((ds, index) => <SelectOption key={index} value={ds} />);

  const handleDatabaseProviderSelect = (event: React.MouseEvent) => {
    const { id } = event.currentTarget;
    const newSelected = id === selectedDatabaseProvider ? '' : id;
    setSelectedDatabaseProvider(newSelected);
    setDbProviderAccount('');
    setSelectedDatabase('');
  };

  const renderDatabaseProviderSelect = (providerId: string) => {
    const provider = mockDatabaseProvider.find((provider) => provider.id === providerId);
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

  const renderForm = () => {
    if (!dataSource) {
      return null;
    }
    if (dataSource === dataSources[0]) {
      return (
        <>
          <Radio
            isChecked={isCreatePVChecked}
            name="create-new-pv"
            id="create-new-pv"
            label="Create new PV"
            onChange={() => setCreatePVChecked(true)}
          />
          {isCreatePVChecked && (
            <div className="odh-data-projects__modal-new-pv">
              <FormGroup fieldId="new-pv-name" label="Name">
                <TextInput
                  id="new-pv-name-input"
                  name="new-pv-name-input"
                  value={newPVName}
                  onChange={(value) => setNewPVName(value)}
                />
              </FormGroup>
              <FormGroup fieldId="new-pv-description" label="Description">
                <TextInput
                  id="new-pv-description-input"
                  name="new-pv-description-input"
                  value={newPVDescription}
                  onChange={(value) => setNewPVDescription(value)}
                />
              </FormGroup>
              <Radio
                isChecked={isConnectToAllEnvChecked}
                name="new-pv-connect-to-all-environments"
                id="new-pv-connect-to-all-environments"
                label="Connect to all Environments"
                onChange={() => setConnectToAllEnvChecked(true)}
              />
              <Radio
                isChecked={!isConnectToAllEnvChecked}
                name="new-pv-connect-to-specific-environment"
                id="new-pv-connect-to-specific-environment"
                label="Connect to a specific Environment"
                onChange={() => setConnectToAllEnvChecked(false)}
              />
              <FormGroup fieldId="new-pv-size" label="Size">
                <InputGroup>
                  <TextInput
                    id="new-pv-size-input"
                    type="number"
                    name="new-pv-size-input"
                    value={newPVSize}
                    onChange={(value) => setNewPVSize(value)}
                  />
                  <InputGroupText variant="plain">GiB</InputGroupText>
                </InputGroup>
              </FormGroup>
            </div>
          )}
          <Radio
            isChecked={!isCreatePVChecked}
            name="add-existing-pv"
            id="add-existing-pv"
            label="Add existing PV"
            onChange={() => setCreatePVChecked(false)}
          />
        </>
      );
    }
    if (dataSource === dataSources[1]) {
      return (
        <>
          <Title headingLevel="h4" size="md">
            Choose a provider:
          </Title>
          <FormGroup fieldId="database-access-provider">
            <Flex>
              {mockDatabaseProvider.map((provider) => (
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
          {renderDatabaseProviderSelect(selectedDatabaseProvider)}
        </>
      );
    }
    return null;
  };

  return (
    <Modal
      aria-label={`${action} data`}
      className="odh-data-projects__modal"
      variant={ModalVariant.large}
      title={`${action} data`}
      description="Select options for your data."
      isOpen={isModalOpen}
      onClose={onClose}
      actions={[
        <Button key={action.toLowerCase()} variant="primary" isDisabled={dataSource === ''}>
          {`${action} data`}
        </Button>,
        <Button key="cancel" variant="secondary" onClick={onClose}>
          Cancel
        </Button>,
      ]}
    >
      <Title headingLevel="h3" size="lg" className="odh-data-projects__modal-title">
        Choose a data source or type:
      </Title>
      <Form className="odh-data-projects__modal-form">
        <FormGroup fieldId="modal-data-data-source">
          <Select
            isOpen={dataSourceDropdownOpen}
            onToggle={() => setDataSourceDropdownOpen(!dataSourceDropdownOpen)}
            aria-labelledby="data-source-dropdown"
            placeholderText="Choose one"
            selections={dataSource}
            onSelect={handleDataSourceSelection}
            menuAppendTo="parent"
          >
            {dataSourceOptions}
          </Select>
        </FormGroup>
        {renderForm()}
      </Form>
    </Modal>
  );
});

DataModal.displayName = 'DataModal';

export default DataModal;
