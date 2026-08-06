"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import { formatCurrency } from "@/lib/currency";

ChartJS.register(ArcElement, Tooltip, Legend);

const GOLDEN_ANGLE = 137.508;

function stringHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function categoryColor(name: string) {
  const hue = (stringHash(name) * GOLDEN_ANGLE) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

type Props = {
  data: { categoryName: string; total: number }[];
};

export function PieChart({ data }: Props) {
  const total = data.reduce((s, d) => s + Math.abs(d.total), 0);

  const chartData = {
    labels: data.map((d) => d.categoryName),
    datasets: [
      {
        data: data.map((d) => Math.abs(d.total)),
        backgroundColor: data.map((d) => categoryColor(d.categoryName)),
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
                    const pct =
                      total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                    return ` ${formatCurrency(value)} (${pct}%)`;
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
