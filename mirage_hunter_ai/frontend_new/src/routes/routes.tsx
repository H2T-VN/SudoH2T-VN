import { Navigate, Route, Routes } from "react-router-dom";

import { HomePage } from "../features/home/HomePage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ModelsPage } from "../features/models/ModelsPage";
import { DatasetsPage } from "../features/datasets/DatasetsPage";
import { BaselinePage } from "../features/baseline/BaselinePage";
import { HuntsPage } from "../features/hunts/HuntsPage";
import { NewHuntPage } from "../features/hunts/NewHuntPage";
import { HuntDetailPage } from "../features/hunts/HuntDetailPage";
import { HistoryPage } from "../features/history/HistoryPage";
import { FailureDetailPage } from "../features/history/FailureDetailPage";
import { ModelComparisonPage } from "../features/comparison/ModelComparisonPage";
import { StrategyComparisonPage } from "../features/comparison/StrategyComparisonPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { DocsPage } from "../features/docs/DocsPage";
import { SystemStatusPage } from "../features/dashboard/pages/SystemStatusPage";
import { ModelsPage as DashboardModelsPage } from "../features/dashboard/pages/ModelsPage";
import { DatasetsPage as DashboardDatasetsPage } from "../features/dashboard/pages/DatasetsPage";
import { HuntConfigurationPage } from "../features/dashboard/pages/HuntConfigurationPage";
import { MonitorPage } from "../features/dashboard/pages/MonitorPage";
import { DashboardStateProvider } from "../features/dashboard/hooks/DashboardStateProvider";
import DashboardLayout from "../layout/dashboard/DashboardLayout";
import MainLayout from "../layout/mainLayout/mainLayout";

const dashboardPages = {
  overview: <DashboardPage />,
  status: <SystemStatusPage />,
  models: <DashboardModelsPage />,
  datasets: <DashboardDatasetsPage />,
  hunt: <HuntConfigurationPage />,
  monitor: <MonitorPage />,
};

function DashboardRoute() {
  return <DashboardStateProvider><DashboardLayout pages={dashboardPages} /></DashboardStateProvider>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardRoute />} />
      <Route path="/dashboard/:pageId" element={<DashboardRoute />} />
      <Route element={<MainLayout />}>
        <Route path="/mainLayout" element={<HomePage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/baseline" element={<BaselinePage />} />
        <Route path="/hunts" element={<HuntsPage />} />
        <Route path="/hunts/new" element={<NewHuntPage />} />
        <Route path="/hunts/:huntId" element={<HuntDetailPage />} />
        <Route path="/failures" element={<HistoryPage />} />
        <Route path="/failures/:failureId" element={<FailureDetailPage />} />
        <Route path="/comparisons/models" element={<ModelComparisonPage />} />
        <Route path="/comparisons/strategies" element={<StrategyComparisonPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/mainLayout" replace />} />
      <Route path="/experiments/new" element={<Navigate to="/hunts/new" replace />} />
      <Route path="/results" element={<Navigate to="/failures" replace />} />
      <Route path="/minimization" element={<Navigate to="/failures/failure-101" replace />} />
      <Route path="*" element={<Navigate to="/mainLayout" replace />} />
    </Routes>
  );
}
