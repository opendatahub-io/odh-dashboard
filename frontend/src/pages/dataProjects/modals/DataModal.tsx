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

type DataModalProps = {
  isModalOpen: boolean;
  onClose: () => void;
  data: any;
};

const DataModal: React.FC<DataModalProps> = React.memo(({ data, isModalOpen, onClose }) => {
  const action = data ? 'Edit' : 'Add';
  const [dataSource, setDataSource] = React.useState('');
  const [dataSourceDropdownOpen, setDataSourceDropdownOpen] = React.useState(false);
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

  const dataSources = [
    'PV (persistent volume)',
    'Database Access',
    'Starburst',
    'S3 Bucket',
    'Other data source',
  ];

  const dataSourceOptions = dataSources.map((ds, index) => <SelectOption key={index} value={ds} />);

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
            aria-labelledby="data-source"
            placeholderText="Choose one"
            selections={dataSource}
            onSelect={handleDataSourceSelection}
            menuAppendTo="parent"
          >
            {dataSourceOptions}
          </Select>
        </FormGroup>
      </Form>
    </Modal>
  );
});

DataModal.displayName = 'DataModal';

export default DataModal;
