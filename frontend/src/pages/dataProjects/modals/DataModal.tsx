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
  NumberInput,
  Radio,
  Select,
  SelectOption,
  TextInput,
  Title,
} from '@patternfly/react-core';
import DatabaseProviderCard from '../components/DatabaseProviderCard';
import { mockDataSources } from '../mockData';
import { DATA_SOURCE, NotebookList, Project } from 'types';
import { createPvc, getStorageClasses } from '../../../services/storageService';
import {
  ANNOTATION_NOTEBOOK_IMAGE_TAG_DEFAULT,
  ANNOTATION_STORAGE_CLASS_DEFAULT,
} from '../../../utilities/const';

type DataModalProps = {
  project: Project | undefined;
  notebookList: NotebookList | undefined;
  isModalOpen: boolean;
  onClose: () => void;
  dispatchError: (e: Error, title: string) => void;
  data: any;
};

const DataModal: React.FC<DataModalProps> = React.memo(
  ({ project, notebookList, data, isModalOpen, onClose, dispatchError }) => {
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
    // Loaded Data
    const [storageClasses, setStorageClasses] = React.useState<any>(undefined);
    const [storageClassesLoading, setStorageClassesLoading] = React.useState<any>(false);

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
        loadSettings();
        if (action === 'Add') {
          initData();
        }
        if (nameInputRef && nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    }, [isModalOpen]);

    const loadStorageClasses = () => {
      setStorageClassesLoading(true);
      getStorageClasses()
        .then((sc: any) => {
          setStorageClasses(sc);
          setStorageClassesLoading(false);
        })
        .catch((e) => {
          dispatchError(e, 'Load Storage Classes Error');
        });
    };

    const loadSettings = () => {
      loadStorageClasses();
    };

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
        if (data.source === DATA_SOURCE.databaseAccess) {
          setSelectedDatabaseProvider(data.providerId);
          setDbProviderAccount(data.account);
          setSelectedDatabase(data.database);
        }
      }
    }, [data]);

    React.useEffect(() => {
      const db = mockDataSources.find((ds) => ds.id === DATA_SOURCE.databaseAccess);
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
      const defaultStorageClass = storageClasses.items.find(
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
      console.log('DataModal handleDataAction', dataSource);
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
        {dataSource === DATA_SOURCE.persistentVolume && (
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
                    value={pvName}
                    onChange={(value) => setPvName(value)}
                  />
                </FormGroup>
                <FormGroup fieldId="new-pv-description" label="Description">
                  <TextInput
                    id="new-pv-description-input"
                    name="new-pv-description-input"
                    value={pvDescription}
                    onChange={(value) => setPvDescription(value)}
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
                    <NumberInput
                      id="new-pv-size-input"
                      type="number"
                      name="new-pv-size-input"
                      value={pvSize}
                      onMinus={() => setPvSize((pvSize || 1) - 1)}
                      onChange={(e) => setPvSize(e.target.value)}
                      onPlus={() => setPvSize((pvSize || 0) + 1)}
                      widthChars={4}
                      unit="GiB"
                    />
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
        )}
        {dataSource === DATA_SOURCE.databaseAccess && (
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
        aria-label={`${action} data`}
        className="odh-data-projects__modal"
        variant={ModalVariant.large}
        title={`${action} data`}
        description="Select options for your data."
        isOpen={isModalOpen}
        onClose={onClose}
        actions={[
          <Button
            key={action.toLowerCase()}
            variant="primary"
            isDisabled={isDisabled}
            onClick={handleDataAction}
          >
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
  },
);

DataModal.displayName = 'DataModal';

export default DataModal;
