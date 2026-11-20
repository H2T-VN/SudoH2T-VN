import type { ReactNode } from "react";
import { Card } from "../Card/Card";
import styles from "./charts.module.css";

export function Sparkline({ values, color = "var(--color-accent)", height = 160 }: { values: number[]; color?: string; height?: number }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = max === min ? 50 : 88 - ((value - min) / (max - min)) * 70;
    return `${x},${y}`;
  }).join(" ");
  return <svg className={styles.sparkline} style={{ height }} viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Biểu đồ xu hướng" role="img"><polyline points={points} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>;
}

export function MiniBarChart({ values, labels, color = "var(--color-pink)" }: { values: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...values);
  return <div className={styles.bars} role="img" aria-label="Biểu đồ cột dữ liệu demo">{values.map((value, index) => <div className={styles.barItem} key={`${labels[index]}-${index}`}><strong>{value}</strong><div className={styles.barTrack}><span style={{ height: `${Math.max((value / max) * 100, 5)}%`, background: color }} /></div><small>{labels[index]}</small></div>)}</div>;
}

export function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return <Card><div className={styles.cardHeader}><div><h2 className={styles.chartTitle}>{title}</h2>{subtitle ? <p className={styles.chartSubtitle}>{subtitle}</p> : null}</div>{action}</div>{children}</Card>;
}
