import * as React from 'react';
import type { PipelineRun } from '~/app/types';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { AutoragPattern } from '~/app/types/autoragPattern';

export type AutoragResultsContextProps = {
  pipelineRun?: PipelineRun;
  pipelineRunLoading?: boolean;
  patterns: Record<string, AutoragPattern>;
  patternsLoading?: boolean;
  parameters?: Partial<ConfigureSchema>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const AutoragResultsContext = React.createContext({} as AutoragResultsContextProps);

export const useAutoragResultsContext = (): AutoragResultsContextProps =>
  React.useContext(AutoragResultsContext);

export function getAutoragContext({
  pipelineRun,
  patterns = {},
  pipelineRunLoading,
  patternsLoading,
}: {
  pipelineRun?: PipelineRun;
  patterns?: Record<string, AutoragPattern>;
  pipelineRunLoading?: boolean;
  patternsLoading?: boolean;
}): AutoragResultsContextProps {
  return {
    pipelineRun,
    pipelineRunLoading,
    patterns,
    patternsLoading,
    parameters: {
      ...pipelineRun?.runtime_config?.parameters,
    },
  };
}
