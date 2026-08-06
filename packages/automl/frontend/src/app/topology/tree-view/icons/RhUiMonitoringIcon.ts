import { createIcon } from '@patternfly/react-icons/dist/esm/createIcon';

/**
 * Red Hat UI "monitoring" icon (rh-ui-icon-monitoring) from @rhds/icons.
 * Monitor with chart — Refit and evaluate.
 */
const RhUiMonitoringIcon = createIcon({
  name: 'RhUiMonitoringIcon',
  width: 32,
  height: 32,
  svgPath:
    'M29.5 3h-27C1.673 3 1 3.673 1 4.5v17c0 .827.673 1.5 1.5 1.5H12v4H8a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2h-4v-4h9.5c.827 0 1.5-.673 1.5-1.5v-17c0-.827-.673-1.5-1.5-1.5ZM18 27h-4v-4h4v4Zm11-6H3V5h26v16ZM6.293 17.707a.999.999 0 0 1 0-1.414l5.646-5.646a1.5 1.5 0 0 1 2.121 0l3.939 3.939 6.293-6.293a.999.999 0 1 1 1.414 1.414l-6.646 6.646a1.5 1.5 0 0 1-2.121 0L13 12.414l-5.293 5.293a.997.997 0 0 1-1.414 0Z',
  xOffset: 0,
  yOffset: 0,
});

export default RhUiMonitoringIcon;
