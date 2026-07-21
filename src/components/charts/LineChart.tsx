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
import dayjs from "dayjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

type DataPoint = {
  date: string;
  balance: number;
};

type Props = {
  data: DataPoint[];
};

export function LineChart({ data }: Props) {
  const todayStr = dayjs().format("YYYY-MM-DD");
  let futureIndex = data.findIndex((p) => p.date == todayStr);
  if (futureIndex < 0) futureIndex = data.length;

  const labels = data.map((d) => dayjs(d.date).format("MMM D"));
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
        segment: {
          borderColor: (ctx: { p1DataIndex: number }) =>
            ctx.p1DataIndex > futureIndex ? "#d1d5db" : "#10b981",
          backgroundColor: (ctx: { p1DataIndex: number }) =>
            ctx.p1DataIndex > futureIndex
              ? "rgba(209, 213, 219, 0.15)"
              : "rgba(16, 185, 129, 0.1)",
          borderDash: (ctx: { p1DataIndex: number }) =>
            ctx.p1DataIndex > futureIndex ? [4, 4] : [],
        },
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
          legend: { display: false },
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
