import * as React from 'react';
import type { PipelineRun } from '~/app/types';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

// Based on the artifact schema from Pattern artifact metadata.
export type AutoragPattern = {
  name: string;
  iteration: number;
  max_combinations: number;
  duration_seconds: number;
  settings: {
    vector_store: {
      datasource_type: string;
      collection_name: string;
    };
    chunking: {
      method: 'sequential' | 'recursive';
      chunk_size: number;
      chunk_overlap: number;
    };
    embedding: {
      model_id: string;
      distance_metric: string;
      embedding_params: {
        embedding_dimension: number;
        context_length: number;
        timeout: null | number;
        model_type: null | string;
        provider_id: null | string;
        provider_resource_id: null | string;
      };
    };
    retrieval: {
      method: 'simple';
      number_of_chunks: number;
      search_mode: 'vector';
    };
    generation: {
      model_id: string;
      context_template_text: string;
      user_message_text: string;
      system_message_text: string;
    };
  };
  scoring: Partial<
    Record<
      string,
      {
        ci_high: number;
        ci_low: number;
        mean: number;
      }
    >
  >;
};

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
