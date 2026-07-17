import * as React from 'react';
import { ModelCatalogNumberFilterKey } from '~/concepts/modelCatalog/const';
type SidebarSliderFilterProps = {
    filterKey: ModelCatalogNumberFilterKey;
    label: string;
    suffix?: string;
    fallbackMin: number;
    fallbackMax: number;
};
declare const SidebarSliderFilter: React.FC<SidebarSliderFilterProps>;
export default SidebarSliderFilter;
