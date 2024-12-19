import React from 'react';
import './MarkdownView.scss';
type MarkdownViewProps = {
    markdown?: string;
    className?: string;
    /** Strips some padding out so the content can fit as an inline-block effort */
    conciseDisplay?: boolean;
    component?: 'div' | 'span';
};
declare const MarkdownView: React.FC<MarkdownViewProps & React.HTMLAttributes<HTMLDivElement>>;
export default MarkdownView;
