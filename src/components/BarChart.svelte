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

    $effect(() => {
        if (data?.categories && data.categories.length > 0) {
            // Build subtitle with question text
            const subtitleParts = [];
            if (metadata.question_text) {
                subtitleParts.push(`Question: "${metadata.question_text}"`);
            }
            subtitleParts.push(`Total responses: ${data.total_count}`);

            const subtitle = subtitleParts.join("\n");

            // Sort categories by count descending
            const sortedCategories = [...data.categories].sort(
                (a, b) => b.count - a.count,
            );

            const baseConfig = getBaseChartConfig();

            options = {
                title: getTitleConfig(metadata, title, subtitle),
                ...baseConfig,
                tooltip: getBarTooltipConfig((params) => {
                    const percentage = (
                        (params[0].value / data.total_count) *
                        100
                    ).toFixed(1);
                    return `${params[0].name}<br/>Count: ${params[0].value} (${percentage}%)`;
                }),
                grid: {
                    ...baseConfig.grid,
                    bottom: "12%",
                    top: "20%",
                },
                xAxis: {
                    type: "category",
                    data: sortedCategories.map((c) => c.value),
                    nameLocation: "middle",
                    nameGap: 30,
                    axisLabel: {
                        rotate: 45,
                        formatter: (value) => trimText(value, 20),
                    },
                },
                yAxis: {
                    type: "value",
                    name: "Count",
                    nameLocation: "middle",
                    nameGap: 40,
                },
                series: [
                    getBarSeriesConfig(sortedCategories.map((c) => c.count)),
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
