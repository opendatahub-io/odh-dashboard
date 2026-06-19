import * as React from 'react';
import { AIModel } from '~/app/types';
import { isASRModel } from '~/app/utilities/utils';

const useASRModels = (aiModels: AIModel[]): AIModel[] =>
  React.useMemo(
    () => aiModels.filter((m) => isASRModel(m) && m.model_source_type === 'namespace'),
    [aiModels],
  );

export default useASRModels;
