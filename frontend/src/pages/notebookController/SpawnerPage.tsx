import * as React from 'react';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  Select,
  SelectOption,
} from '@patternfly/react-core';
import { checkImageStreamOrder } from '../../utilities/imageUtils';
import {
  EnvVarCategoryType,
  ImageStream,
  ImageStreamAndTag,
  ImageStreamTag,
  VariableRow,
} from '../../types';
import ImageStreamSelector from './ImageStreamSelector';
import EnvironmentVariablesRow from './EnvironmentVariablesRow';
import { mockUIConfig } from './mock';
import { CUSTOM_VARIABLE, EMPTY_KEY } from './const';
import { PlusCircleIcon } from '@patternfly/react-icons';

import './NotebookController.scss';
import { useHistory } from 'react-router';

type SpawnerPageProps = {
  imageStreams: ImageStream[];
  odhConfig: any;
};

const SpawnerPage: React.FC<SpawnerPageProps> = React.memo(({ imageStreams, odhConfig }) => {
  const history = useHistory();
  const [selectedImageTag, setSelectedImageTag] = React.useState<ImageStreamAndTag>({
    imageStream: undefined,
    tag: undefined,
  });
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState(false);
  const [selectedSize, setSelectedSize] = React.useState<string>('Default');
  const [gpuDropdownOpen, setGpuDropdownOpen] = React.useState(false);
  const [selectedGpu, setSelectedGpu] = React.useState<string>('0');
  const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);

  const handleImageTagSelection = (
    imageStream: ImageStream,
    tag: ImageStreamTag | undefined,
    checked: boolean,
  ) => {
    if (checked) {
      setSelectedImageTag({ imageStream, tag });
    }
  };

  const handleSizeSelection = (e, selection) => {
    setSelectedSize(selection);
    setSizeDropdownOpen(false);
  };

  const handleGpuSelection = (e, selection) => {
    setSelectedGpu(selection);
    setGpuDropdownOpen(false);
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

  const renderEnvironmentVariableRows = () => {
    if (!variableRows?.length) {
      return null;
    }
    return variableRows.map((row, index) => (
      <EnvironmentVariablesRow
        key={`environment-variable-row-${index}`}
        categories={(mockUIConfig.envVarConfig.categories as EnvVarCategoryType[]) || []}
        variableRow={row}
        onUpdate={(updatedRow) => onUpdateRow(index, updatedRow)}
      />
    ));
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

  return (
    <Form className="odh-notebook-controller__page-form">
      <FormSection title="Notebook image">
        <FormGroup fieldId="modal-notebook-image">
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
      </FormSection>
      <FormSection title="Deployment size">
        {sizeOptions && (
          <FormGroup label="Container size" fieldId="modal-notebook-container-size">
            <Select
              isOpen={sizeDropdownOpen}
              onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
              aria-labelledby="container-size"
              selections={selectedSize}
              onSelect={handleSizeSelection}
              menuAppendTo="parent"
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
              menuAppendTo="parent"
            >
              {gpuOptions}
            </Select>
          </FormGroup>
        )}
      </FormSection>
      <FormSection title="Environment variables" className="odh-notebook-controller__env-var">
        {renderEnvironmentVariableRows()}
        <Button
          className="odh-notebook-controller__env-var-add-button"
          isInline
          variant="link"
          onClick={addEnvironmentVariableRow}
        >
          <PlusCircleIcon />
          {` Add more variables`}
        </Button>
      </FormSection>
      <ActionGroup>
        <Button variant="primary">Start server</Button>
        <Button variant="secondary" onClick={() => history.push('/')}>
          Cancel
        </Button>
      </ActionGroup>
    </Form>
  );
});

SpawnerPage.displayName = 'SpawnerPage';

export default SpawnerPage;
