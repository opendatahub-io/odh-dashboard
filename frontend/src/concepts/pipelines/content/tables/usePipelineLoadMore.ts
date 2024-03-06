import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ExperimentKFv2, PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineParams, PipelinesFilter } from '~/concepts/pipelines/types';
import { NotReadyError } from '~/utilities/useFetchState';

export type LoadMoreProps = {
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filter?: PipelinesFilter;
};

export const useExperimentLoadMore = (
  initialState: UsePipelineDataRefProps<ExperimentKFv2>,
): ((props: LoadMoreProps) => [ExperimentKFv2[], () => Promise<void>]) => {
  const { api } = usePipelinesAPI();
  const { dataRef, pageTokenRef, showMoreData } = usePipelineDataRefs<ExperimentKFv2>(initialState);

  return React.useCallback(
    ({ ...loadMoreProps }) => {
      const onLoadMore = async () => {
        if (!pageTokenRef.current) {
          return;
        }
        const result = await api.listExperiments(
          {},
          getLoadMorePipelineParams({ pageTokenRef, ...loadMoreProps }),
        );
        showMoreData((flag) => !flag);
        dataRef.current = [...dataRef.current, ...(result.experiments || [])];
        pageTokenRef.current = result.next_page_token;
      };

      return [dataRef.current, onLoadMore];
    },
    [api, dataRef, pageTokenRef, showMoreData],
  );
};

export const usePipelineLoadMore = (
  initialState: UsePipelineDataRefProps<PipelineKFv2>,
): ((props: LoadMoreProps) => [PipelineKFv2[], () => Promise<void>]) => {
  const { api } = usePipelinesAPI();
  const { dataRef, pageTokenRef, showMoreData } = usePipelineDataRefs<PipelineKFv2>(initialState);

  return React.useCallback(
    ({ ...loadMoreProps }) => {
      const onLoadMore = async () => {
        if (!pageTokenRef.current) {
          return;
        }
        const result = await api.listPipelines(
          {},
          getLoadMorePipelineParams({ pageTokenRef, ...loadMoreProps }),
        );
        showMoreData((flag) => !flag);
        dataRef.current = [...dataRef.current, ...(result.pipelines || [])];
        pageTokenRef.current = result.next_page_token;
      };

      return [dataRef.current, onLoadMore];
    },
    [api, dataRef, pageTokenRef, showMoreData],
  );
};

export const usePipelineVersionLoadMore = (
  initialState: UsePipelineDataRefProps<PipelineVersionKFv2>,
  pipelineId?: string,
): ((props: LoadMoreProps) => [PipelineVersionKFv2[], () => Promise<void>]) => {
  const { api } = usePipelinesAPI();
  const { dataRef, pageTokenRef, showMoreData } =
    usePipelineDataRefs<PipelineVersionKFv2>(initialState);
  return React.useCallback(
    ({ ...loadMoreProps }) => {
      const onLoadMore = async () => {
        if (!pageTokenRef.current) {
          return;
        }
        if (!pipelineId) {
          throw new NotReadyError('No pipeline id');
        }
        const result = await api.listPipelineVersions(
          {},
          pipelineId,
          getLoadMorePipelineParams({ pageTokenRef, ...loadMoreProps }),
        );
        showMoreData((flag) => !flag);
        dataRef.current = [...dataRef.current, ...(result.pipeline_versions || [])];
        pageTokenRef.current = result.next_page_token;
      };

      return [dataRef.current, onLoadMore];
    },
    [api, dataRef, pageTokenRef, pipelineId, showMoreData],
  );
};

type UsePipelineDataRefProps<DataType> = {
  loaded?: boolean;
  initialData: DataType[];
  initialPageToken?: string;
};

export const usePipelineDataRefs = <T>({
  loaded,
  initialData,
  initialPageToken,
}: UsePipelineDataRefProps<T>): {
  dataRef: React.MutableRefObject<T[]>;
  pageTokenRef: React.MutableRefObject<string | undefined>;
  showMoreData: React.Dispatch<React.SetStateAction<boolean>>;
} => {
  const [, showMoreData] = React.useState<boolean>(false);
  const dataRef = React.useRef<T[]>([]);
  const pageTokenRef = React.useRef<string>();

  React.useMemo(() => {
    if (loaded) {
      dataRef.current = [...initialData];
      pageTokenRef.current = initialPageToken;
    }
    // Only change the data and page token when loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return { dataRef, pageTokenRef, showMoreData };
};

const getLoadMorePipelineParams = ({
  pageTokenRef,
  sortDirection,
  sortField,
  filter,
}: LoadMoreProps & {
  pageTokenRef: React.MutableRefObject<string | undefined>;
}): PipelineParams => ({
  pageToken: pageTokenRef.current,
  pageSize: 10,
  sortField,
  sortDirection,
  filter,
});
