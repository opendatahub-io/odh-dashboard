import * as React from 'react';
import {
  Form,
  FormGroup,
  Checkbox,
  Stack,
  StackItem,
  Sidebar,
  SidebarPanel,
  SidebarContent,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import FormSection from '~/app/pages/modelRegistry/components/pf-overrides/FormSection';
import { mcpCatalogSettingsUrl } from '~/app/routes/mcpCatalogSettings/mcpCatalogSettings';
import { isMcpFormValid } from '~/app/pages/mcpCatalogSettings/utils/validation';
import { useManageMcpSourceData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
import { useMcpSourcePreview } from '~/app/pages/mcpCatalogSettings/useMcpSourcePreview';
import {
  MCP_FORM_LABELS,
  MCP_DESCRIPTION_TEXT,
  MCP_ERROR_MESSAGES,
} from '~/app/pages/mcpCatalogSettings/constants';
import { McpCatalogSettingsContext } from '~/app/context/mcpCatalogSettings/McpCatalogSettingsContext';
import {
  mcpSourceConfigToFormData,
  getMcpPayloadForConfig,
  transformMcpFormDataToConfig,
} from '~/app/pages/mcpCatalogSettings/utils/mcpCatalogSettingsUtils';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
import { useUserInteraction, TrackingOutcome } from '~/concepts/userInteraction';
import {
  MCP_CATALOG_SOURCES_EVENTS,
  encodeMcpFieldsModified,
  getMcpFieldsModified,
  getMcpServerVisibilityType,
  getMcpTrackingSourceType,
  hasMcpVisibilityFilters,
} from '~/app/pages/mcpCatalogSettings/tracking/mcpCatalogSourcesTracking';
import McpSourceDetailsSection from './McpSourceDetailsSection';
import McpYamlSection from './McpYamlSection';
import McpServerFiltersSection from './McpServerFiltersSection';
import McpPreviewPanel from './McpPreviewPanel';
import McpManageSourceFormFooter from './McpManageSourceFormFooter';

type McpManageSourceFormProps = {
  existingSourceConfig?: McpCatalogSourceConfig;
  isEditMode: boolean;
  onToggleExpectedFormatDrawer?: () => void;
};

const McpManageSourceForm: React.FC<McpManageSourceFormProps> = ({
  existingSourceConfig,
  isEditMode,
  onToggleExpectedFormatDrawer,
}) => {
  const navigate = useNavigate();
  const { trackSimpleEvent, trackFormEvent } = useUserInteraction();
  const existingData = existingSourceConfig
    ? mcpSourceConfigToFormData(existingSourceConfig)
    : undefined;
  const [formData, setData] = useManageMcpSourceData(existingData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error | undefined>(undefined);
  const { apiState, refreshMcpCatalogSourceConfigs } = React.useContext(McpCatalogSettingsContext);
  const trackingContext = isEditMode ? 'manage_source' : 'add_source';
  const formEventName = isEditMode
    ? MCP_CATALOG_SOURCES_EVENTS.SOURCE_UPDATED
    : MCP_CATALOG_SOURCES_EVENTS.SOURCE_ADDED;

  const preview = useMcpSourcePreview({
    formData,
    existingSourceConfig,
    apiState,
    isEditMode,
  });

  const isFormComplete = isMcpFormValid(formData);

  const handleUserPreview = React.useCallback(async () => {
    trackSimpleEvent(MCP_CATALOG_SOURCES_EVENTS.PREVIEW_SELECTED, {
      context: trackingContext,
      hasYamlContent: formData.isDefault || formData.yamlContent.trim().length > 0,
      hasName: formData.name.trim().length > 0,
      hasVisibilityFilters: hasMcpVisibilityFilters(formData),
    });
    await preview.handlePreview();
  }, [formData, preview, trackSimpleEvent, trackingContext]);

  const previewWithTracking = React.useMemo(
    () => ({
      ...preview,
      handlePreview: handleUserPreview,
    }),
    [preview, handleUserPreview],
  );

  const handleSubmit = async () => {
    const trackingSourceType = getMcpTrackingSourceType(existingSourceConfig ?? formData);
    const trackingSourceId = formData.id || existingSourceConfig?.id;

    if (!apiState.apiAvailable) {
      setSubmitError(new Error('API is not available'));
      trackFormEvent(formEventName, {
        outcome: TrackingOutcome.submit,
        success: false,
        error: 'api_unavailable',
        sourceId: trackingSourceId,
        sourceType: trackingSourceType,
      });
      return;
    }
    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      const sourceConfig = transformMcpFormDataToConfig(formData, existingSourceConfig);
      const payload = getMcpPayloadForConfig(sourceConfig, isEditMode);
      const serverVisibilityType = getMcpServerVisibilityType(
        sourceConfig.includedServers,
        sourceConfig.excludedServers,
      );

      if (isEditMode) {
        await apiState.api.updateMcpCatalogSourceConfig({}, formData.id, payload);
        trackFormEvent(MCP_CATALOG_SOURCES_EVENTS.SOURCE_UPDATED, {
          outcome: TrackingOutcome.submit,
          success: true,
          sourceId: trackingSourceId,
          sourceType: trackingSourceType,
          fieldsModified: encodeMcpFieldsModified(getMcpFieldsModified(formData, existingData)),
          isEnabled: formData.enabled,
          serverVisibilityType,
        });
      } else {
        const created = await apiState.api.createMcpCatalogSourceConfig({}, payload);
        trackFormEvent(MCP_CATALOG_SOURCES_EVENTS.SOURCE_ADDED, {
          outcome: TrackingOutcome.submit,
          success: true,
          sourceId: created.id,
          serversCount: preview.previewState.summary?.totalAssets ?? 0,
          isEnabled: formData.enabled,
          serverVisibilityType,
          hasIncludedFilters: (sourceConfig.includedServers?.length ?? 0) > 0,
          hasExcludedFilters: (sourceConfig.excludedServers?.length ?? 0) > 0,
        });
      }

      refreshMcpCatalogSourceConfigs();
      navigate(mcpCatalogSettingsUrl());
    } catch (error) {
      trackFormEvent(formEventName, {
        outcome: TrackingOutcome.submit,
        success: false,
        error: 'save_failed',
        sourceId: trackingSourceId,
        sourceType: trackingSourceType,
      });
      setSubmitError(error instanceof Error ? error : new Error(MCP_ERROR_MESSAGES.SAVE_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    trackFormEvent(formEventName, {
      outcome: TrackingOutcome.cancel,
    });
    navigate(mcpCatalogSettingsUrl());
  };

  return (
    <>
      <Sidebar hasBorder isPanelRight hasGutter>
        <SidebarContent>
          <Form isWidthLimited>
            <Stack hasGutter>
              <StackItem>
                <McpSourceDetailsSection
                  formData={formData}
                  setData={setData}
                  isEditMode={isEditMode}
                  existingSourceConfig={existingSourceConfig}
                  serverCount={preview.previewState.summary?.totalAssets}
                />
              </StackItem>

              {!formData.isDefault && (
                <StackItem>
                  <McpYamlSection
                    formData={formData}
                    setData={setData}
                    onToggleExpectedFormatDrawer={onToggleExpectedFormatDrawer}
                  />
                </StackItem>
              )}

              <StackItem>
                <McpServerFiltersSection
                  formData={formData}
                  setData={setData}
                  isDefaultExpanded={
                    existingData?.isDefault ||
                    !!existingData?.includedServers ||
                    !!existingData?.excludedServers
                  }
                />
              </StackItem>

              <StackItem>
                <FormSection>
                  <FormGroup fieldId="mcp-enable-source">
                    <Checkbox
                      label={
                        <span className="pf-v6-c-form__label-text">
                          {MCP_FORM_LABELS.ENABLE_SOURCE}
                        </span>
                      }
                      id="mcp-enable-source"
                      name="mcp-enable-source"
                      data-testid="mcp-enable-source-checkbox"
                      description={MCP_DESCRIPTION_TEXT.ENABLE_SOURCE}
                      isChecked={formData.enabled}
                      onChange={(_event, checked) => setData('enabled', checked)}
                    />
                  </FormGroup>
                </FormSection>
              </StackItem>
            </Stack>
          </Form>
        </SidebarContent>
        <SidebarPanel width={{ default: 'width_50' }}>
          <McpPreviewPanel preview={previewWithTracking} />
        </SidebarPanel>
      </Sidebar>
      <McpManageSourceFormFooter
        submitLabel={isEditMode ? 'Save' : 'Add'}
        submitError={submitError}
        isSubmitDisabled={!isFormComplete || isSubmitting}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isPreviewDisabled={!preview.canPreview}
        isPreviewLoading={preview.previewState.isLoadingInitial}
        onPreview={handleUserPreview}
      />
    </>
  );
};

export default McpManageSourceForm;
