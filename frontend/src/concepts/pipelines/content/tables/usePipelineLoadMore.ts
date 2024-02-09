import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import { NotReadyError } from '~/utilities/useFetchState';

type LoadMoreProps = {
  initialPageToken?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  loaded?: boolean;
  filter?: PipelinesFilter;
};

type PipelineLoadMoreProps = {
  initialData: PipelineKFv2[];
} & LoadMoreProps;

type PipelineVersionLoadMoreProps = {
  pipelineId?: string;
  initialData: PipelineVersionKFv2[];
} & LoadMoreProps;

export const usePipelineLoadMore = ({
  initialData,
  initialPageToken,
  sortDirection,
  sortField,
  loaded,
  filter,
}: PipelineLoadMoreProps): { data: PipelineKFv2[]; onLoadMore: () => Promise<void> } => {
  const { api } = usePipelinesAPI();
  const [, showMoreData] = React.useState(false);
  const dataRef = React.useRef<PipelineKFv2[]>([]);
  const pageTokenRef = React.useRef<string>();

  React.useMemo(() => {
    if (loaded) {
      dataRef.current = [...initialData];
      pageTokenRef.current = initialPageToken;
    }
    // Only change the data and page token when loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const onLoadMore = React.useCallback(async () => {
    if (!pageTokenRef.current) {
      return;
    }
    const result = await api.listPipelines(
      {},
      {
        pageToken: pageTokenRef.current,
        pageSize: 10,
        sortField,
        sortDirection,
        filter,
      },
    );
    showMoreData((flag) => !flag);
    dataRef.current = [...dataRef.current, ...(result.pipelines || [])];
    pageTokenRef.current = result.next_page_token;
  }, [api, sortDirection, sortField, filter]);

  return { data: dataRef.current, onLoadMore };
};

export const usePipelineVersionLoadMore = ({
  initialData,
  initialPageToken,
  pipelineId,
  sortDirection,
  sortField,
  filter,
  loaded,
}: PipelineVersionLoadMoreProps): {
  data: PipelineVersionKFv2[];
  onLoadMore: () => Promise<void>;
} => {
  const { api } = usePipelinesAPI();
  const [, showMoreData] = React.useState<boolean>(false);
  const dataRef = React.useRef<PipelineVersionKFv2[]>([]);
  const pageTokenRef = React.useRef<string>();

  React.useMemo(() => {
    if (loaded) {
      dataRef.current = [...initialData];
      pageTokenRef.current = initialPageToken;
    }
    // Only change the data and page token when loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const onLoadMore = React.useCallback(async () => {
    if (!pageTokenRef.current) {
      return;
    }
    if (!pipelineId) {
      throw new NotReadyError('No pipeline id');
    }
    const result = await api.listPipelineVersions({}, pipelineId, {
      pageToken: pageTokenRef.current,
      pageSize: 10,
      sortField,
      sortDirection,
      filter,
    });
    showMoreData((flag) => !flag);
    dataRef.current = [...dataRef.current, ...(result.pipeline_versions || [])];
    pageTokenRef.current = result.next_page_token;
  }, [api, pipelineId, sortField, sortDirection, filter]);

  return { data: dataRef.current, onLoadMore };
};
