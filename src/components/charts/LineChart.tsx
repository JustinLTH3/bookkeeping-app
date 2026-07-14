"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

type Props = {
  data: { date: string; balance: number }[];
};

export function LineChart({ data }: Props) {
  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const labels = data.map((d) => formatDate(d.date));
  const values = data.map((d) => d.balance);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  return (
    <Line
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.parsed.y as number;
                return ` $${value.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 8,
              font: { size: 11 },
            },
            grid: { display: false },
          },
          y: {
            ticks: {
              font: { size: 11 },
              callback: (val) => `$${val}`,
            },
            grid: { color: "rgba(0,0,0,0.06)" },
          },
        },
      }}
    />
  );
}
