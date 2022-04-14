import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  Select,
  SelectOption,
  TextArea,
  TextInput,
  PageSection,
  PageSectionVariants,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { mockUIConfig } from './mockData';
import ImageStreamSelector from './spawner/ImageStreamSelector';
import {
  Container,
  EnvVarCategoryType,
  ImageStream,
  ImageStreamList,
  ImageStreamAndTag,
  ImageStreamTag,
  Notebook,
  OdhConfig,
  VariableRow,
} from '../../types';

//import './modals/DataProjectsModal.scss';
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
import { getOdhConfig } from 'services/odhConfigService';
import ApplicationsPage from '../ApplicationsPage';

type SpawnerProps = {
  project: any;
  notebook: Notebook | null;
  odhConfig: OdhConfig | undefined;
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
    const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);
    const [createInProgress, setCreateInProgress] = React.useState<boolean>(false);
    const [createError, setCreateError] = React.useState(undefined);
    const [imageList, setImageList] = React.useState<ImageStreamList | undefined>(undefined);
    const [imagesLoading, setImagesLoading] = React.useState(false);
    const [odhConfig, setOdhConfig] = React.useState<OdhConfig | undefined>(undefined);
    const [odhConfigLoading, setOdhConfigLoading] = React.useState(false);
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

    const loadOdhConfig = () => {
      setOdhConfigLoading(true);
      getOdhConfig()
        .then((cfg: OdhConfig) => {
          setOdhConfig(cfg);
          setOdhConfigLoading(false);
        })
        .catch((e) => {
          dispatchError(e, 'Load OdhConfig Error');
        });
    };
    React.useEffect(() => {
      loadOdhConfig();
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
    }, []);

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
      const { imageStream, tag } = selectedImageTag;
      if (!imageStream || !tag) {
        console.error('no image selected');
        return;
      }
      setCreateInProgress(true);
      const annotations = notebookDescription
        ? {
            [NOTEBOOK_DESCRIPTION]: notebookDescription,
          }
        : undefined;
      const notebookSize = odhConfig?.spec?.notebookSizes?.find((ns) => ns.name === selectedSize);
      const namespace = 'odh-notebooks';
      createDataProjectNotebook(
        namespace,
        notebookName,
        imageStream,
        tag,
        notebookSize,
        parseInt(selectedGpu),
        annotations,
      )
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

    const description = "The better spawner";
    const loaded = true;
    const isEmpty = false;
    const loadError = undefined;
    

    return (
        <ApplicationsPage
        title="Openshift Notebook Controller"
        description={description}
        loaded={loaded}
        empty={isEmpty}
        loadError={loadError}
        >
          <PageSection variant={PageSectionVariants.light} padding={{ default: 'noPadding' }}>
            <Flex direction={{ default: 'column' }}>
            <FlexItem>
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
            </FlexItem>
            </Flex>
          </PageSection>
      </ApplicationsPage>
    );
  },
);

Spawner.displayName = 'Spawner';

export default Spawner;