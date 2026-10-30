import * as React from 'react';
export type YamlUploadSectionTestIds = {
    section?: string;
    contentInput?: string;
    contentError?: string;
    fileUploadError?: string;
    expectedFormatLink?: string;
};
type YamlUploadSectionProps = {
    yamlContent: string;
    onChange: (value: string) => void;
    onToggleExpectedFormatDrawer?: () => void;
    /** Base id for the FileUpload input; defaults to 'yaml-content'. */
    fieldId?: string;
    yamlContentLabel: string;
    expectedFormatLabel: string;
    yamlContentRequiredMessage: string;
    yamlHelperText: React.ReactNode;
    fileUploadFailedTitle: string;
    fileUploadFailedBody: string;
    testIds?: YamlUploadSectionTestIds;
};
declare const YamlUploadSection: React.FC<YamlUploadSectionProps>;
export default YamlUploadSection;
