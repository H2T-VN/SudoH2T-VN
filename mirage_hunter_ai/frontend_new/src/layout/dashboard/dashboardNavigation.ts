import type { IconType } from "react-icons";
import {
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloudDownloadOutline,
  IoCubeOutline,
  IoLayersOutline,
  IoLocateOutline,
  IoRefreshOutline,
  IoScaleOutline,
  IoSparklesOutline,
  IoStatsChartOutline,
  IoTimeOutline,
} from "react-icons/io5";

export type DashboardPageId =
  | "overview"
  | "models"
  | "datasets"
  | "baseline"
  | "hunt"
  | "monitor"
  | "failures"
  | "reports"
  | "history"
  | "ablation"
  | "regression"
  | "status"
  | "experiments";

export interface DashboardMenuItem {
  id: DashboardPageId;
  label: string;
  icon: IconType;
  live?: boolean;
}

export interface DashboardMenuGroup {
  label?: string;
  items: DashboardMenuItem[];
}

export const dashboardMenuGroups: DashboardMenuGroup[] = [
  {
    items: [{ id: "overview", label: "Tổng quan", icon: IoStatsChartOutline }],
  },
  {
    label: "Chuẩn bị kiểm thử",
    items: [
      { id: "models", label: "Mô hình", icon: IoCubeOutline },
      { id: "datasets", label: "Dữ liệu kiểm thử", icon: IoLayersOutline },
      { id: "baseline", label: "Đánh giá gốc", icon: IoStatsChartOutline },
    ],
  },
  {
    label: "Săn lỗi",
    items: [
      { id: "hunt", label: "Cấu hình Hunt", icon: IoLocateOutline },
      { id: "monitor", label: "Theo dõi tiến trình", icon: IoTimeOutline, live: true },
    ],
  },
  {
    label: "Kết quả",
    items: [
      { id: "failures", label: "Failure Explorer", icon: IoAlertCircleOutline },
      { id: "reports", label: "Báo cáo & xuất file", icon: IoCloudDownloadOutline },
      { id: "history", label: "Lịch sử chạy", icon: IoTimeOutline },
      { id: "ablation", label: "So sánh chiến lược", icon: IoScaleOutline },
      { id: "regression", label: "Chạy lại test lỗi", icon: IoRefreshOutline },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { id: "status", label: "Trạng thái hệ thống", icon: IoCheckmarkCircleOutline },
      { id: "experiments", label: "Kết quả thực nghiệm", icon: IoSparklesOutline },
    ],
  },
];

export const dashboardPageTitles: Record<DashboardPageId, string> = Object.fromEntries(
  dashboardMenuGroups.flatMap((group) => group.items.map((item) => [item.id, item.label])),
) as Record<DashboardPageId, string>;

export function isDashboardPageId(value: string | undefined): value is DashboardPageId {
  return Boolean(value && value in dashboardPageTitles);
}

export function getDashboardPath(id: DashboardPageId): string {
  return id === "overview" ? "/dashboard" : `/dashboard/${id}`;
}
