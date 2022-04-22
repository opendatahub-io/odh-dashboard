import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Grid,
  GridItem,
  Modal,
  ModalVariant,
  Radio,
  Select,
  SelectOption,
  Title,
} from '@patternfly/react-core';
import DatabaseProviderCard from '../components/DatabaseProviderCard';
import { mockDataSources } from '../mockData';
import { DATA_SOURCE, NotebookList, Project, StorageClassList } from 'types';
import { createPvc } from '../../../services/storageService';
import { ANNOTATION_STORAGE_CLASS_DEFAULT } from '../../../utilities/const';

type DataModalProps = {
  project: Project | undefined;
  notebookList: NotebookList | undefined;
  storageClassList: StorageClassList | undefined;
  isModalOpen: boolean;
  onClose: () => void;
  dispatchError: (e: Error, title: string) => void;
  data: any;
};

const DataModal: React.FC<DataModalProps> = React.memo(
  ({ project, notebookList, storageClassList, data, isModalOpen, onClose, dispatchError }) => {
    const action = data ? 'Edit' : 'Add';
    const [dataSource, setDataSource] = React.useState('');
    const [dataSourceDropdownOpen, setDataSourceDropdownOpen] = React.useState(false);
    // PV states
    const [isCreatePVChecked, setCreatePVChecked] = React.useState(true);
    const [pvName, setPvName] = React.useState('');
    const [pvDescription, setPvDescription] = React.useState('');
    const [isConnectToAllEnvChecked, setConnectToAllEnvChecked] = React.useState(true);
    const [pvSize, setPvSize] = React.useState(1);
    // Database states
    const [dbProviders, setDbProviders] = React.useState<any>([]);
    const [selectedDatabaseProvider, setSelectedDatabaseProvider] = React.useState('');
    const [dbProviderAccountDropdownOpen, setDbProviderAccountDropdownOpen] = React.useState(false);
    const [dbProviderAccount, setDbProviderAccount] = React.useState('');
    const [selectedDatabase, setSelectedDatabase] = React.useState('');

    const nameInputRef = React.useRef<HTMLInputElement>(null);

    const validate = () => {
      if (dataSource === DATA_SOURCE.persistentVolume) {
        return pvName && pvSize && pvSize > 0;
      }
      return true;
    };

    const isDisabled = !validate();

    React.useEffect(() => {
      if (isModalOpen) {
        if (action === 'Add') {
          initData();
        }
        if (nameInputRef && nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    }, [isModalOpen]);

    React.useEffect(() => {
      initData();
      if (data) {
        setDataSource(data.source);
        if (data.source === DATA_SOURCE.persistentVolume) {
          setPvName(data.name);
          setPvDescription(data.description);
          setPvSize(data.size);
          setConnectToAllEnvChecked(data.allEnvironmentsConnections);
        }
        if (data.source === DATA_SOURCE.database) {
          setSelectedDatabaseProvider(data.providerId);
          setDbProviderAccount(data.account);
          setSelectedDatabase(data.database);
        }
      }
    }, [data]);

    React.useEffect(() => {
      const db = mockDataSources.find((ds) => ds.id === DATA_SOURCE.database);
      if (db && db.providers) {
        setDbProviders(db.providers);
      }
    }, [mockDataSources]);

    const initData = () => {
      setDataSource('');
      setCreatePVChecked(true);
      setPvName('');
      setPvDescription('');
      setConnectToAllEnvChecked(true);
      setPvSize(1);
      setSelectedDatabaseProvider('');
      setDbProviderAccount('');
      setSelectedDatabase('');
    };

    const handleDataSourceSelection = (event, selection) => {
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

    const dataSourceOptions = Object.values(mockDataSources).map((ds, index) => (
      <SelectOption id={ds.id} key={index} value={ds.id}>
        {ds.name}
      </SelectOption>
    ));

    const handleDatabaseProviderSelect = (event: React.MouseEvent) => {
      const { id } = event.currentTarget;
      const newSelected = id === selectedDatabaseProvider ? '' : id;
      setSelectedDatabaseProvider(newSelected);
      setDbProviderAccount('');
      setSelectedDatabase('');
    };

    const addPvc = () => {
      const defaultStorageClass = storageClassList?.items.find(
        (sc) => sc.metadata?.annotations?.[ANNOTATION_STORAGE_CLASS_DEFAULT] === 'true',
      );

      if (project && defaultStorageClass) {
        createPvc(
          project.metadata.name,
          pvName,
          pvDescription,
          defaultStorageClass.metadata.name,
          pvSize + 'Gi',
        ).then(onClose);
      }
    };

    const handleDataAction = () => {
      if (dataSource === DATA_SOURCE.persistentVolume) {
        addPvc();
      }
    };

    const renderDatabaseProviderSelect = () => {
      const provider = dbProviders.find((provider) => provider.id === selectedDatabaseProvider);
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

    const renderForm = () => (
      <>
        {dataSource === DATA_SOURCE.database && (
          <>
            <Title headingLevel="h4" size="md">
              Choose a provider:
            </Title>
            <FormGroup fieldId="database-access-provider">
              <Flex>
                {dbProviders.map((provider) => (
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
        )}
      </>
    );

    return (
      <Modal
        aria-label={`${action} data source`}
        className="odh-data-projects__modal"
        variant={ModalVariant.large}
        title={`${action} data source`}
        description="Select options for your data source."
        isOpen={isModalOpen}
        onClose={onClose}
        actions={[
          <Button
            key={action.toLowerCase()}
            variant="primary"
            isDisabled={isDisabled}
            onClick={handleDataAction}
          >
            {`${action} data source`}
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
  },
);

DataModal.displayName = 'DataModal';

export default DataModal;
