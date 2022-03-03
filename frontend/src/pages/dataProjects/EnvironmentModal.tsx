import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  FormSection,
  FormSelect,
  Grid,
  GridItem,
  Modal,
  ModalVariant,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { mockImages } from './mockData';
import ImageSelector from './ImageSelector';
import { ImageTag, ImageType } from '../../types';

import './DataProjectsModal.scss';

type EnvironmentModalProps = {
  isModalOpen: boolean;
  onClose: () => void;
  environment: any;
};

const EnvironmentModal: React.FC<EnvironmentModalProps> = React.memo(
  ({ environment, isModalOpen, onClose }) => {
    const [environmentName, setEnvironmentName] = React.useState('');
    const [environmentDescription, setEnvironmentDescription] = React.useState('');
    const [selectedImageTag, setSelectedImageTag] = React.useState<ImageTag | null>(null);
    const nameInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (isModalOpen && nameInputRef && nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, [isModalOpen]);

    React.useEffect(() => {
      if (environment) {
        setEnvironmentName(environment.name);
        setEnvironmentDescription(environment.description);
        setSelectedImageTag({ image: environment.image.name, tag: environment.image.tag });
      } else {
        setEnvironmentName('');
        setEnvironmentDescription('');
        setSelectedImageTag(null);
      }
    }, [environment]);

    const handleEnvironmentNameChange = (value: string) => setEnvironmentName(value);
    const handleEnvironmentDescriptionChange = (value: string) => setEnvironmentDescription(value);

    const handleClose = () => {
      onClose();
    };

    const onCreateEnvironment = () => {
      console.log('do something');
    };

    const handleImageTagSelection = (image: ImageType, tag: string, checked: boolean) => {
      if (checked) {
        setSelectedImageTag({ image: image.name, tag });
      }
    };

    return (
      <Modal
        aria-label="Create environment"
        variant={ModalVariant.medium}
        title={environment ? 'Edit environment' : 'Create environment'}
        description="Select options for your environment."
        isOpen={isModalOpen}
        onClose={handleClose}
        actions={[
          <Button key="create" variant="primary" onClick={onCreateEnvironment}>
            Create environment
          </Button>,
          <Button key="cancel" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>,
        ]}
      >
        <Form className="odh-data-projects__modal-form">
          <FormGroup label="Name" fieldId="modal-create-environment-name">
            <TextInput
              id="modal-create-environment-name"
              name="modal-create-environment-name"
              value={environmentName}
              onChange={handleEnvironmentNameChange}
              ref={nameInputRef}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="modal-create-environment-description">
            <TextArea
              id="modal-create-environment-description"
              name="modal-create-environment-description"
              value={environmentDescription}
              onChange={handleEnvironmentDescriptionChange}
              resizeOrientation="vertical"
            />
          </FormGroup>
          <FormGroup label="Notebook image" fieldId="modal-create-environment-notebook-image">
            <Grid sm={12} md={6} lg={6} xl={6} xl2={6} hasGutter>
              {mockImages.map((image) => (
                <GridItem key={image.name}>
                  <ImageSelector
                    key={image.name}
                    image={image}
                    selectedImage={selectedImageTag?.image}
                    selectedTag={selectedImageTag?.tag}
                    handleSelection={handleImageTagSelection}
                  />
                </GridItem>
              ))}
            </Grid>
          </FormGroup>
          <FormSection title="Deployment size">
            <FormGroup label="Container size" fieldId="modal-create-environment-container-size">
              <FormSelect>{}</FormSelect>
            </FormGroup>
          </FormSection>
        </Form>
      </Modal>
    );
  },
);

EnvironmentModal.displayName = 'EnvironmentModal';

export default EnvironmentModal;
