import * as React from 'react';
export type ExpectedYamlFormatDrawerTestIds = {
    title?: string;
    close?: string;
    copyButton?: string;
};
type ExpectedYamlFormatDrawerProps = {
    onClose: () => void;
    title: string;
    sampleYaml: string;
    /** Optional intro copy shown above the code block (MCP includes usage guidance). */
    intro?: React.ReactNode;
    /** Whether to show a "Copy to clipboard" action above the code block. */
    showCopyButton?: boolean;
    testIds?: ExpectedYamlFormatDrawerTestIds;
};
export declare const ExpectedYamlFormatDrawer: React.FC<ExpectedYamlFormatDrawerProps>;
export default ExpectedYamlFormatDrawer;
