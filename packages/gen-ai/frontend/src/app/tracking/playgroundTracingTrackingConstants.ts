export const PLAYGROUND_TRACING_EVENTS = {
  CONFIGURE_TRACING_TOGGLED: 'Playground Configure Tracing Toggled',
  TRACE_VIEW_OPENED: 'Playground Trace View Opened',
  TRACE_VIEW_CLOSED: 'Playground Trace View Closed',
} as const;

export type ConfigureTracingToggledProperties = {
  isEnabled: boolean;
  source: 'configure_playground_modal';
};

export type TraceViewOpenedProperties = {
  source: 'message_button' | 'kebab_menu';
  traceId: string;
  compareMode: boolean;
  configID: string;
};

export type TraceViewClosedProperties = {
  traceId?: string;
  compareMode: boolean;
};
