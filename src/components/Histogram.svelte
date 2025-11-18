<script>
    import { Chart } from "svelte-echarts";
    import { init, use } from "echarts/core";
    import { BarChart } from "echarts/charts";
    import {
        GridComponent,
        TitleComponent,
        TooltipComponent,
        ToolboxComponent,
    } from "echarts/components";
    import { CanvasRenderer } from "echarts/renderers";
    import {
        range,
        min as lodashMin,
        max as lodashMax,
        countBy,
        floor,
    } from "lodash";
    import {
        trimText,
        getBaseChartConfig,
        getTitleConfig,
        getBarTooltipConfig,
        getBarSeriesConfig,
    } from "../lib/chartUtils";

    let { data, metadata, title } = $props();

    // Register ECharts components
    use([
        BarChart,
        GridComponent,
        CanvasRenderer,
        TitleComponent,
        TooltipComponent,
        ToolboxComponent,
    ]);

    let options = $state({});

    // Create histogram bins from distribution values using lodash
    $effect(() => {
        if (data?.values && data.values.length > 0) {
            let bins;

            const MAX_BINS = 20;

            if (metadata.schema_variable_type === "Int64") {
                // For integers, create one bin per unique integer value
                const minVal =
                    metadata.range_min ?? data.min ?? lodashMin(data.values);
                const maxVal =
                    metadata.range_max ?? data.max ?? lodashMax(data.values);
                const numUniqueValues = maxVal - minVal + 1;

                // If there are too many unique values, treat as continuous
                if (numUniqueValues > MAX_BINS) {
                    const n = data.values.length;
                    const numBins = Math.min(
                        MAX_BINS,
                        Math.ceil(Math.log2(n) + 1),
                    );
                    const binWidth = (maxVal - minVal) / numBins;

                    const binEdges = range(0, numBins + 1).map(
                        (i) => minVal + i * binWidth,
                    );
                    const binIndices = data.values.map((value) => {
                        const index = floor((value - minVal) / binWidth);
                        return Math.min(index, numBins - 1);
                    });

                    const binCounts = countBy(binIndices);
                    bins = range(0, numBins).map((i) => ({
                        start: binEdges[i],
                        end: binEdges[i + 1],
                        count: binCounts[i] || 0,
                    }));
                } else {
                    // Count occurrences of each value in the data
                    const valueCounts = countBy(data.values);

                    // Create bins for all integers between min and max
                    bins = range(minVal, maxVal + 1).map((value) => ({
                        start: value,
                        end: value,
                        count: valueCounts[value] || 0,
                    }));
                }
            } else {
                // For continuous variables, use Sturges' formula
                const n = data.values.length;
                const numBins = Math.ceil(Math.log2(n) + 1);
                const minVal =
                    metadata.range_min ?? data.min ?? lodashMin(data.values);
                const maxVal =
                    metadata.range_max ?? data.max ?? lodashMax(data.values);
                const binWidth = (maxVal - minVal) / numBins;

                // Create bin edges using lodash range
                const binEdges = range(0, numBins + 1).map(
                    (i) => minVal + i * binWidth,
                );

                // Assign each value to a bin and count using lodash
                const binIndices = data.values.map((value) => {
                    const index = floor((value - minVal) / binWidth);
                    return Math.min(index, numBins - 1);
                });

                const binCounts = countBy(binIndices);

                // Create bins array with counts
                bins = range(0, numBins).map((i) => ({
                    start: binEdges[i],
                    end: binEdges[i + 1],
                    count: binCounts[i] || 0,
                }));
            }

            // Helper function to trim text at word boundary
            const trimText = (text, maxLength) => {
                if (!text || text.length <= maxLength) return text;
                const trimmed = text.slice(0, maxLength);
                const lastSpace = trimmed.lastIndexOf(' ');
                return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + '...';
            };

            // Build statistics text
            const statsText = [
                `n=${data.n}`,
                data.mean !== null ? `mean=${data.mean.toFixed(0)}` : null,
                data.median !== null
                    ? `median=${data.median.toFixed(0)}`
                    : null,
                data.std_dev !== null ? `sd=${data.std_dev.toFixed(0)}` : null,
                data.min !== null ? `min=${data.min.toFixed(0)}` : null,
                data.max !== null ? `max=${data.max.toFixed(0)}` : null,
            ]
                .filter(Boolean)
                .join(" | ");

            // Build subtitle with question text and stats
            const subtitleParts = [];
            if (metadata.question_text) {
                subtitleParts.push(`Question: "${metadata.question_text}"\n`);
            }
            subtitleParts.push(statsText);

            const subtitle = subtitleParts.join('\n');

            options = {
                title: {
                    text: metadata.label || title,
                    subtext: subtitle,
                    left: "center",
                    textStyle: {
                        fontSize: 14,
                        fontWeight: 'bold'
                    },
                    subtextStyle: {
                        fontSize: 11
                    }
                },
                toolbox: {
                    feature: {
                        saveAsImage: {
                            title: "Save as Image",
                            pixelRatio: 2,
                        },
                    },
                },
                tooltip: {
                    trigger: "axis",
                    axisPointer: {
                        type: "shadow",
                    },
                    formatter: (params) => {
                        const bin = bins[params[0].dataIndex];
                        if (bin.start === bin.end) {
                            return `Value: ${bin.start}<br/>Count: ${bin.count}`;
                        } else {
                            return `Range: ${bin.start.toFixed(2)} - ${bin.end.toFixed(2)}<br/>Count: ${bin.count}`;
                        }
                    },
                },
                grid: {
                    left: "8%",
                    right: "4%",
                    bottom: "8%",
                    top: "25%",
                    containLabel: true,
                },
                xAxis: {
                    type: "category",
                    data:
                        metadata.schema_variable_type === "Int64"
                            ? bins.map((b) => b.start.toString())
                            : bins.map((b) => b.start.toFixed(1)),
                    name: "Value",
                    nameLocation: "middle",
                    nameGap: 30,
                },
                yAxis: {
                    type: "value",
                    name: "Frequency",
                    nameLocation: "middle",
                    nameGap: 40,
                },
                series: [
                    {
                        type: "bar",
                        data: bins.map((b) => b.count),
                        barWidth: "95%",
                        itemStyle: {
                            color: "#5470c6",
                        },
                        label: {
                            show: true,
                            position: "top",
                            formatter: "{c}",
                        },
                    },
                ],
            };
        }
    });
</script>

<div class="app">
    <Chart {init} {options} />
</div>

<style>
    .app {
        width: 40vw;
        height: 40vh;
    }
</style>
