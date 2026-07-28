import * as React from 'react';
import { isEqual } from 'lodash-es';
import { isMcpPreviewReady } from '~/app/pages/mcpCatalogSettings/utils/validation';
import { transformMcpFormDataToConfig } from '~/app/pages/mcpCatalogSettings/utils/mcpCatalogSettingsUtils';
import {
  McpCatalogSourceConfig,
  McpCatalogSourcePreviewRequest,
  McpCatalogSourcePreviewAsset,
  McpCatalogSourcePreviewSummary,
} from '~/app/mcpServerCatalogTypes';
import { McpCatalogSettingsAPIState } from '~/app/hooks/mcpCatalogSettings/useMcpCatalogSettingsAPIState';
import { useUserInteraction } from '~/concepts/userInteraction';
import { MCP_CATALOG_SOURCES_EVENTS } from '~/app/pages/mcpCatalogSettings/tracking/mcpCatalogSourcesTracking';
import { ManageMcpSourceFormData } from './useManageMcpSourceData';

export enum McpPreviewTab {
  INCLUDED = 'included',
  EXCLUDED = 'excluded',
}

const DEFAULT_PREVIEW_PAGE_SIZE = 20;

const getTargetTab = (
  isFreshPreview: boolean,
  switchToTab: McpPreviewTab | undefined,
  activeTab: McpPreviewTab,
): McpPreviewTab => {
  if (isFreshPreview) {
    return McpPreviewTab.INCLUDED;
  }
  return switchToTab ?? activeTab;
};

export type McpPreviewTabState = {
  items: McpCatalogSourcePreviewAsset[];
  nextPageToken?: string;
  hasMore: boolean;
};

const initialTabState: McpPreviewTabState = {
  items: [],
  nextPageToken: undefined,
  hasMore: false,
};

export type McpPreviewState = {
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  summary?: McpCatalogSourcePreviewSummary;
  tabStates: Record<McpPreviewTab, McpPreviewTabState>;
  error?: Error;
  lastPreviewedData?: McpCatalogSourcePreviewRequest;
  activeTab: McpPreviewTab;
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
  handleTabChange: (tab: McpPreviewTab) => void;
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
  const [previewState, setPreviewState] = React.useState<McpPreviewState>({
    isLoadingInitial: false,
    isLoadingMore: false,
    tabStates: {
      [McpPreviewTab.INCLUDED]: initialTabState,
      [McpPreviewTab.EXCLUDED]: initialTabState,
    },
    activeTab: McpPreviewTab.INCLUDED,
  });

  const previewStateRef = React.useRef(previewState);
  previewStateRef.current = previewState;

  const canPreview = isMcpPreviewReady(formData);

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

  const hasFormChanged = React.useMemo(() => {
    if (!previewState.lastPreviewedData) {
      return false;
    }
    const currentRequest = buildPreviewRequest();
    return !isEqual(currentRequest, previewState.lastPreviewedData);
  }, [buildPreviewRequest, previewState.lastPreviewedData]);

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

  const handlePreviewInternal = React.useCallback(
    async (options?: { loadMore?: boolean; switchToTab?: McpPreviewTab }) => {
      const { loadMore = false, switchToTab } = options ?? {};
      const isFreshPreview = !loadMore && !switchToTab;
      const currentState = previewStateRef.current;
      const targetTab = getTargetTab(isFreshPreview, switchToTab, currentState.activeTab);

      if (!apiState.apiAvailable) {
        if (isFreshPreview) {
          trackPreviewCompleted(false, undefined, 0, 'api_unavailable');
        }
        setPreviewState((prev) => ({
          ...prev,
          isLoadingInitial: false,
          error: new Error('API is not available'),
        }));
        return;
      }

      if (isFreshPreview) {
        setPreviewState({
          isLoadingInitial: true,
          isLoadingMore: false,
          tabStates: {
            [McpPreviewTab.INCLUDED]: initialTabState,
            [McpPreviewTab.EXCLUDED]: initialTabState,
          },
          activeTab: McpPreviewTab.INCLUDED,
          error: undefined,
          summary: undefined,
          lastPreviewedData: undefined,
        });
      } else if (loadMore) {
        setPreviewState((prev) => ({ ...prev, isLoadingMore: true }));
      } else if (switchToTab) {
        setPreviewState((prev) => ({ ...prev, activeTab: switchToTab, isLoadingInitial: true }));
      }

      let requestData: McpCatalogSourcePreviewRequest;
      if (isFreshPreview) {
        requestData = buildPreviewRequest();
      } else if (currentState.lastPreviewedData) {
        requestData = currentState.lastPreviewedData;
      } else {
        return handlePreviewInternal();
      }

      const nextPageToken = loadMore ? currentState.tabStates[targetTab].nextPageToken : undefined;

      try {
        const result = await apiState.api.previewMcpCatalogSource({}, requestData, {
          filterStatus: targetTab,
          pageSize: DEFAULT_PREVIEW_PAGE_SIZE,
          nextPageToken,
        });

        if (isFreshPreview) {
          trackPreviewCompleted(true, requestData, result.summary.totalAssets);
        }

        setPreviewState((prev) => {
          const currentTabState = prev.tabStates[targetTab];
          const newItems = loadMore ? [...currentTabState.items, ...result.items] : result.items;

          return {
            ...prev,
            isLoadingInitial: false,
            isLoadingMore: false,
            summary: result.summary,
            lastPreviewedData: isFreshPreview ? requestData : prev.lastPreviewedData,
            tabStates: {
              ...prev.tabStates,
              [targetTab]: {
                items: newItems,
                nextPageToken: result.nextPageToken,
                hasMore: !!result.nextPageToken && result.items.length > 0,
              },
            },
            error: undefined,
          };
        });
      } catch (error) {
        if (isFreshPreview) {
          trackPreviewCompleted(false, requestData, 0, 'preview_failed');
        }
        const err = error instanceof Error ? error : new Error('Failed to preview source');
        setPreviewState((prev) => ({
          ...prev,
          isLoadingInitial: false,
          isLoadingMore: false,
          error: err,
        }));
      }
    },
    [apiState, buildPreviewRequest, trackPreviewCompleted],
  );

  const handlePreview = React.useCallback(async () => {
    await handlePreviewInternal();
  }, [handlePreviewInternal]);

  const handleTabChange = React.useCallback(
    (newTab: McpPreviewTab) => {
      const currentState = previewStateRef.current;
      if (newTab === currentState.activeTab) {
        return;
      }
      const tabState = currentState.tabStates[newTab];
      if (tabState.items.length === 0) {
        handlePreviewInternal({ switchToTab: newTab });
      } else {
        setPreviewState((prev) => ({ ...prev, activeTab: newTab }));
      }
    },
    [handlePreviewInternal],
  );

  const handleLoadMore = React.useCallback(() => {
    handlePreviewInternal({ loadMore: true });
  }, [handlePreviewInternal]);

  React.useEffect(() => {
    const hasNoResults = previewState.tabStates[McpPreviewTab.INCLUDED].items.length === 0;
    if (isEditMode && canPreview && hasNoResults) {
      handlePreviewInternal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    previewState,
    handlePreview,
    handleTabChange,
    handleLoadMore,
    hasFormChanged,
    canPreview,
  };
};
