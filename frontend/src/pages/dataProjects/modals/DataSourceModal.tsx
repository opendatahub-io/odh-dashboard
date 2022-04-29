import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Select,
  SelectOption,
  Title,
} from '@patternfly/react-core';
import { DATA_SOURCE, NotebookList, Project, StorageClassList } from 'types';
import ObjectStorageForm from './dataSourceForms/ObjectStorageForm';
import DatabaseAccessForm from './dataSourceForms/DatabaseAccessForm';
import { createSecret } from '../../../services/secretService';
import { ODH_TYPE_OBJECT_STORAGE } from '../../../utilities/const';

type DataSourceModalProps = {
  project: Project | undefined;
  notebookList: NotebookList | undefined;
  storageClassList: StorageClassList | undefined;
  isModalOpen: boolean;
  onClose: () => void;
  dispatchError: (e: Error, title: string) => void;
  data: any;
};

const DataSourceModal: React.FC<DataSourceModalProps> = React.memo(
  ({ project, notebookList, storageClassList, data, isModalOpen, onClose, dispatchError }) => {
    const action = data ? 'Edit' : 'Add';
    const [dataSource, setDataSource] = React.useState('');
    const [dataSourceDropdownOpen, setDataSourceDropdownOpen] = React.useState(false);
    const [dbInfo, setDbInfo] = React.useState(undefined);
    const [objectStorageInfo, setObjectStorageInfo] = React.useState<any | undefined>(undefined);

    const nameInputRef = React.useRef<HTMLInputElement>(null);

    const validate = () => {
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
    }, [data]);

    const initData = () => {
      setDataSource('');
    };

    const handleDataSourceSelection = (event, selection) => {
      setDataSource(selection);
      setDataSourceDropdownOpen(false);
    };

    const handleDataAction = () => {
      switch (dataSource) {
        case DATA_SOURCE.database:
          console.log('create db connection', dbInfo);
          break;
        case DATA_SOURCE.objectStorage:
          if (objectStorageInfo && project) {
            createSecret(
              project.metadata.name,
              objectStorageInfo.secretName,
              {
                type: 's3',
                AWS_S3_ENDPOINT: objectStorageInfo.endpointUrl,
                AWS_ACCESS_KEY_ID: objectStorageInfo.accessKeyId,
                AWS_SECRET_ACCESS_KEY: objectStorageInfo.secretAccessKey,
                AWS_DEFAULT_BUCKET: objectStorageInfo.defaultBucket,
                AWS_DEFAULT_REGION: objectStorageInfo.region,
              },
              ODH_TYPE_OBJECT_STORAGE,
            ).then(onClose);
          }
          break;
        default:
          console.error('no data source type selected');
          break;
      }
    };

    const renderForm = () => {
      switch (dataSource) {
        case DATA_SOURCE.database:
          return <DatabaseAccessForm notebookList={notebookList} setInfo={setDbInfo} />;
        case DATA_SOURCE.objectStorage:
          return <ObjectStorageForm notebookList={notebookList} setInfo={setObjectStorageInfo} />;
        default:
          return null;
      }
    };

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
          Choose a data source type:
        </Title>
        <Form className="odh-data-projects__modal-form">
          <FormGroup fieldId="modal-data-source">
            <Select
              isOpen={dataSourceDropdownOpen}
              onToggle={() => setDataSourceDropdownOpen(!dataSourceDropdownOpen)}
              aria-labelledby="data-source-dropdown"
              placeholderText="Choose one"
              selections={dataSource}
              onSelect={handleDataSourceSelection}
              menuAppendTo="parent"
            >
              <SelectOption id="object" value={DATA_SOURCE.objectStorage}>
                Object Storage
              </SelectOption>
              <SelectOption id="object" value={DATA_SOURCE.database}>
                Database
              </SelectOption>
              <SelectOption id="object" value={DATA_SOURCE.starburst}>
                Starburst
              </SelectOption>
            </Select>
          </FormGroup>
          {renderForm()}
        </Form>
      </Modal>
    );
  },
);

DataSourceModal.displayName = 'DataSourceModal';

export default DataSourceModal;
