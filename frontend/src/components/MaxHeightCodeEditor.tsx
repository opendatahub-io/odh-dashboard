import React from 'react';
import { CodeEditor } from '@patternfly/react-code-editor';

export const MaxHeightCodeEditor: React.FC<
  Partial<Omit<React.ComponentProps<typeof CodeEditor>, 'ref'>> & { maxHeight: number }
> = ({ maxHeight, ...props }) => {
  const [contentHeight, setContentHeight] = React.useState<number>(maxHeight);

  return (
    <CodeEditor
      onEditorDidMount={(editor) => setContentHeight(editor.getContentHeight())}
      editorProps={{
        height: `${contentHeight <= maxHeight ? contentHeight : maxHeight}px`,
      }}
      {...props}
    />
  );
};
