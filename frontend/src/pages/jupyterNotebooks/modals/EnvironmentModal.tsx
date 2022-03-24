import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  Modal,
  ModalVariant,
  Select,
  SelectOption,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { mockImages, mockSizeDescriptions, mockSizes, mockUIConfig } from '../mockData';
import ImageSelector from '../spawner/ImageSelector';
import {
  EnvVarCategoryType,
  ImageTag,
  ImageType,
  SizeDescription,
  VariableRow,
} from '../../../types';

import './DataProjectsModal.scss';
import { PlusCircleIcon } from '@patternfly/react-icons';
import EnvironmentVariablesRow from '../spawner/EnvironmentVariablesRow';
import { CUSTOM_VARIABLE, EMPTY_KEY } from '../const';
import { createDataProjectNotebook } from '../../../services/dataProjectsService';

type EnvironmentModalProps = {
  isModalOpen: boolean;
  onClose: () => void;
  project: any;
  environment: any;
};

const EnvironmentModal: React.FC<EnvironmentModalProps> = React.memo(
  ({ project, environment, isModalOpen, onClose }) => {
    const action = environment ? 'Edit' : 'Create';
    const [environmentName, setEnvironmentName] = React.useState('');
    const [environmentDescription, setEnvironmentDescription] = React.useState('');
    const [selectedImageTag, setSelectedImageTag] = React.useState<ImageTag | null>(null);
    const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState(false);
    const [gpuDropdownOpen, setGpuDropdownOpen] = React.useState(false);
    const [selectedSize, setSelectedSize] = React.useState<string>('Default');
    const [selectedGpu, setSelectedGpu] = React.useState<string>('0');
    const [sizeDescriptions, setSizeDescriptions] = React.useState<SizeDescription[]>([]);
    const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
    const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
    const [createError, setCreateError] = React.useState(undefined);
    const nameInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      setSizeDescriptions(
        mockSizes
          .map((size) => mockSizeDescriptions[`size/${size}`])
          .filter((desc) => desc.schedulable),
      );
    }, []);

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
        setSelectedSize(environment.size);
        setVariableRows(environment.variable ?? []);
      } else {
        setEnvironmentName('');
        setEnvironmentDescription('');
        setSelectedImageTag(null);
        setSelectedSize('Default');
        setVariableRows([]);
      }
    }, [environment]);

    const handleEnvironmentNameChange = (value: string) => setEnvironmentName(value);
    const handleEnvironmentDescriptionChange = (value: string) => setEnvironmentDescription(value);

    const handleSizeSelection = (e, selection) => {
      setSelectedSize(selection);
      setSizeDropdownOpen(false);
    };

    const handleGpuSelection = (e, selection) => {
      setSelectedGpu(selection);
      setGpuDropdownOpen(false);
    };

    const handleEnvironmentAction = () => {
      setCreateInProgress(true);
      createDataProjectNotebook(project?.metadata?.name, environmentName)
        .then(() => {
          onClose();
          setCreateInProgress(false);
        })
        .catch((e) => {
          setCreateError(e);
        });
    };

    const onCancel = () => {
      onClose();
    };

    const handleImageTagSelection = (image: ImageType, tag: string, checked: boolean) => {
      if (checked) {
        setSelectedImageTag({ image: image.name, tag });
      }
    };

    const onUpdateRow = (index: number, updatedRow?: VariableRow) => {
      const updatedRows = [...variableRows];

      if (!updatedRow) {
        updatedRows.splice(index, 1); // remove the whole variable at the index
        setVariableRows(updatedRows);
        return;
      }

      updatedRows[index] = { ...updatedRow };
      updatedRows[index].errors = {};
      for (let i = 0; i < updatedRows.length; i++) {
        if (i !== index) {
          updatedRow.variables.forEach((variable) => {
            if (updatedRows[i].variables.find((v) => v.name === variable.name)) {
              updatedRows[index].errors[variable.name] =
                'That name is already in use. Try a different name.';
            }
          });
        }
      }
      setVariableRows(updatedRows);
    };

    const renderEnvironmentVariableRows = () => {
      if (!variableRows?.length) {
        return null;
      }
      return variableRows.map((row, index) => (
        <EnvironmentVariablesRow
          key={index}
          categories={(mockUIConfig.envVarConfig.categories as EnvVarCategoryType[]) || []}
          variableRow={row}
          onUpdate={(updatedRow) => onUpdateRow(index, updatedRow)}
        />
      ));
    };

    const addEnvironmentVariableRow = () => {
      const newRow: VariableRow = {
        variableType: CUSTOM_VARIABLE,
        variables: [
          {
            name: EMPTY_KEY,
            type: 'text',
            value: '',
          },
        ],
        errors: {},
      };
      setVariableRows([...variableRows, newRow]);
    };

    const sizeOptions = React.useMemo(() => {
      if (!mockSizes?.length || !sizeDescriptions?.length) {
        return null;
      }

      const sizes = mockSizes.reduce(
        (acc, size) => {
          if (!acc.includes(size)) {
            acc.push(size);
          }
          return acc;
        },
        ['Default'],
      );

      const defaultSelection = (
        <SelectOption
          key="Default"
          value="Default"
          description="Resources set based on administrator configurations"
        />
      );

      return sizes.reduce(
        (acc, size) => {
          const sizeDescription = sizeDescriptions.find((desc) => desc?.name === size);
          if (sizeDescription) {
            acc.push(
              <SelectOption
                key={size}
                value={size}
                description={
                  `Limits: ${sizeDescription.resources.limits.cpu} CPU, ${sizeDescription.resources.limits.memory} Memory ` +
                  `Requests: ${sizeDescription.resources.requests.cpu} CPU, ${sizeDescription.resources.requests.memory} Memory`
                }
              />,
            );
          }
          return acc;
        },
        [defaultSelection],
      );
    }, [sizeDescriptions]);

    const gpuOptions = React.useMemo(() => {
      const values: number[] = [];
      const start = 0;
      const end = 5;

      for (let i = start; i <= end; i++) {
        values.push(i);
      }
      return values?.map((gpuSize) => <SelectOption key={gpuSize} value={`${gpuSize}`} />);
    }, []);

    return (
      <Modal
        aria-label={`${action} workspace environment`}
        className="odh-data-projects__modal"
        variant={ModalVariant.large}
        title={`${action} workspace environment`}
        description="Select options for your workspace environment."
        isOpen={isModalOpen}
        onClose={onClose}
        actions={[
          <Button key={action.toLowerCase()} variant="primary" onClick={handleEnvironmentAction}>
            {`${action} workspace environment`}
          </Button>,
          <Button key="cancel" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>,
        ]}
      >
        <Form className="odh-data-projects__modal-form">
          <FormGroup label="Name" fieldId="modal-environment-name">
            <TextInput
              id="modal-environment-name"
              name="modal-environment-name"
              value={environmentName}
              onChange={handleEnvironmentNameChange}
              ref={nameInputRef}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="modal-environment-description">
            <TextArea
              id="modal-environment-description"
              name="modal-environment-description"
              value={environmentDescription}
              onChange={handleEnvironmentDescriptionChange}
              resizeOrientation="vertical"
            />
          </FormGroup>
          <FormGroup
            label="Notebook image"
            fieldId="modal-environment-notebook-image"
            className="odh-data-projects__modal-form-image-list"
          >
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
            {sizeOptions && (
              <FormGroup label="Container size" fieldId="modal-environment-container-size">
                <Select
                  isOpen={sizeDropdownOpen}
                  onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                  aria-labelledby="container-size"
                  selections={selectedSize}
                  onSelect={handleSizeSelection}
                >
                  {sizeOptions}
                </Select>
              </FormGroup>
            )}
            {gpuOptions && (
              <FormGroup label="Number of GPUs" fieldId="modal-environment-gpu-number">
                <Select
                  isOpen={gpuDropdownOpen}
                  onToggle={() => setGpuDropdownOpen(!gpuDropdownOpen)}
                  aria-labelledby="gpu-numbers"
                  selections={selectedGpu}
                  onSelect={handleGpuSelection}
                >
                  {gpuOptions}
                </Select>
              </FormGroup>
            )}
          </FormSection>
          <FormSection title="Environment variables">
            {renderEnvironmentVariableRows()}
            <Button isInline variant="link" onClick={addEnvironmentVariableRow}>
              <PlusCircleIcon />
              {` Add more variables`}
            </Button>
          </FormSection>
        </Form>
      </Modal>
    );
  },
);

EnvironmentModal.displayName = 'EnvironmentModal';

export default EnvironmentModal;
