"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

type Props = {
  data: { categoryName: string; total: number }[];
};

export function PieChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.categoryName),
    datasets: [
      {
        data: data.map((d) => Math.abs(d.total)),
        backgroundColor: CHART_COLORS.slice(0, data.length),
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm">
        <Pie
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  padding: 16,
                  font: { size: 12 },
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const value = ctx.parsed as number;
                    const total = (ctx.dataset.data as number[]).reduce(
                      (s, v) => s + v,
                      0,
                    );
                    const pct =
                      total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                    return ` $${value.toFixed(2)} (${pct}%)`;
                  },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
