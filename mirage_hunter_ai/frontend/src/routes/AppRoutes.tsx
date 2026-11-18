import { Navigate, Route, Routes } from 'react-router-dom'

import { HomePage } from '../feature/home/pages/HomePage'
import { DashboardPage } from '../feature/dashboard/pages/DashboardPage'
import { NewHuntPage } from '../feature/hunt/pages/NewHuntPage'
import { HuntMonitorPage } from '../feature/hunt/pages/HuntMonitorPage'
import { HuntsPage } from '../feature/hunt/pages/HuntsPage'
import { ModelsPage } from '../feature/model/pages/ModelsPage'
import { DatasetsPage } from '../feature/dataset/pages/DatasetsPage'
import { BaselinePage } from '../feature/baseline/pages/BaselinePage'
import { FailureExplorerPage } from '../feature/failure/pages/FailureExplorerPage'
import { FailureDetailPage } from '../feature/failure/pages/FailureDetailPage'
import { ReportsPage } from '../feature/report/pages/ReportsPage'
import { ModelComparisonPage } from '../feature/comparison/pages/ModelComparisonPage'
import { StrategyComparisonPage } from '../feature/comparison/pages/StrategyComparisonPage'

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/models" element={<ModelsPage />} />
    <Route path="/datasets" element={<DatasetsPage />} />
    <Route path="/baseline" element={<BaselinePage />} />
    <Route path="/hunts" element={<HuntsPage />} />
    <Route path="/hunts/new" element={<NewHuntPage />} />
    <Route path="/hunts/:huntId" element={<HuntMonitorPage />} />
    <Route path="/failures" element={<FailureExplorerPage />} />
    <Route path="/failures/:failureId" element={<FailureDetailPage />} />
    <Route path="/comparisons/models" element={<ModelComparisonPage />} />
    <Route path="/comparisons/strategies" element={<StrategyComparisonPage />} />
    <Route path="/reports" element={<ReportsPage />} />
    <Route path="/experiments/new" element={<Navigate replace to="/hunts/new" />} />
    <Route path="/results" element={<Navigate replace to="/failures" />} />
    <Route path="/minimization" element={<Navigate replace to="/failures/failure-101" />} />
    <Route path="*" element={<Navigate replace to="/" />} />
  </Routes>
}
