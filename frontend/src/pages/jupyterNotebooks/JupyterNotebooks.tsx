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
import { mockSizeDescriptions, mockSizes, mockUIConfig } from './mockData';
import ImageStreamSelector from './spawner/ImageStreamSelector';
import {
  Container,
  EnvVarCategoryType,
  ImageStream,
  ImageStreamList,
  ImageStreamAndTag,
  ImageStreamTag,
  Notebook,
  SizeDescription,
  VariableRow,
} from '../../types';

import './modals/DataProjectsModal.scss';
import { PlusCircleIcon } from '@patternfly/react-icons';
import EnvironmentVariablesRow from './spawner/EnvironmentVariablesRow';
import { CUSTOM_VARIABLE, EMPTY_KEY } from './const';
import { createDataProjectNotebook } from '../../services/dataProjectsService';
import {
  getImageStreamByContainer,
  getDefaultTagByImageStream,
  checkImageStreamOrder,
} from '../../utilities/imageUtils';
import { NOTEBOOK_DESCRIPTION } from '../../utilities/const';
import { getImageStreams } from 'services/imageStreamService';

type SpawnerProps = {
  project: any;
  notebook: Notebook | null;
  imageStreams: ImageStream[];
  dispatchSuccess: (title: string) => void;
  dispatchError: (e: Error, title: string) => void;
  loadNotebooks: () => void;
};

const Spawner: React.FC<SpawnerProps> = React.memo(
  ({
    project,
    notebook,
    imageStreams,
    dispatchSuccess,
    dispatchError,
    loadNotebooks,
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
    const [sizeDescriptions, setSizeDescriptions] = React.useState<SizeDescription[]>([]);
    const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
    const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
    const [createError, setCreateError] = React.useState(undefined);
    const [imageList, setImageList] = React.useState<ImageStreamList | undefined>(undefined);
    const [imagesLoading, setImagesLoading] = React.useState(false);
    const nameInputRef = React.useRef<HTMLInputElement>(null);

    const listEmpty = (list: ImageStreamList | undefined) =>
    !list || !list.items || list.items.length === 0;

    const loadImages = () => {
        setImagesLoading(true);
        getImageStreams()
          .then((il: ImageStreamList) => {
            setImageList(il);
            setImagesLoading(false);
          })
          .catch((e) => {
            dispatchError(e, 'Load Images Error');
          });
      };
    
    React.useEffect(() => {
        loadImages();
    }, []);
    
    imageStreams = listEmpty(imageList) ? [] : imageList!.items

    React.useEffect(() => {
      setSizeDescriptions(
        mockSizes
          .map((size) => mockSizeDescriptions[`size/${size}`])
          .filter((desc) => desc.schedulable),
      );
    }, []);

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
      if (notebook) {
        setNotebookName(notebook.metadata.name);
        setNotebookDescription(notebook.metadata.annotations?.[NOTEBOOK_DESCRIPTION] ?? '');
        const containers = notebook.spec?.template?.spec?.containers;
        const container: Container = containers?.find(
          (container) => container.name === notebook.metadata.name,
        );
        const imageStream = getImageStreamByContainer(imageStreams, container);
        const tag = imageStream?.spec?.tags?.find((tag) => tag.from.name === container.image);
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
    }, [notebook, imageStreams]);

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

    const handleNotebookAction = () => {
      setCreateInProgress(true);
      const newNotebook = {
        name: notebookName,
        tag: selectedImageTag.tag,
      };
      const annotations = notebookDescription
        ? {
            [NOTEBOOK_DESCRIPTION]: notebookDescription,
          }
        : undefined;
      createDataProjectNotebook("odh-notebooks", newNotebook, annotations) // PLACEHOLDER PROJECT NAME
        .then(() => {
          setCreateInProgress(false);
          dispatchSuccess('Create Workspace Successfully');
          loadNotebooks();
        })
        .catch((e) => {
          setCreateInProgress(false);
          dispatchError(e, 'Create Workspace Error');
        });
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
      <>
        <>
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
                <Button
            isDisabled={createInProgress}
            key={action.toLowerCase()}
            variant="primary"
            onClick={handleNotebookAction}
          >
            Spawn Notebook
          </Button>,
            </Form>
        </>
      </>
    );
  },
);

Spawner.displayName = 'Spawner';

export default Spawner;