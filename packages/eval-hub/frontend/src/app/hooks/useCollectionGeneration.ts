/* eslint-disable camelcase */
import * as React from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryObserverResult,
} from '@tanstack/react-query';
import {
  createCollectionGeneration,
  deleteCollectionGeneration,
  getCollectionGeneration,
} from '~/app/api/k8s';
import type { CollectionGenerationRequest, CollectionGenerationResource } from '~/app/types';

type CollectionGenerationController = {
  generationId?: string;
  generation?: CollectionGenerationResource;
  isLoading: boolean;
  isStarting: boolean;
  isStopping: boolean;
  createError?: Error;
  deleteError?: Error;
  pollError?: Error;
  startGeneration: (request: CollectionGenerationRequest) => Promise<CollectionGenerationResource>;
  deleteActiveGeneration: () => Promise<void>;
  stopGeneration: () => Promise<void>;
  clearGeneration: () => Promise<void>;
  resetMutations: () => void;
  retryPoll: () => Promise<QueryObserverResult<CollectionGenerationResource, Error>>;
};

const useCollectionGeneration = (namespace?: string): CollectionGenerationController => {
  const queryClient = useQueryClient();
  const [generationId, setGenerationId] = React.useState<string>();
  const [stoppedGenerationId, setStoppedGenerationId] = React.useState<string>();
  const queryKey = React.useMemo(
    () => ['evalhub', 'collectionGeneration', namespace, generationId] as const,
    [namespace, generationId],
  );

  const createMutation = useMutation({
    mutationFn: (request: CollectionGenerationRequest) => {
      if (!namespace) {
        return Promise.reject(new Error('Namespace is required to generate a collection'));
      }
      return createCollectionGeneration('', namespace, request)({});
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!namespace) {
        return Promise.reject(new Error('Namespace is required to cancel collection generation'));
      }
      return deleteCollectionGeneration('', namespace, id)({});
    },
  });
  const generationQuery = useQuery({
    queryKey,
    enabled:
      Boolean(namespace && generationId) &&
      generationId !== stoppedGenerationId &&
      !deleteMutation.isPending,
    queryFn: ({ signal }) => {
      if (!namespace || !generationId) {
        return Promise.reject(new Error('Collection generation is not ready to load'));
      }
      return getCollectionGeneration('', namespace, generationId)({ signal });
    },
    refetchInterval: (query) => {
      if (query.state.status === 'error') {
        return false;
      }
      const state = query.state.data?.status.state;
      return state === 'pending' || state === 'running' ? 8000 : false;
    },
    staleTime: 0,
  });

  const startGeneration = React.useCallback(
    async (request: CollectionGenerationRequest): Promise<CollectionGenerationResource> => {
      const resource = await createMutation.mutateAsync(request);
      setStoppedGenerationId(undefined);
      queryClient.setQueryData(
        ['evalhub', 'collectionGeneration', namespace, resource.resource.id],
        resource,
      );
      setGenerationId(resource.resource.id);
      return resource;
    },
    [createMutation, namespace, queryClient],
  );

  const deleteActiveGeneration = React.useCallback(async (): Promise<void> => {
    const resource = generationQuery.data;
    if (
      !generationId ||
      !resource ||
      (resource.status.state !== 'pending' && resource.status.state !== 'running')
    ) {
      return;
    }
    await queryClient.cancelQueries({ queryKey, exact: true });
    setStoppedGenerationId(generationId);
    deleteMutation.reset();
    try {
      await deleteMutation.mutateAsync(generationId);
    } catch (deleteError) {
      setStoppedGenerationId(undefined);
      throw deleteError;
    }
  }, [deleteMutation, generationId, generationQuery.data, queryClient, queryKey]);

  const stopGeneration = React.useCallback(async (): Promise<void> => {
    const resource = generationQuery.data;
    if (
      !generationId ||
      !resource ||
      (resource.status.state !== 'pending' && resource.status.state !== 'running')
    ) {
      return;
    }

    await deleteActiveGeneration();

    const cancelledResource: CollectionGenerationResource = {
      resource: resource.resource,
      request: resource.request,
      status: { state: 'cancelled' },
    };
    queryClient.setQueryData(queryKey, cancelledResource);
  }, [deleteActiveGeneration, generationId, generationQuery.data, queryClient, queryKey]);

  const clearGeneration = React.useCallback(async (): Promise<void> => {
    await queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.removeQueries({ queryKey, exact: true });
    setStoppedGenerationId(undefined);
    setGenerationId(undefined);
  }, [queryClient, queryKey]);

  const resetMutations = React.useCallback((): void => {
    createMutation.reset();
    deleteMutation.reset();
  }, [createMutation, deleteMutation]);

  return {
    generationId,
    generation: generationQuery.data,
    isLoading: Boolean(generationId) && generationQuery.isPending,
    isStarting: createMutation.isPending || deleteMutation.isPending,
    isStopping: deleteMutation.isPending,
    createError: createMutation.error ?? undefined,
    deleteError: deleteMutation.error ?? undefined,
    pollError: generationQuery.error ?? undefined,
    startGeneration,
    deleteActiveGeneration,
    stopGeneration,
    clearGeneration,
    resetMutations,
    retryPoll: generationQuery.refetch,
  };
};

export default useCollectionGeneration;
/* eslint-enable camelcase */
