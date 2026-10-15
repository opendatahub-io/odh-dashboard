import React from 'react';
type CodeBlockComponentProps = {
    children: string;
    /** Called after clipboard write succeeds. */
    onCopy?: () => void;
    /** When set, wraps only the code in a scrollable panel; copy actions stay fixed above it. */
    maxHeight?: string;
    scrollTestId?: string;
    codeTestId?: string;
    copyTestId?: string;
};
declare const CodeBlockComponent: React.FC<CodeBlockComponentProps>;
export default CodeBlockComponent;
