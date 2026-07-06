import * as React from 'react';
import { Flex, FlexItem, Label } from '@patternfly/react-core';
import { AIModel } from '~/app/types';
import { isASRModel } from '~/app/utilities/utils';

type AIModelsTableRowInfoProps = {
  model: AIModel;
};

const AIModelsTableRowInfo: React.FC<AIModelsTableRowInfoProps> = ({ model }) => (
  <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>{model.display_name}</FlexItem>
    {model.model_type === 'embedding' && (
      <FlexItem style={{ fontWeight: 'normal' }}>
        <Label color="blue" isCompact>
          Embedding
        </Label>
      </FlexItem>
    )}
    {isASRModel(model) && (
      <FlexItem style={{ fontWeight: 'normal' }}>
        <Label color="purple" isCompact data-testid="asr-badge">
          ASR
        </Label>
      </FlexItem>
    )}
  </Flex>
);

export default AIModelsTableRowInfo;
