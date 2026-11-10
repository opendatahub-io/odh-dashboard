import * as React from 'react';
import { UseSourcePreviewResult } from '~/app/pages/modelCatalogSettings/useSourcePreview';
type PreviewPanelProps = {
    preview: UseSourcePreviewResult;
    isSourceEnabled: boolean;
};
declare const PreviewPanel: React.FC<PreviewPanelProps>;
export default PreviewPanel;
