import * as React from 'react';
import { isMcpPreviewReady } from '~/app/pages/mcpCatalogSettings/utils/validation';
import { transformMcpFormDataToConfig } from '~/app/pages/mcpCatalogSettings/utils/mcpCatalogSettingsUtils';
import {
  McpCatalogSourceConfig,
  McpCatalogSourcePreviewRequest,
  McpCatalogSourcePreviewAsset,
  McpCatalogSourcePreviewSummary,
} from '~/app/mcpServerCatalogTypes';
import { McpCatalogSettingsAPIState } from '~/app/hooks/mcpCatalogSettings/useMcpCatalogSettingsAPIState';
import { CatalogSettingsPreviewTab } from '~/app/shared/catalogSettings/hooks/previewTypes';
import { useCatalogSourcePreviewCore } from '~/app/shared/catalogSettings/hooks/useCatalogSourcePreviewCore';
import { useUserInteraction } from '~/concepts/userInteraction';
import { MCP_CATALOG_SOURCES_EVENTS } from '~/app/pages/mcpCatalogSettings/tracking/mcpCatalogSourcesTracking';
import { ManageMcpSourceFormData } from './useManageMcpSourceData';

export type McpPreviewTabState = {
  items: McpCatalogSourcePreviewAsset[];
  nextPageToken?: string;
  hasMore: boolean;
};

export type McpPreviewState = {
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  summary?: McpCatalogSourcePreviewSummary;
  tabStates: Record<CatalogSettingsPreviewTab, McpPreviewTabState>;
  error?: Error;
  lastPreviewedData?: McpCatalogSourcePreviewRequest;
  activeTab: CatalogSettingsPreviewTab;
};

export interface UseMcpSourcePreviewOptions {
  formData: ManageMcpSourceFormData;
  existingSourceConfig?: McpCatalogSourceConfig;
  apiState: McpCatalogSettingsAPIState;
  isEditMode: boolean;
}

export interface UseMcpSourcePreviewResult {
  previewState: McpPreviewState;
  handlePreview: () => Promise<void>;
  handleTabChange: (tab: CatalogSettingsPreviewTab) => void;
  handleLoadMore: () => void;
  hasFormChanged: boolean;
  canPreview: boolean;
}

export const useMcpSourcePreview = ({
  formData,
  existingSourceConfig,
  apiState,
  isEditMode,
}: UseMcpSourcePreviewOptions): UseMcpSourcePreviewResult => {
  const { trackSimpleEvent } = useUserInteraction();
  const trackingContext = isEditMode ? 'manage_source' : 'add_source';
  const canPreview = isMcpPreviewReady(formData);

  const trackPreviewCompleted = React.useCallback(
    (
      success: boolean,
      requestData: McpCatalogSourcePreviewRequest | undefined,
      serversFoundCount: number,
      errorType?: string,
    ) => {
      trackSimpleEvent(MCP_CATALOG_SOURCES_EVENTS.PREVIEW_COMPLETED, {
        context: trackingContext,
        success,
        serversFoundCount,
        includedFiltersUsed: (requestData?.includedServers?.length ?? 0) > 0,
        excludedFiltersUsed: (requestData?.excludedServers?.length ?? 0) > 0,
        ...(errorType ? { errorType } : {}),
      });
    },
    [trackSimpleEvent, trackingContext],
  );

  const buildPreviewRequest = React.useCallback((): McpCatalogSourcePreviewRequest => {
    const config = transformMcpFormDataToConfig(formData, existingSourceConfig);
    return {
      type: config.type,
      includedServers: config.includedServers,
      excludedServers: config.excludedServers,
      properties: {
        yaml: config.yaml,
        yamlCatalogPath: config.yamlCatalogPath,
      },
    };
  }, [formData, existingSourceConfig]);

  const previewApi = React.useCallback(
    async (
      opts: Parameters<McpCatalogSettingsAPIState['api']['previewMcpCatalogSource']>[0],
      data: McpCatalogSourcePreviewRequest,
      queryParams?: Parameters<McpCatalogSettingsAPIState['api']['previewMcpCatalogSource']>[2],
    ) => {
      const isFreshPreview =
        !queryParams?.nextPageToken &&
        queryParams?.filterStatus === CatalogSettingsPreviewTab.INCLUDED;

      try {
        const result = await apiState.api.previewMcpCatalogSource(opts, data, queryParams);
        if (isFreshPreview) {
          trackPreviewCompleted(true, data, result.summary.totalAssets);
        }
        return result;
      } catch (error) {
        if (isFreshPreview) {
          trackPreviewCompleted(false, data, 0, 'preview_failed');
        }
        throw error;
      }
    },
    [apiState.api, trackPreviewCompleted],
  );

  const { previewState, handlePreviewInternal, handleTabChange, handleLoadMore, hasFormChanged } =
    useCatalogSourcePreviewCore<
      McpCatalogSourcePreviewAsset,
      McpCatalogSourcePreviewSummary,
      McpCatalogSourcePreviewRequest
    >({
      canPreview,
      isEditMode,
      apiAvailable: apiState.apiAvailable,
      buildPreviewRequest,
      previewApi,
    });

  const handlePreview = React.useCallback(async () => {
    if (!apiState.apiAvailable) {
      trackPreviewCompleted(false, undefined, 0, 'api_unavailable');
    }
    await handlePreviewInternal();
  }, [apiState.apiAvailable, handlePreviewInternal, trackPreviewCompleted]);

  return {
    previewState,
    handlePreview,
    handleTabChange,
    handleLoadMore,
    hasFormChanged,
    canPreview,
  };
};
