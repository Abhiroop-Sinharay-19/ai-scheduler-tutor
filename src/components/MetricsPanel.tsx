import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Clock, Cpu, Timer } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { processColor } from "./GanttChart";
import type { ScheduleResult } from "@/lib/scheduling";

const metricIcon = [Clock, Timer, Activity, Cpu];

export function MetricsPanel({ result }: { result: ScheduleResult }) {
  const names = result.perProcess.map((p) => p.name);
  const cards = [
    { label: "Avg Waiting Time", value: result.metrics.avgWaiting, suffix: " ms" },
    { label: "Avg Turnaround Time", value: result.metrics.avgTurnaround, suffix: " ms" },
    { label: "Avg Response Time", value: result.metrics.avgResponse, suffix: " ms" },
    { label: "CPU Utilisation", value: result.metrics.cpuUtilization, suffix: "%" },
  ];

  const charts: { title: string; key: "waiting" | "turnaround" | "response" }[] = [
    { title: "Waiting time per process", key: "waiting" },
    { title: "Turnaround time per process", key: "turnaround" },
    { title: "Response time per process", key: "response" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = metricIcon[i] ?? Clock;
          return (
            <div
              key={c.label}
              className="panel hover-lift p-5"
              style={{ animation: `fade-up 0.5s ${i * 0.07}s both` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </span>
                <Icon className="size-4 text-primary" />
              </div>
              <AnimatedCounter
                value={c.value}
                decimals={c.suffix === "%" ? 0 : 2}
                suffix={c.suffix}
                className="mt-3 block text-2xl font-semibold tracking-tight"
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {charts.map((chart) => (
          <div key={chart.key} className="panel p-5">
            <h4 className="text-sm font-medium text-foreground">{chart.title}</h4>
            <div className="mt-4 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.perProcess} margin={{ left: -18, right: 6, top: 4 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey={chart.key} radius={[6, 6, 0, 0]}>
                    {result.perProcess.map((p) => (
                      <Cell key={p.name} fill={processColor(p.name, names)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="panel overflow-x-auto p-1">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {[
                "Process",
                "Arrival",
                "Burst",
                "Completion",
                "Turnaround",
                "Waiting",
                "Response",
              ].map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {result.perProcess.map((p) => (
              <tr key={p.name} className="border-t border-border/70">
                <td className="px-4 py-2.5 font-sans font-medium">{p.name}</td>
                <td className="px-4 py-2.5">{p.arrival}</td>
                <td className="px-4 py-2.5">{p.burst}</td>
                <td className="px-4 py-2.5">{p.completion}</td>
                <td className="px-4 py-2.5">{p.turnaround}</td>
                <td className="px-4 py-2.5">{p.waiting}</td>
                <td className="px-4 py-2.5">{p.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
