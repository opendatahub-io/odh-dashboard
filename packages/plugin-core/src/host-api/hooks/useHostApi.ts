import * as React from 'react';
import { HostApiContext } from '../HostApiContext';
import type { HostApiServices } from '../types';

export const useHostApi = (): HostApiServices => React.useContext(HostApiContext);
