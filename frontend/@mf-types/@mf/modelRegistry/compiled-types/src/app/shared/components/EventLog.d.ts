import * as React from 'react';
import { ModelTransferJobEvent } from '~/app/types';
type EventLogProps = {
    events: ModelTransferJobEvent[];
    emptyMessage?: string;
    maxHeight?: string;
    'data-testid'?: string;
};
declare const EventLog: React.FC<EventLogProps>;
export default EventLog;
