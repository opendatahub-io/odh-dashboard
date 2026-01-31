import * as React from 'react';
import { FormGroup, Stack, StackItem, TextInput } from '@patternfly/react-core';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { makeHelloSample, makeMetricSample } from './samplePipelines.ts';

type SamplePipelineSelectorProps = {
  onFinish: (fileContents: string) => void;
};

const DEFAULT_PYTHON_IMAGE = 'registry.redhat.io/ubi8/python-39';

const samplePipelineOptions: SimpleSelectOption[] = [
  { key: 'hello-world', label: 'Hello World' },
  { key: 'random-metrics', label: 'Random Metrics' },
];

const SamplePipelineSelector: React.FC<SamplePipelineSelectorProps> = ({ onFinish }) => {
  const [pythonImage, setPythonImage] = React.useState<string>(DEFAULT_PYTHON_IMAGE);
  const [selectedSample, setSelectedSample] = React.useState<string>('');

  const handleSampleChange = (key: string) => {
    setSelectedSample(key);
    if (key === 'hello-world') {
      onFinish(makeHelloSample(pythonImage));
    } else if (key === 'random-metrics') {
      onFinish(makeMetricSample(pythonImage));
    }
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup fieldId="python-image" label="Python image">
          <TextInput
            id="python-image"
            name="python-image"
            data-testid="python-image-input"
            value={pythonImage}
            onChange={(_e, value) => setPythonImage(value)}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup fieldId="sample-pipeline-select" label="Sample pipeline">
          <SimpleSelect
            dataTestId="sample-pipeline-select"
            options={samplePipelineOptions}
            value={selectedSample}
            placeholder="Select a sample"
            onChange={handleSampleChange}
            isFullWidth
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default SamplePipelineSelector;
