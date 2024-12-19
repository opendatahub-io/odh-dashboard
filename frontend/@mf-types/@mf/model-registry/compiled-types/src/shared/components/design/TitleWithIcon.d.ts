import * as React from 'react';
import { ProjectObjectType } from '~/shared/components/design/utils';
interface TitleWithIconProps {
    title: React.ReactNode;
    objectType: ProjectObjectType;
    iconSize?: number;
    padding?: number;
}
declare const TitleWithIcon: React.FC<TitleWithIconProps>;
export default TitleWithIcon;
