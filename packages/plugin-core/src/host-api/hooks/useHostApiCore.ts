import * as React from 'react';
import { HostApiCoreContext } from '../HostApiCoreContext';
import type { HostApiCoreServices } from '../types';

export const useHostApiCore = (): HostApiCoreServices => React.useContext(HostApiCoreContext);
