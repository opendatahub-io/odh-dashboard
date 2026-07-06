import * as React from 'react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentKF, PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineParams, PipelinesFilter } from '#~/concepts/pipelines/types';
import { NotReadyError } from '#~/utilities/useFetchState';

export type LoadMoreProps = {
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filter?: PipelinesFilter;
};

export const useActiveExperimentLoadMore = (
  initialState: UsePipelineDataRefProps<ExperimentKF>,
): ((props: LoadMoreProps) => [ExperimentKF[], () => Promise<void>]) => {
  const { api } = usePipelinesAPI();
  const { dataRef, pageTokenRef, showMoreData } = usePipelineDataRefs<ExperimentKF>(initialState);

  return React.useCallback(
    ({ ...loadMoreProps }) => {
      const onLoadMore = async () => {
        if (!pageTokenRef.current) {
          return;
        }
        const result = await api.listActiveExperiments(
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
  initialState: UsePipelineDataRefProps<PipelineKF>,
): ((props: LoadMoreProps) => [PipelineKF[], () => Promise<void>]) => {
  const { api } = usePipelinesAPI();
  const { dataRef, pageTokenRef, showMoreData } = usePipelineDataRefs<PipelineKF>(initialState);

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
  initialState: UsePipelineDataRefProps<PipelineVersionKF>,
  pipelineId?: string,
): ((props: LoadMoreProps) => [PipelineVersionKF[], () => Promise<void>]) => {
  const { api } = usePipelinesAPI();
  const { dataRef, pageTokenRef, showMoreData } =
    usePipelineDataRefs<PipelineVersionKF>(initialState);
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
