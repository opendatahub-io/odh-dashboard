import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  Gallery,
  GalleryItem,
  HelperText,
  HelperTextItem,
  TextArea,
  Title,
  useWizardContext,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleUpIcon, PencilAltIcon } from '@patternfly/react-icons';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { defineGoalExamples } from '~/app/components/suiteBuilder/data/defineGoalExamples';
import RecommendationModelModal from '~/app/components/suiteBuilder/RecommendationModelModal';
import type { RecommendationModelProfile } from '~/app/types';
import {
  defineGoalFieldNames,
  MAX_EVALUATION_GOAL_LENGTH,
  type SuiteBuilderFormValues,
} from '~/app/schemas/suiteBuilder.schema';

import './DefineGoalStep.scss';

type DefineGoalStepProps = {
  recommendationModels: RecommendationModelProfile[];
  canRecommend: boolean;
};

const VISIBLE_EXAMPLE_COUNT = 3;

const DefineGoalStep: React.FC<DefineGoalStepProps> = ({ recommendationModels, canRecommend }) => {
  const { control, setValue, trigger } = useFormContext<SuiteBuilderFormValues>();
  const { goToNextStep } = useWizardContext();
  const generatorModelId = useWatch({ control, name: 'generatorModelId' });
  const selectedModel = recommendationModels.find((model) => model.id === generatorModelId);
  const [isModelModalOpen, setIsModelModalOpen] = React.useState(false);
  const [areAllExamplesVisible, setAreAllExamplesVisible] = React.useState(false);
  const visibleExamples = areAllExamplesVisible
    ? defineGoalExamples
    : defineGoalExamples.slice(0, VISIBLE_EXAMPLE_COUNT);
  const evaluationGoal = useWatch({ control, name: 'evaluationGoal' });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canRecommend) {
      goToNextStep();
      return;
    }
    void trigger([...defineGoalFieldNames]);
  };

  const handleOpenModelModal = () => {
    setIsModelModalOpen(true);
  };

  const handleCloseModelModal = () => {
    setIsModelModalOpen(false);
  };

  const handleSaveModel = (modelId: string) => {
    if (!recommendationModels.some((model) => model.id === modelId)) {
      return;
    }
    setValue('generatorModelId', modelId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    handleCloseModelModal();
  };

  return (
    <div className="evalhub-goal-suite-page__step" data-testid="define-goal-step">
      <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-sm">
        Define goal
      </Title>
      <Content component="p" className="pf-v6-u-mb-lg">
        Describe what you want to test. AI will suggest benchmarks from the available catalog.
      </Content>
      <Form id="define-goal-form" data-testid="define-goal-form" noValidate onSubmit={handleSubmit}>
        <FormGroup
          label="What would you like to evaluate?"
          fieldId="goal-suite-evaluation-goal"
          isRequired
        >
          <Controller
            name="evaluationGoal"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <TextArea
                  id="goal-suite-evaluation-goal"
                  className="pf-v6-u-w-100"
                  isRequired
                  maxLength={MAX_EVALUATION_GOAL_LENGTH}
                  rows={5}
                  value={field.value}
                  onChange={(_event, value) => {
                    field.onChange(value);
                  }}
                  onBlur={field.onBlur}
                  validated={fieldState.error ? 'error' : 'default'}
                  aria-invalid={fieldState.error ? true : undefined}
                  data-testid="goal-suite-evaluation-goal"
                />
                {fieldState.error?.message ? (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem
                        variant="error"
                        data-testid="suite-builder-evaluation-goal-error"
                      >
                        {fieldState.error.message}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                ) : null}
              </>
            )}
          />
        </FormGroup>

        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          gap={{ default: 'gapMd' }}
          className="evalhub-goal-suite__recommendation-model"
          data-testid="recommendation-model-summary"
        >
          <FlexItem>
            <strong>Recommendation model</strong>
          </FlexItem>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapXs' }}>
              <FlexItem data-testid="selected-recommendation-model">
                {selectedModel?.displayName ?? 'Unavailable'}
              </FlexItem>
              {recommendationModels.length > 0 ? (
                <FlexItem>
                  <Button
                    type="button"
                    variant="plain"
                    size="sm"
                    icon={<PencilAltIcon aria-hidden />}
                    aria-label="Edit recommendation model"
                    onClick={handleOpenModelModal}
                    data-testid="edit-recommendation-model"
                  />
                </FlexItem>
              ) : null}
            </Flex>
          </FlexItem>
        </Flex>
        {recommendationModels.length === 0 ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem data-testid="recommendation-model-unavailable">
                Recommendation models are unavailable in this environment.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}

        <section
          className="evalhub-goal-suite__examples"
          aria-labelledby="define-goal-examples-title"
        >
          <Title
            headingLevel="h3"
            size="lg"
            id="define-goal-examples-title"
            className="pf-v6-u-mb-sm"
          >
            Start with an example
          </Title>
          <Content component="p" className="pf-v6-u-mb-md">
            Select an example, then edit it to suit your use case.
          </Content>
          <Gallery
            hasGutter
            aria-label="Goal examples"
            minWidths={{ default: '100%', md: '250px' }}
          >
            {visibleExamples.map((example) => {
              const isSelected = evaluationGoal === example.description;
              return (
                <GalleryItem key={example.id}>
                  <Card
                    component="button"
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setValue('evaluationGoal', example.description, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className="evalhub-goal-suite__example-card"
                    data-testid={`define-goal-example-${example.id}`}
                  >
                    <CardTitle component="span">{example.title}</CardTitle>
                    <CardBody component="span">{example.description}</CardBody>
                  </Card>
                </GalleryItem>
              );
            })}
          </Gallery>
          <Button
            type="button"
            variant="link"
            isInline
            className="pf-v6-u-mt-md"
            icon={
              areAllExamplesVisible ? <AngleUpIcon aria-hidden /> : <AngleDownIcon aria-hidden />
            }
            aria-expanded={areAllExamplesVisible}
            onClick={() => setAreAllExamplesVisible((visible) => !visible)}
            data-testid="define-goal-view-examples"
          >
            {areAllExamplesVisible ? 'View fewer examples' : 'View more examples'}
          </Button>
        </section>
      </Form>

      <RecommendationModelModal
        key={isModelModalOpen ? (selectedModel?.id ?? 'no-selection') : 'closed'}
        isOpen={isModelModalOpen}
        selectedModelId={selectedModel?.id ?? ''}
        recommendationModels={recommendationModels}
        onClose={handleCloseModelModal}
        onSave={handleSaveModel}
      />
    </div>
  );
};

export default DefineGoalStep;
