/**
 * Shared utilities for chart components
 */

// Helper function to trim text at word boundary
export const trimText = (text: string | null | undefined, maxLength: number): string => {
    if (!text || text.length <= maxLength) return text || '';
    const trimmed = text.slice(0, maxLength);
    const lastSpace = trimmed.lastIndexOf(' ');
    return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + '...';
};

// Common chart configuration options
export const getBaseChartConfig = () => ({
    toolbox: {
        feature: {
            saveAsImage: {
                title: "Save as Image",
                pixelRatio: 2,
            },
        },
    },
    grid: {
        left: "8%",
        right: "4%",
        containLabel: true,
    },
});

// Common title configuration
export const getTitleConfig = (
    metadata: any,
    title: string,
    subtitle: string
) => ({
    text: metadata.label || title,
    subtext: subtitle,
    left: "center",
    textStyle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    subtextStyle: {
        fontSize: 11,
    },
});

// Common tooltip configuration for bar/histogram charts
export const getBarTooltipConfig = (customFormatter?: (params: any) => string) => ({
    trigger: "axis" as const,
    axisPointer: {
        type: "shadow" as const,
    },
    ...(customFormatter && { formatter: customFormatter }),
});

// Common bar series configuration
export const getBarSeriesConfig = (data: number[], options?: {
    barWidth?: string;
    color?: string;
    showLabel?: boolean;
}) => ({
    type: "bar" as const,
    data,
    barWidth: options?.barWidth || "60%",
    itemStyle: {
        color: options?.color || "#86185f",
    },
    label: {
        show: options?.showLabel ?? true,
        position: "top" as const,
        formatter: "{c}",
    },
});
