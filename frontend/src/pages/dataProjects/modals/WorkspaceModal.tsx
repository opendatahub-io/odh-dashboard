import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  InputGroup,
  Modal,
  ModalVariant,
  NumberInput,
  Radio,
  Select,
  SelectOption,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { mockUIConfig } from '../mockData';
import ImageStreamSelector from '../spawner/ImageStreamSelector';
import {
  EnvVarCategoryType,
  ImageStream,
  ImageStreamAndTag,
  ImageStreamTag,
  Notebook,
  OdhConfig,
  PersistentVolumeClaimList,
  VariableRow,
} from '../../../types';

import './DataProjectsModal.scss';
import { PlusCircleIcon } from '@patternfly/react-icons';
import EnvironmentVariablesRow from '../spawner/EnvironmentVariablesRow';
import { CUSTOM_VARIABLE, EMPTY_KEY } from '../const';
import { createDataProjectNotebook } from '../../../services/dataProjectsService';
import {
  getImageStreamByContainer,
  getDefaultTagByImageStream,
  checkImageStreamOrder,
  getImageStreamTagVersion,
  getTagDescription,
} from '../../../utilities/imageUtils';
import { ANNOTATION_DESCRIPTION } from '../../../utilities/const';
import { createPvc } from '../../../services/storageService';

type WorkspaceModalProps = {
  isModalOpen: boolean;
  onClose: () => void;
  project: any;
  notebook: Notebook | null;
  odhConfig: OdhConfig | undefined;
  imageStreams: ImageStream[];
  pvcList: PersistentVolumeClaimList | undefined;
  dispatchSuccess: (title: string) => void;
  dispatchError: (e: Error, title: string) => void;
};

