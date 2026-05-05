import * as React from 'react';
export declare enum McpCardIconType {
    VERIFIED_SOURCE = "Verified source",
    SECURE_ENDPOINT = "Secure endpoint",
    SAST = "SAST",
    LOCAL_TO_CLUSTER = "Local to cluster",
    READ_ONLY_TOOLS = "Read only tools",
    RED_HAT_PARTNER = "Red Hat partner",
    REMOTE = "Remote"
}
type IconConfig = {
    Icon: React.ComponentType<{
        className?: string;
        style?: React.CSSProperties;
    }>;
    label: string;
    green?: boolean;
};
declare const iconMap: Record<McpCardIconType, IconConfig>;
export declare const getMcpCardIconConfig: (type: McpCardIconType) => (typeof iconMap)[McpCardIconType];
export declare const getMcpCardIconConfigByLabel: (label: string) => IconConfig | null;
export declare const McpCardIcon: React.FC<{
    type: McpCardIconType;
    className?: string;
}>;
export declare const McpCardIconByLabel: React.FC<{
    label: string;
    className?: string;
}>;
export {};
