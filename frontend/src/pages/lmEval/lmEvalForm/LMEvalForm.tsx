import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  EmptyState,
  EmptyStateBody,
  Form,
  FormGroup,
  FormSection,
  Icon,
  MenuToggle,
  PageSection,
  Popover,
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  TextInput,
  Truncate,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, CubesIcon } from '@patternfly/react-icons';
import { Link } from 'react-router';
import { LmEvalFormData, LmModelArgument } from '#~/pages/lmEval/types';
import useInferenceServices from '#~/pages/modelServing/useInferenceServices';
import useLMGenericObjectState from '#~/pages/lmEval/utilities/useLMGenericObjectState';
import LMEvalFormApplicationPage from '#~/pages/lmEval/components/LMEvalFormApplicationPage';
import { LMEvalContext } from '#~/pages/lmEval/global/LMEvalContext';
import {
  ModelOption,
  ModelTypeOption,
  filterVLLMInference,
  generateModelOptions,
  handleModelSelection,
  handleModelTypeSelection,
} from '#~/pages/lmEval/utilities/modelUtils';
import LmEvaluationTaskSection from './LMEvalTaskSection';
import LmEvaluationSecuritySection from './LMEvalSecuritySection';
import LmModelArgumentSection from './LMEvalModelArgumentSection';
import { modelTypeOptions } from './const';
import '#~/components/pf-overrides/FormSection.scss';
import LMEvalFormFooter from './LMEvalFormFooter';

