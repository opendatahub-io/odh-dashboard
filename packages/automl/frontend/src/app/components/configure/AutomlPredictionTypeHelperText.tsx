import * as React from 'react';
import {
  Flex,
  FlexItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import AiExperienceIcon from '@odh-dashboard/internal/images/icons/AiExperienceIcon';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import type { ColumnSchema } from '~/app/hooks/queries';
import {
  formatTargetColumnUniqueValuesMessage,
  getTargetColumnUniqueValueCount,
} from '~/app/utilities/columnUtils';

const NO_TARGET_COLUMN_MESSAGE =
  'Select a target column above to see prediction type recommendations.';

const UNIQUE_VALUE_COUNT_POPOVER_BODY =
  'This count is based on a data sample and might not reflect all unique values.';

type AutomlPredictionTypeHelperTextProps = {
  targetColumn?: string;
  selectedColumn?: ColumnSchema;
};

const AutomlPredictionTypeHelperText: React.FC<AutomlPredictionTypeHelperTextProps> = ({
  targetColumn,
  selectedColumn,
}) => {
  const hasTargetColumn = Boolean(targetColumn?.trim());

  if (!hasTargetColumn) {
    return (
      <FormHelperText data-testid="prediction-type-helper-no-target">
        <HelperText>
          <HelperTextItem variant="indeterminate">{NO_TARGET_COLUMN_MESSAGE}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    );
  }

  const uniqueCount = getTargetColumnUniqueValueCount(selectedColumn);
  const summaryMessage =
    uniqueCount != null
      ? formatTargetColumnUniqueValuesMessage(targetColumn!, uniqueCount)
      : `Column "${targetColumn}" analyzed`;

  return (
    <FormHelperText data-testid="prediction-type-helper-target-selected">
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapXs' }}
        display={{ default: 'inlineFlex' }}
      >
        <FlexItem>
          <HelperText>
            <HelperTextItem icon={<AiExperienceIcon />} variant="default">
              <span data-testid="prediction-type-unique-count-summary">{summaryMessage}</span>
            </HelperTextItem>
          </HelperText>
        </FlexItem>
        <FlexItem>
          <Popover bodyContent={UNIQUE_VALUE_COUNT_POPOVER_BODY}>
            <DashboardPopupIconButton
              aria-label="More information about unique value count"
              icon={<OutlinedQuestionCircleIcon />}
              hasNoPadding
              data-testid="prediction-type-unique-count-help"
            />
          </Popover>
        </FlexItem>
      </Flex>
    </FormHelperText>
  );
};

export default AutomlPredictionTypeHelperText;
