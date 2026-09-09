import * as React from 'react';
import {
  Button,
  Content,
  ExpandableSection,
  FileUpload,
  FormGroup,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  TextInput,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import { getMetricDisplayName } from '~/app/components/benchmarkUtils';
import {
  clampNumSamples,
  getBenchmarkKey,
  type CopySuiteBenchmark,
} from '~/app/pages/useCopySuiteForm';

import './CopySuiteBenchmarkSection.scss';

type CopySuiteBenchmarkSectionProps = {
  benchmark: CopySuiteBenchmark;
  index: number;
  showWeightEdit: boolean;
  weightPercentage: number;
  additionalParametersError?: string;
  isInteractionDisabled?: boolean;
  onUpdate: (index: number, field: keyof CopySuiteBenchmark, value: unknown) => void;
  onEditWeights: () => void;
  onOpenDetails: (benchmarkKey: string) => void;
};

const CopySuiteBenchmarkSection: React.FC<CopySuiteBenchmarkSectionProps> = ({
  benchmark,
  index,
  showWeightEdit,
  weightPercentage,
  additionalParametersError,
  isInteractionDisabled = false,
  onUpdate,
  onEditWeights,
  onOpenDetails,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(
    () => !!benchmark.additionalParameters?.trim(),
  );
  const [metricOpen, setMetricOpen] = React.useState(false);
  const [parametersFilename, setParametersFilename] = React.useState('');
  const isInteractionDisabledRef = React.useRef(isInteractionDisabled);
  const itemId = `benchmark-${index}`;

  React.useLayoutEffect(() => {
    isInteractionDisabledRef.current = isInteractionDisabled;
    if (isInteractionDisabled) {
      setMetricOpen(false);
    }
  }, [isInteractionDisabled]);

  return (
    <section
      id={`benchmark-section-${index}`}
      className="evalhub-copy-suite-benchmark-section"
      data-testid={`benchmark-section-${index}`}
    >
      <div className="evalhub-copy-suite-benchmark-section__header">
        <div className="evalhub-copy-suite-benchmark-section__title-row">
          <Button
            variant="link"
            isInline
            className="evalhub-copy-suite-benchmark-section__title"
            data-testid={`benchmark-section-name-${index}`}
            onClick={() => onOpenDetails(getBenchmarkKey(benchmark))}
            isDisabled={isInteractionDisabled}
          >
            {benchmark.name}
          </Button>
          {showWeightEdit ? (
            <div className="evalhub-copy-suite-benchmark-section__weight">
              <span className="evalhub-copy-suite-benchmark-section__weight-label">
                Suite score weight:
              </span>
              <span
                className="evalhub-copy-suite-benchmark-section__weight-value"
                data-testid={`benchmark-weight-label-${index}`}
              >
                {weightPercentage}%
              </span>
              <Button
                variant="link"
                isInline
                aria-label={`Edit weight for ${benchmark.name}`}
                className="evalhub-copy-suite-benchmark-section__weight-edit"
                data-testid={`benchmark-weight-edit-${index}`}
                onClick={onEditWeights}
                isDisabled={isInteractionDisabled}
              >
                <PencilAltIcon aria-hidden />
              </Button>
            </div>
          ) : null}
        </div>
        <Content component="p" className="evalhub-copy-suite-benchmark-section__benchmark-id">
          {benchmark.providerId ? `${benchmark.providerId}-` : ''}
          {benchmark.id}
        </Content>
      </div>

      <div className="evalhub-copy-suite-benchmark-section__fields">
        {benchmark.availableMetrics.length > 0 ? (
          <FormGroup label="Primary metric" fieldId={`${itemId}-metric`}>
            <Select
              key={isInteractionDisabled ? 'locked' : 'interactive'}
              id={`${itemId}-metric-menu`}
              data-testid={`benchmark-metric-select-${index}`}
              isOpen={metricOpen && !isInteractionDisabled}
              selected={benchmark.primaryMetric}
              onSelect={(_event, value) => {
                if (isInteractionDisabled) {
                  return;
                }
                if (typeof value === 'string') {
                  const lowerIsBetter =
                    benchmark.metricDirections?.[value] ??
                    (value === benchmark.primaryMetric ? benchmark.lowerIsBetter : false);
                  onUpdate(index, 'primaryMetric', value);
                  onUpdate(index, 'lowerIsBetter', lowerIsBetter);
                }
                setMetricOpen(false);
              }}
              onOpenChange={(isOpen) => {
                if (!isInteractionDisabled) {
                  setMetricOpen(isOpen);
                }
              }}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setMetricOpen((prev) => !prev)}
                  isExpanded={metricOpen && !isInteractionDisabled}
                  isDisabled={isInteractionDisabled}
                  isFullWidth
                  data-testid={`benchmark-metric-toggle-${index}`}
                >
                  {benchmark.primaryMetric
                    ? getMetricDisplayName(benchmark.primaryMetric)
                    : 'Select metric'}
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {benchmark.availableMetrics.map((metric) => (
                  <SelectOption
                    key={metric}
                    value={metric}
                    isSelected={benchmark.primaryMetric === metric}
                  >
                    {getMetricDisplayName(metric)}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
        ) : null}

        <Grid hasGutter>
          <GridItem span={6}>
            <FormGroup label="Number of samples" fieldId={`${itemId}-samples`}>
              <TextInput
                id={`${itemId}-samples`}
                data-testid={`benchmark-samples-input-${index}`}
                type="number"
                min={1}
                max={benchmark.datasetSize}
                value={benchmark.numSamples ?? ''}
                isDisabled={isInteractionDisabled}
                onChange={(_event, value) => {
                  if (value === '') {
                    onUpdate(index, 'numSamples', undefined);
                    return;
                  }
                  const num = Number(value);
                  onUpdate(index, 'numSamples', clampNumSamples(num, benchmark.datasetSize));
                }}
              />
              {benchmark.datasetSize != null ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>Total dataset size: {benchmark.datasetSize}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
          </GridItem>
          <GridItem span={6}>
            <FormGroup label="Number of few-shot examples" fieldId={`${itemId}-few-shot`}>
              <TextInput
                id={`${itemId}-few-shot`}
                data-testid={`benchmark-few-shot-input-${index}`}
                type="number"
                value={benchmark.numFewShot ?? ''}
                isDisabled={isInteractionDisabled}
                onChange={(_event, value) => {
                  const num = value === '' ? undefined : Number(value);
                  onUpdate(index, 'numFewShot', num);
                }}
              />
            </FormGroup>
          </GridItem>
        </Grid>

        <BenchmarkThresholdField
          value={benchmark.threshold}
          onChange={(value) => {
            if (!isInteractionDisabled) {
              onUpdate(index, 'threshold', value);
            }
          }}
          label="Threshold"
          description="Minimum score required to pass this evaluation."
          fieldId={`${itemId}-threshold`}
          isDisabled={isInteractionDisabled}
        />

        <ExpandableSection
          toggleText={
            isAdvancedOpen
              ? 'Hide advanced benchmark parameters'
              : 'Show advanced benchmark parameters'
          }
          isExpanded={isAdvancedOpen}
          onToggle={(_event, expanded) => {
            if (!isInteractionDisabled) {
              setIsAdvancedOpen(expanded);
            }
          }}
          data-testid={`benchmark-advanced-toggle-${index}`}
        >
          <FormGroup fieldId={`${itemId}-additional-parameters`}>
            <FileUpload
              id={`${itemId}-additional-parameters`}
              data-testid={`benchmark-additional-parameters-${index}`}
              type="text"
              isDisabled={isInteractionDisabled}
              value={benchmark.additionalParameters ?? ''}
              filename={parametersFilename}
              filenamePlaceholder="Drag and drop a file or upload"
              validated={additionalParametersError ? 'error' : 'default'}
              onFileInputChange={(_event, file) => {
                if (isInteractionDisabledRef.current) {
                  return;
                }
                setParametersFilename(file.name);
                const reader = new FileReader();
                reader.onload = () => {
                  if (!isInteractionDisabledRef.current && typeof reader.result === 'string') {
                    onUpdate(index, 'additionalParameters', reader.result);
                  }
                };
                reader.readAsText(file);
              }}
              onTextChange={(_event, value) => {
                if (!isInteractionDisabled) {
                  onUpdate(index, 'additionalParameters', value);
                }
              }}
              onClearClick={() => {
                if (isInteractionDisabled) {
                  return;
                }
                onUpdate(index, 'additionalParameters', '');
                setParametersFilename('');
              }}
              browseButtonText="Upload"
              allowEditingUploadedText
              textAreaPlaceholder={'{\n  "num_examples": 10\n}'}
              dropzoneProps={{
                accept: { 'application/json': ['.json'] },
                disabled: isInteractionDisabled,
              }}
            />
            <FormHelperText>
              <HelperText>
                {additionalParametersError ? (
                  <HelperTextItem
                    variant="error"
                    data-testid={`benchmark-additional-parameters-error-${index}`}
                  >
                    {additionalParametersError}
                  </HelperTextItem>
                ) : (
                  <HelperTextItem>Upload a JSON file</HelperTextItem>
                )}
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </ExpandableSection>
      </div>
    </section>
  );
};

export default CopySuiteBenchmarkSection;