const LMEvalForm: React.FC = () => {
  const { project } = React.useContext(LMEvalContext);
  const namespace = project?.metadata.name || 'default';

  const [data, setData] = useLMGenericObjectState<LmEvalFormData>({
    deployedModelName: '',
    evaluationName: '',
    tasks: [],
    modelType: '',
    allowRemoteCode: false,
    allowOnline: false,
    model: {
      name: '',
      url: '',
      tokenizedRequest: false,
      tokenizer: '',
    },
  });
  const [open, setOpen] = React.useState(false);
  const [openModelName, setOpenModelName] = React.useState(false);
  const inferenceServices = useInferenceServices();

  const modelOptions = React.useMemo(() => {
    if (!inferenceServices.loaded || inferenceServices.error || !namespace) {
      return [];
    }

    const filteredServices = filterVLLMInference(inferenceServices.data.items, namespace);
    return generateModelOptions(filteredServices);
  }, [inferenceServices.loaded, inferenceServices.error, inferenceServices.data.items, namespace]);

  React.useEffect(() => {
    if (namespace && data.deployedModelName) {
      const isModelInNamespace = modelOptions.some(
        (model: ModelOption) => model.value === data.deployedModelName,
      );
      if (!isModelInNamespace) {
        setData('deployedModelName', '');
        setData('model', {
          ...data.model,
          name: '',
          url: '',
        });
      }
    }
  }, [namespace, modelOptions, data.deployedModelName, setData, data.model]);

  const findOptionForKey = (key: string): ModelTypeOption | undefined =>
    modelTypeOptions.find((option) => option.key === key);
  const selectedOption = data.modelType ? findOptionForKey(data.modelType) : undefined;
  const selectedLabel = selectedOption?.label ?? 'Select type a model';
  const selectedModel = modelOptions.find(
    (model: ModelOption) => model.value === data.deployedModelName,
  );
  const selectedModelLabel = selectedModel?.label || 'Select a model';

  const isLoading = !inferenceServices.loaded && !inferenceServices.error;
  const hasNoModels =
    inferenceServices.loaded && !inferenceServices.error && modelOptions.length === 0;

  return (
    <LMEvalFormApplicationPage
      loaded
      title="Evaluate model"
      description={
        <>
          Test your model against a large number of different evaluation tasks to understand your
          model&apos;s performance, as well as its strengths and weaknesses.
        </>
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/modelEvaluations">Model evaluations</Link>} />
          <BreadcrumbItem isActive>Evaluate model</BreadcrumbItem>
        </Breadcrumb>
      }
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Form data-testid="lmEvaluationForm" maxWidth="800px">
          <FormGroup label="Model Name" isRequired>
            <Select
              isOpen={openModelName}
              selected={data.deployedModelName}
              onSelect={(e, selectValue) => {
                const selectedModelName = String(selectValue);
                const result = handleModelSelection(
                  selectedModelName,
                  modelOptions,
                  data.model,
                  data.modelType,
                  findOptionForKey,
                );

                setData('deployedModelName', result.deployedModelName);
                setData('model', result.model);
                setOpenModelName(false);
              }}
              onOpenChange={setOpenModelName}
              toggle={(toggleRef) => (
                <MenuToggle
                  isFullWidth
                  ref={toggleRef}
                  aria-label="Model options menu"
                  onClick={() => setOpenModelName(!openModelName)}
                  isExpanded={openModelName}
                  isDisabled={false}
                >
                  <Truncate content={selectedModelLabel} className="truncate-no-min-width" />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {isLoading ? (
                  <>
                    <SelectOption key="skeleton-1" isDisabled>
                      <Skeleton width="80%" />
                    </SelectOption>
                    <SelectOption key="skeleton-2" isDisabled>
                      <Skeleton width="60%" />
                    </SelectOption>
                    <SelectOption key="skeleton-3" isDisabled>
                      <Skeleton width="90%" />
                    </SelectOption>
                  </>
                ) : hasNoModels ? (
                  <div style={{ padding: '1rem' }}>
                    <EmptyState
                      headingLevel="h4"
                      icon={CubesIcon}
                      titleText="No vLLM models available"
                      variant="xs"
                    >
                      <EmptyStateBody>
                        No vLLM inference services are available in the &apos;{namespace}&apos;
                        namespace. Deploy a vLLM model to proceed with evaluation.
                      </EmptyStateBody>
                    </EmptyState>
                  </div>
                ) : (
                  modelOptions.map((option: ModelOption) => (
                    <SelectOption
                      value={option.value}
                      key={option.value}
                      description={`${option.displayName} in ${option.namespace}`}
                    >
                      {option.label}
                    </SelectOption>
                  ))
                )}
              </SelectList>
            </Select>
          </FormGroup>
          {/* TODO: add popover content */}
          <FormGroup
            label="Evaluation name"
            isRequired
            labelHelp={
              <Popover bodyContent={<></>}>
                <Button
                  icon={
                    <Icon isInline>
                      <OutlinedQuestionCircleIcon />
                    </Icon>
                  }
                  variant="plain"
                  isInline
                />
              </Popover>
            }
          >
            <TextInput
              aria-label="Evaluation name"
              value={data.evaluationName}
              onChange={(_event, v) => setData('evaluationName', v)}
            />
          </FormGroup>
          <LmEvaluationTaskSection
            tasks={data.tasks}
            setTasks={(selectedTasks: string[]) => setData('tasks', selectedTasks)}
          />
          <FormGroup label="Model type" isRequired>
            <Select
              isOpen={open}
              selected={data.modelType}
              onSelect={(e, selectValue) => {
                const modelType = String(selectValue);
                const result = handleModelTypeSelection(modelType, data.model, findOptionForKey);

                setData('modelType', result.modelType);
                setData('model', result.model);
                setOpen(false);
              }}
              onOpenChange={setOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  isFullWidth
                  ref={toggleRef}
                  aria-label="Options menu"
                  onClick={() => setOpen(!open)}
                  isExpanded={open}
                >
                  <Truncate content={selectedLabel} className="truncate-no-min-width" />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {modelTypeOptions.map((option) => (
                  <SelectOption
                    value={option.key}
                    key={option.key}
                    description={option.description}
                  >
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
          <LmEvaluationSecuritySection
            allowOnline={data.allowOnline}
            allowRemoteCode={data.allowRemoteCode}
            setAllowRemoteCode={(allowRemoteCode: boolean) =>
              setData('allowRemoteCode', allowRemoteCode)
            }
            setAllowOnline={(allowOnline: boolean) => setData('allowOnline', allowOnline)}
          />
          <LmModelArgumentSection
            modelArgument={data.model}
            setModelArgument={(modelArgument: LmModelArgument) => setData('model', modelArgument)}
          />
          <FormSection>
            <LMEvalFormFooter data={data} namespace={namespace} />
          </FormSection>
        </Form>
      </PageSection>
    </LMEvalFormApplicationPage>
  );
};

export default LMEvalForm;
