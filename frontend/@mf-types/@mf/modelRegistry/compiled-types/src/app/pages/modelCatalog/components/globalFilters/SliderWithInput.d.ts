import * as React from 'react';
type SliderWithInputProps = {
    value: number;
    min: number;
    max: number;
    isDisabled: boolean;
    onChange: (value: number) => void;
    suffix?: string;
    ariaLabel: string;
    shouldRound?: boolean;
    showBoundaries?: boolean;
    hasTooltipOverThumb?: boolean;
};
declare const SliderWithInput: React.FC<SliderWithInputProps>;
export default SliderWithInput;
