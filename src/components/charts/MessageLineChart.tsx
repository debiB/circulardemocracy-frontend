import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useState } from "react";

export interface MessageLineChartData {
	date: string;
	campaigns: {
		[campaignName: string]: number;
	};
}

export interface MessageLineChartProps {
	data: MessageLineChartData[];
	height?: string | number;
	className?: string;
	/** X-axis labels: calendar day vs week range (week start is Monday per Postgres `date_trunc('week', …)`). */
	timeBucket?: "day" | "week";
}

function formatWeekRangeLabel(isoDatePrefix: string): string {
	const start = new Date(`${isoDatePrefix.slice(0, 10)}T12:00:00`);
	const end = new Date(start);
	end.setDate(end.getDate() + 6);
	const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
	return `${fmt(start)}–${fmt(end)}`;
}

export function MessageLineChart({
	data,
	height = 400,
	className = "",
	timeBucket = "day",
}: MessageLineChartProps) {
	const [isDarkMode, setIsDarkMode] = useState(false);

	useEffect(() => {
		const checkDarkMode = () => {
			const isDark = document.documentElement.classList.contains("dark");
			setIsDarkMode(isDark);
		};

		checkDarkMode();

		const observer = new MutationObserver(checkDarkMode);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => observer.disconnect();
	}, []);

	const campaignNames =
		data.length > 0
			? Array.from(new Set(data.flatMap((d) => Object.keys(d.campaigns))))
			: [];

	const dates = data.map((d) => d.date);

	const series = campaignNames.map((campaignName) => ({
		name: campaignName,
		type: "line" as const,
		smooth: true,
		data: data.map((d) => d.campaigns[campaignName] || 0),
		emphasis: {
			focus: "series" as const,
		},
		lineStyle: {
			width: 2,
		},
		showSymbol: true,
		symbolSize: 6,
	}));

	const colors = isDarkMode
		? ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#fb923c"]
		: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316"];

	const option: EChartsOption = {
		color: colors,
		backgroundColor: "transparent",
		tooltip: {
			trigger: "axis",
			axisPointer: {
				type: "cross",
				label: {
					backgroundColor: isDarkMode ? "#374151" : "#6b7280",
				},
			},
			backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
			borderColor: isDarkMode ? "#374151" : "#e5e7eb",
			textStyle: {
				color: isDarkMode ? "#f9fafb" : "#111827",
			},
		},
		legend: {
			data: campaignNames,
			textStyle: {
				color: isDarkMode ? "#f9fafb" : "#111827",
			},
			top: 0,
			left: "center",
		},
		grid: {
			left: "3%",
			right: "4%",
			bottom: timeBucket === "week" ? "14%" : "10%",
			top: "15%",
			containLabel: true,
		},
		xAxis: {
			type: "category",
			boundaryGap: false,
			data: dates,
			axisLine: {
				lineStyle: {
					color: isDarkMode ? "#4b5563" : "#d1d5db",
				},
			},
			axisLabel: {
				color: isDarkMode ? "#9ca3af" : "#6b7280",
				rotate: 0,
				hideOverlap: true,
				formatter: (value: string) => {
					if (timeBucket === "week") {
						return formatWeekRangeLabel(value.slice(0, 10));
					}
					const date = new Date(value);
					return `${date.getMonth() + 1}/${date.getDate()}`;
				},
			},
			splitLine: {
				show: false,
			},
		},
		yAxis: {
			type: "value",
			axisLine: {
				lineStyle: {
					color: isDarkMode ? "#4b5563" : "#d1d5db",
				},
			},
			axisLabel: {
				color: isDarkMode ? "#9ca3af" : "#6b7280",
			},
			splitLine: {
				lineStyle: {
					color: isDarkMode ? "#374151" : "#f3f4f6",
				},
			},
		},
		series,
	};

	return (
		<div className={className}>
			<ReactECharts
				option={option}
				style={{ height, width: "100%" }}
				opts={{ renderer: "canvas" }}
				notMerge={true}
				lazyUpdate={true}
			/>
		</div>
	);
}
