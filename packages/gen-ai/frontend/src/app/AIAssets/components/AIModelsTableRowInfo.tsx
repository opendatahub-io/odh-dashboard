import * as React from 'react';
import { Flex, FlexItem, Label } from '@patternfly/react-core';
import { AIModel } from '~/app/types';

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
  </Flex>
);

export default AIModelsTableRowInfo;