const WorkspaceModal: React.FC<WorkspaceModalProps> = React.memo(
  ({
    project,
    notebook,
    isModalOpen,
    onClose,
    odhConfig,
    imageStreams,
    dispatchSuccess,
    dispatchError,
  }) => {
    const action = notebook ? 'Edit' : 'Create';
    const [notebookName, setNotebookName] = React.useState('');
    const [notebookDescription, setNotebookDescription] = React.useState('');
    const [selectedImageTag, setSelectedImageTag] = React.useState<ImageStreamAndTag>({
      imageStream: undefined,
      tag: undefined,
    });
    const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState(false);
    const [gpuDropdownOpen, setGpuDropdownOpen] = React.useState(false);
    const [selectedSize, setSelectedSize] = React.useState<string>('Default');
    const [selectedGpu, setSelectedGpu] = React.useState<string>('0');
    const [selectedStorageType, setSelectedStorageType] = React.useState<string>('pvc');
    const [pvSize, setPvSize] = React.useState(1);
    const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
    const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
    const [createError, setCreateError] = React.useState(undefined);
    const nameInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      const setFirstValidImage = () => {
        let found = false;
        let i = 0;
        while (!found && i < imageStreams.length) {
          const imageStream: ImageStream = imageStreams?.[i++];
          if (imageStream) {
            const tag: ImageStreamTag | undefined = getDefaultTagByImageStream(imageStream);
            if (tag) {
              const values = { imageStream, tag };
              setSelectedImageTag(values);
              found = true;
            }
          }
        }
      };
      if (isModalOpen && nameInputRef && nameInputRef.current) {
        nameInputRef.current.focus();
      }
      if (notebook) {
        setNotebookName(notebook.metadata.name);
        setNotebookDescription(notebook.metadata.annotations?.[ANNOTATION_DESCRIPTION] ?? '');
        const containers = notebook.spec?.template?.spec?.containers;
        const container = containers?.find(
          (container) => container.name === notebook.metadata.name,
        );
        const imageStream = getImageStreamByContainer(imageStreams, container);
        const tag = imageStream?.spec?.tags?.find((tag) => tag.from.name === container?.image);
        if (container && imageStream && tag) {
          setSelectedImageTag({ imageStream, tag });
          setSelectedSize('Default');
          //setVariableRows(container.env ?? []);
        }
      } else {
        setNotebookName('');
        setNotebookDescription('');
        setFirstValidImage();
        setSelectedSize('Default');
        setVariableRows([]);
      }
    }, [notebook, imageStreams, isModalOpen]);

    const handleNotebookNameChange = (value: string) => setNotebookName(value);
    const handleNotebookDescriptionChange = (value: string) => setNotebookDescription(value);

    const handleSizeSelection = (e, selection) => {
      setSelectedSize(selection);
      setSizeDropdownOpen(false);
    };

    const handleGpuSelection = (e, selection) => {
      setSelectedGpu(selection);
      setGpuDropdownOpen(false);
    };

    const handleStorageTypeSelection = (checked, e, selection) => {
      console.log('handleStorageTypeSelection', checked, e, selection);
      setSelectedStorageType(selection);
    };

    function makeid(length) {
      let result = '';
      const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    }

    const handleNotebookAction = (start: boolean) => {
      const { imageStream, tag } = selectedImageTag;
      const namespace = project?.metadata?.name;
      if (!imageStream || !tag) {
        console.error('no image selected');
        return;
      }
      setCreateInProgress(true);
      let volumes, volumeMounts;

      if (selectedStorageType === 'pvc') {
        const pvcName = `${notebookName}-${makeid(4)}`;
        const pvcDesc = `Workspace storage for ${notebookName}`;
        createPvc(namespace, pvcName, pvcDesc, 'gp2', pvSize + 'Gi');
        volumes = [{ name: pvcName, persistentVolumeClaim: { claimName: pvcName } }];
        volumeMounts = [{ mountPath: '/home/jovyan', name: pvcName }];
      } else {
        volumes = [{ name: pvcName, persistentVolumeClaim: { claimName: pvcName } }];
        volumeMounts = [{ mountPath: '/home/jovyan', name: pvcName }];
      }

      const notebookSize = odhConfig?.spec?.notebookSizes?.find((ns) => ns.name === selectedSize);
      createDataProjectNotebook(
        namespace,
        notebookName,
        imageStream,
        tag,
        notebookSize,
        parseInt(selectedGpu),
        notebookDescription,
        volumes,
        volumeMounts,
      )
        .then(() => {
          onClose();
          setCreateInProgress(false);
          dispatchSuccess('Create Workspace Successfully');
        })
        .catch((e) => {
          setCreateInProgress(false);
          dispatchError(e, 'Create Workspace Error');
        });
    };

    const onCancel = () => {
      onClose();
    };

    const handleImageTagSelection = (
      imageStream: ImageStream,
      tag: ImageStreamTag | undefined,
      checked: boolean,
    ) => {
      if (checked) {
        setSelectedImageTag({ imageStream, tag });
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
      const sizes = odhConfig?.spec?.notebookSizes;

      if (!sizes?.length) {
        return [<SelectOption key="Default" value="Default" description="No Size Limits" />];
      }

      return sizes.map((size) => {
        const name = size.name;
        const desc =
          size.description ||
          `Limits: ${size?.resources?.limits?.cpu || '??'} CPU, ` +
            `${size?.resources?.limits?.memory || '??'} Memory ` +
            `Requests: ${size?.resources?.requests?.cpu || '??'} CPU, ` +
            `${size?.resources?.requests?.memory || '??'} Memory`;
        return <SelectOption key={name} value={name} description={desc} />;
      });
    }, [odhConfig]);

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
        aria-label={`${action} data science workspace`}
        className="odh-data-projects__modal"
        variant={ModalVariant.large}
        title={`${action} data science workspace`}
        description="Select options for your data science workspace."
        isOpen={isModalOpen}
        onClose={onClose}
        actions={[
          <Button
            isDisabled={createInProgress}
            key={action.toLowerCase()}
            variant="primary"
            onClick={() => handleNotebookAction(false)}
          >
            {`${action}`}
          </Button>,
          <Button
            isDisabled={createInProgress}
            key={action.toLowerCase()}
            variant="secondary"
            onClick={() => handleNotebookAction(true)}
          >
            {`${action} and start`}
          </Button>,
          <Button key="cancel" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>,
        ]}
      >
        <Form className="odh-data-projects__modal-form">
          <FormGroup label="Name" fieldId="modal-notebook-name">
            <TextInput
              id="modal-notebook-name"
              name="modal-notebook-name"
              value={notebookName}
              onChange={handleNotebookNameChange}
              ref={nameInputRef}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="modal-notebook-description">
            <TextArea
              id="modal-notebook-description"
              name="modal-notebook-description"
              value={notebookDescription}
              onChange={handleNotebookDescriptionChange}
              resizeOrientation="vertical"
            />
          </FormGroup>
          <FormGroup
            label="Notebook image"
            fieldId="modal-notebook-image"
            className="odh-data-projects__modal-form-image-list"
          >
            <Grid sm={12} md={6} lg={6} xl={6} xl2={6} hasGutter>
              {imageStreams.sort(checkImageStreamOrder).map((imageStream) => (
                <GridItem key={imageStream.metadata.name}>
                  <ImageStreamSelector
                    imageStream={imageStream}
                    selectedImage={selectedImageTag.imageStream}
                    selectedTag={selectedImageTag.tag}
                    handleSelection={handleImageTagSelection}
                  />
                </GridItem>
              ))}
            </Grid>
          </FormGroup>
          <FormSection title="Deployment size">
            {sizeOptions && (
              <FormGroup label="Container size" fieldId="modal-notebook-container-size">
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
              <FormGroup label="Number of GPUs" fieldId="modal-notebook-gpu-number">
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
          <FormSection title="Storage">
            <FormGroup
              fieldId="modal-storage-type"
              className="odh-data-projects__modal-form-storage-type"
            >
              <Radio
                id="storage-type-ephemeral"
                name="storage-type-ephemeral"
                className="odh-data-projects__modal-form-storage-type-option"
                label={
                  <span className="odh-data-projects__notebook-image-title">Ephemeral storage</span>
                }
                description={'This is temporary storage that is cleared when logged out.'}
                isChecked={selectedStorageType === 'ephemeral'}
                onChange={(checked, e) => {
                  if (checked) {
                    handleStorageTypeSelection(checked, e, 'ephemeral');
                  }
                }}
              />
              <Radio
                id="storage-type-ephemeral"
                name="storage-type-ephemeral"
                className="odh-data-projects__modal-form-storage-type-option"
                label={
                  <span className="odh-data-projects__notebook-image-title">
                    Persistent Storage
                  </span>
                }
                description={'This is storage that is retained when logged out.'}
                isChecked={selectedStorageType === 'pvc'}
                onChange={(checked, e) => {
                  if (checked) {
                    handleStorageTypeSelection(checked, e, 'pvc');
                  }
                }}
              />
            </FormGroup>
            <FormGroup fieldId="new-pv-size" label="Size">
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
            </FormGroup>
          </FormSection>
        </Form>
      </Modal>
    );
  },
);

WorkspaceModal.displayName = 'WorkspaceModal';

export default WorkspaceModal;
