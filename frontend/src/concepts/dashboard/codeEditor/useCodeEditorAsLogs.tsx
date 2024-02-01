import * as React from 'react';
import * as monacoEditor from 'monaco-editor';
import { EditorDidMount } from 'react-monaco-editor';
import { LOG_TAIL_LINES } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';

type UseCodeEditorAsLogs = {
  editorOptions: monacoEditor.editor.IStandaloneEditorConstructionOptions;
  onMount: EditorDidMount;
  scrollToBottom: () => void;
};

type EditorData = {
  editor: monacoEditor.editor.IStandaloneCodeEditor;
  monaco: typeof monacoEditor;
};

const useCodeEditorAsLogs = (): UseCodeEditorAsLogs => {
  const [editorData, setEditorData] = React.useState<EditorData | null>(null);

  const scrollToBottom = React.useCallback<UseCodeEditorAsLogs['scrollToBottom']>(() => {
    if (!editorData) {
      return;
    }

    // Move the cursor back to the start / unselect everything
    editorData.editor.setSelection(new editorData.monaco.Selection(0, 0, 0, 0));

    // Scroll to the bottom
    editorData.editor.revealLine(editorData.editor.getModel()?.getLineCount() ?? LOG_TAIL_LINES);
  }, [editorData]);

  const onMount = React.useCallback<UseCodeEditorAsLogs['onMount']>((editor, monaco) => {
    setEditorData({ editor, monaco });
  }, []);

  return {
    editorOptions: {
      // Always wrap
      wordWrap: 'on',
      // Cursor on item highlights repeats -- not needed
      occurrencesHighlight: false,
      // Disable the selection highlight
      selectionHighlight: true,
      // Stop it at the last line; logs editors don't usually go past that
      scrollBeyondLastLine: false,
    },
    scrollToBottom,
    onMount,
  };
};

export default useCodeEditorAsLogs;
