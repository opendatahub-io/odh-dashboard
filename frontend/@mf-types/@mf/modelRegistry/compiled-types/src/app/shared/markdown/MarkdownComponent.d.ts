import './MarkdownComponent.scss';
type MarkdownComponentProps = {
    data: string;
    dataTestId?: string;
    maxHeading?: number;
};
declare const MarkdownComponent: ({ data, dataTestId, maxHeading, }: MarkdownComponentProps) => JSX.Element;
export default MarkdownComponent;
