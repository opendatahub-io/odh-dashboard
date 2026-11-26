import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
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
  Alert,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleUpIcon } from '@patternfly/react-icons';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { defineGoalExamples } from '~/app/components/collectionBuilder/data/defineGoalExamples';
import {
  defineGoalFieldNames,
  MAX_EVALUATION_GOAL_LENGTH,
  type CollectionBuilderFormValues,
} from '~/app/schemas/collectionBuilder.schema';

import './DefineGoalStep.scss';

type DefineGoalStepProps = {
  canRecommend: boolean;
  generationError?: Error;
  onRecommend: () => Promise<boolean>;
};

const VISIBLE_EXAMPLE_COUNT = 3;

const DefineGoalStep: React.FC<DefineGoalStepProps> = ({
  canRecommend,
  generationError,
  onRecommend,
}) => {
  const { control, setValue, trigger } = useFormContext<CollectionBuilderFormValues>();
  const { goToNextStep } = useWizardContext();
  const [areAllExamplesVisible, setAreAllExamplesVisible] = React.useState(false);
  const visibleExamples = areAllExamplesVisible
    ? defineGoalExamples
    : defineGoalExamples.slice(0, VISIBLE_EXAMPLE_COUNT);
  const evaluationGoal = useWatch({ control, name: 'evaluationGoal' });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canRecommend) {
      if (await onRecommend()) {
        goToNextStep();
      }
      return;
    }
    void trigger([...defineGoalFieldNames]);
  };

  return (
    <div className="evalhub-goal-collection-page__step" data-testid="define-goal-step">
      <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-sm">
        Define goal
      </Title>
      <Content component="p" className="pf-v6-u-mb-lg">
        Describe what you want to test. AI will suggest benchmarks from the available catalog.
      </Content>
      {generationError ? (
        <Alert
          variant="danger"
          title="Could not generate recommendations"
          isInline
          className="pf-v6-u-mb-md"
          data-testid="collection-generation-submit-error"
        >
          {generationError.message}
        </Alert>
      ) : null}
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

        <section
          className="evalhub-goal-collection__examples"
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
                    className="evalhub-goal-collection__example-card"
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
    </div>
  );
};

export default DefineGoalStep;
