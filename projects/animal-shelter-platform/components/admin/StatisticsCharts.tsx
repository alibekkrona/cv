"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  CityMetric,
  DateMetric,
  SpeciesCityMetric
} from "@/lib/repositories/statistics.repository";

type StatisticsChartsProps = {
  approvedByCity: CityMetric[];
  speciesByCity: SpeciesCityMetric[];
  trendByDate: DateMetric[];
};

export function StatisticsCharts({
  approvedByCity,
  speciesByCity,
  trendByDate
}: StatisticsChartsProps) {
  const topApprovedCities = approvedByCity.slice(0, 12);
  const topSpeciesCities = speciesByCity.slice(0, 12);
  const [visibleTrendLines, setVisibleTrendLines] = useState<Record<TrendLineKey, boolean>>({
    approved: true,
    rejected: true,
    total: true
  });

  function toggleTrendLine(key: TrendLineKey) {
    setVisibleTrendLines((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  return (
    <div className="grid gap-5">
      <ChartCard
        description="Показывает, как менялось количество заявок и одобрений внутри выбранного периода."
        title="Динамика заявок"
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trendByDate} margin={{ bottom: 8, left: 0, right: 16, top: 12 }}>
            <CartesianGrid stroke="rgb(var(--shelter-border) / 0.12)" vertical={false} />
            <XAxis
              dataKey="date"
              interval="preserveStartEnd"
              minTickGap={36}
              stroke="rgb(var(--shelter-ink) / 0.45)"
              tick={{ fontSize: 12 }}
              tickFormatter={formatChartDate}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              stroke="rgb(var(--shelter-ink) / 0.45)"
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9cdbf" }} />
            <Line
              activeDot={{ r: 5 }}
              dataKey="total"
              dot={false}
              hide={!visibleTrendLines.total}
              name="Поступило заявок"
              stroke="#38a7f3"
              strokeWidth={2.5}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="approved"
              dot={false}
              hide={!visibleTrendLines.approved}
              name="Одобрено"
              stroke="#2f855a"
              strokeWidth={2.5}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="rejected"
              dot={false}
              hide={!visibleTrendLines.rejected}
              name="Отклонено"
              stroke="#dc2626"
              strokeWidth={2.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {trendLineOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={visibleTrendLines[option.key]}
              onClick={() => toggleTrendLine(option.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:border-shelter-moss ${
                visibleTrendLines[option.key]
                  ? "border-shelter-ink/15 bg-shelter-cream text-shelter-ink"
                  : "border-shelter-ink/10 bg-transparent text-shelter-ink/45"
              }`}
            >
              <span
                className={`relative h-4 w-7 rounded-full transition ${
                  visibleTrendLines[option.key] ? "opacity-100" : "bg-shelter-ink/10 opacity-70"
                }`}
                style={visibleTrendLines[option.key] ? { backgroundColor: option.color } : undefined}
              >
                <span
                  className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-sm transition ${
                    visibleTrendLines[option.key] ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </ChartCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          description="Города, откуда больше всего заявок дошло до одобрения."
          title="Одобренные заявки по городам"
        >
          {topApprovedCities.length ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={topApprovedCities} layout="vertical" margin={{ bottom: 8, left: 12, right: 16, top: 8 }}>
                <CartesianGrid stroke="#e8dfd4" strokeDasharray="4 4" />
                <XAxis allowDecimals={false} stroke="#786f66" tick={{ fontSize: 12 }} type="number" />
                <YAxis dataKey="city" stroke="#786f66" tick={{ fontSize: 12 }} type="category" width={104} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9cdbf" }} />
                <Bar dataKey="approved" fill="#2f855a" name="Одобрено" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartText>За выбранный период одобренных заявок нет.</EmptyChartText>
          )}
        </ChartCard>

        <ChartCard
          description="Помогает понять, каких животных чаще забирают в разных городах."
          title="Собаки и кошки по городам"
        >
          {topSpeciesCities.length ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={topSpeciesCities} margin={{ left: 0, right: 16, top: 12 }}>
                <CartesianGrid stroke="#e8dfd4" strokeDasharray="4 4" />
                <XAxis dataKey="city" minTickGap={16} stroke="#786f66" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#786f66" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9cdbf" }} />
                <Legend />
                <Bar dataKey="dogs" fill="#38a7f3" name="Собаки" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cats" fill="#f59e0b" name="Кошки" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartText>За выбранный период заявок с животными нет.</EmptyChartText>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

type TrendLineKey = "approved" | "rejected" | "total";

const trendLineOptions = [
  { color: "#38a7f3", key: "total", label: "Поступило заявок" },
  { color: "#2f855a", key: "approved", label: "Одобрено" },
  { color: "#dc2626", key: "rejected", label: "Отклонено" }
] satisfies Array<{ color: string; key: TrendLineKey; label: string }>;

function ChartCard({
  children,
  description,
  title
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded border border-shelter-ink/10 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-shelter-ink/60">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChartText({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[320px] place-items-center rounded bg-shelter-cream text-sm text-shelter-ink/60">
      {children}
    </div>
  );
}

function formatChartDate(value: string) {
  const [, month, day] = value.split("-");

  return `${day}.${month}`;
}
