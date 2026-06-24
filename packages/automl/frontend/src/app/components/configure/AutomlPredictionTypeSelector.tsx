import * as React from 'react';
import classNames from 'classnames';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { WarningTriangleIcon } from '@patternfly/react-icons';
import type { ColumnSchema } from '~/app/hooks/queries';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { TASK_TYPE_TIMESERIES } from '~/app/utilities/const';
import {
  assessPredictionTypes,
  getInferredPredictionType,
  orderRecommendedAssessments,
  partitionPredictionTypeAssessments,
  PREDICTION_TYPE_OPTIONS,
  type PredictionTypeAssessment,
} from '~/app/utilities/predictionTypeUtils';
import './AutomlPredictionTypeSelector.scss';

type AutomlPredictionTypeSelectorProps = {
  value: ConfigureSchema['task_type'];
  onChange: (taskType: ConfigureSchema['task_type']) => void;
  onClearTimeseriesTimestamp: () => void;
  selectedColumn?: ColumnSchema;
  columns: { name: string; type: string }[];
  isDisabled?: boolean;
};

type PredictionTypeCardProps = {
  assessment: PredictionTypeAssessment;
  isSelected: boolean;
  isFormDisabled: boolean;
  onSelect: () => void;
};

const PredictionTypeCard: React.FC<PredictionTypeCardProps> = ({
  assessment,
  isSelected,
  isFormDisabled,
  onSelect,
}) => {
  const option = PREDICTION_TYPE_OPTIONS.find((o) => o.value === assessment.value);
  if (!option) {
    return null;
  }

  const reasonText = assessment.isRecommended
    ? assessment.recommendationReason
    : assessment.notRecommendedReason;
  const titleId = `task-type-label-${assessment.value}`;

  return (
    <Card
      isSelectable
      isCompact
      isSelected={isSelected}
      isDisabled={isFormDisabled}
      className={classNames('pf-v6-u-w-100', 'automl-prediction-type-card')}
      data-testid={`task-type-card-${assessment.value}`}
    >
      <CardHeader
        selectableActions={{
          selectableActionId: `task-type-${assessment.value}`,
          selectableActionAriaLabelledby: titleId,
          name: 'task_type',
          variant: 'single',
          hasNoOffset: true,
          onChange: () => onSelect(),
          selectableActionProps: {
            'data-testid': `task-type-radio-${assessment.value}`,
          },
        }}
      >
        <Flex
          alignItems={{ default: 'alignItemsFlexStart' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          gap={{ default: 'gapMd' }}
          className="pf-v6-u-w-100"
        >
          <FlexItem grow={{ default: 'grow' }}>
            <CardTitle id={titleId}>{option.label}</CardTitle>
          </FlexItem>
          <FlexItem shrink={{ default: 'shrink' }}>
            {assessment.isRecommended ? (
              <Label
                color="blue"
                isCompact
                data-testid={`task-type-badge-recommended-${assessment.value}`}
              >
                Recommended
              </Label>
            ) : (
              <Label
                color="yellow"
                icon={<WarningTriangleIcon />}
                isCompact
                data-testid={`task-type-badge-not-recommended-${assessment.value}`}
              >
                Not recommended
              </Label>
            )}
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        <Stack>
          <StackItem>
            <Content component="small">{option.description}</Content>
          </StackItem>
          {reasonText && (
            <StackItem>
              <Content
                component="small"
                className={classNames({
                  'automl-prediction-type__reason--not-recommended': !assessment.isRecommended,
                })}
              >
                <em>{reasonText}</em>
              </Content>
            </StackItem>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

const AutomlPredictionTypeSelector: React.FC<AutomlPredictionTypeSelectorProps> = ({
  value,
  onChange,
  onClearTimeseriesTimestamp,
  selectedColumn,
  columns,
  isDisabled = false,
}) => {
  const [showOtherTypes, setShowOtherTypes] = React.useState(false);
  // Reconfigure: auto-expand when a not-recommended type is pre-selected. Respect explicit collapse.
  const userCollapsedOtherTypesRef = React.useRef(false);

  const assessments = React.useMemo(
    () => assessPredictionTypes(selectedColumn, columns),
    [selectedColumn, columns],
  );
  const inferredTaskType = React.useMemo(
    () => getInferredPredictionType(selectedColumn, columns),
    [selectedColumn, columns],
  );
  const { recommended, notRecommended } = React.useMemo(() => {
    const partitioned = partitionPredictionTypeAssessments(assessments);
    return {
      recommended: orderRecommendedAssessments(partitioned.recommended, inferredTaskType),
      notRecommended: partitioned.notRecommended,
    };
  }, [assessments, inferredTaskType]);

  React.useEffect(() => {
    const isNotRecommendedSelected = notRecommended.some(
      (assessment) => assessment.value === value,
    );

    if (!isNotRecommendedSelected) {
      userCollapsedOtherTypesRef.current = false;
      return;
    }

    if (!userCollapsedOtherTypesRef.current) {
      setShowOtherTypes(true);
    }
  }, [value, notRecommended]);

  const handleToggleOtherTypes = () => {
    setShowOtherTypes((prev) => {
      const next = !prev;
      userCollapsedOtherTypesRef.current = !next;
      return next;
    });
  };

  const handleSelect = (taskType: ConfigureSchema['task_type']) => {
    onChange(taskType);
    if (taskType !== TASK_TYPE_TIMESERIES) {
      onClearTimeseriesTimestamp();
    }
  };

  return (
    <Stack hasGutter className="pf-v6-u-w-100">
      {recommended.map((assessment) => (
        <StackItem key={assessment.value}>
          <PredictionTypeCard
            assessment={assessment}
            isSelected={value === assessment.value}
            isFormDisabled={isDisabled}
            onSelect={() => handleSelect(assessment.value)}
          />
        </StackItem>
      ))}

      {notRecommended.length > 0 && (
        <StackItem>
          <Accordion
            asDefinitionList={false}
            togglePosition="start"
            className="pf-v6-u-w-100 automl-prediction-type-other-types-accordion"
          >
            <AccordionItem isExpanded={showOtherTypes}>
              <AccordionToggle
                id="prediction-type-other-types"
                data-testid="prediction-type-show-other-toggle"
                onClick={handleToggleOtherTypes}
              >
                {showOtherTypes ? 'Hide other prediction types' : 'Show other prediction types'}
              </AccordionToggle>
              <AccordionContent>
                <Stack hasGutter className="pf-v6-u-pt-sm">
                  {notRecommended.map((assessment) => (
                    <StackItem key={assessment.value}>
                      <PredictionTypeCard
                        assessment={assessment}
                        isSelected={value === assessment.value}
                        isFormDisabled={isDisabled}
                        onSelect={() => handleSelect(assessment.value)}
                      />
                    </StackItem>
                  ))}
                </Stack>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </StackItem>
      )}
    </Stack>
  );
};

export default AutomlPredictionTypeSelector;
