import { Navigate, Route, Routes } from 'react-router-dom'

import { DashboardPage } from '../feature/dashboard/pages/DashboardPage'
import { NewExperimentPage } from '../feature/experiment/pages/NewExperimentPage'
import { MinimizationPage } from '../feature/minimization/pages/MinimizationPage'
import { ModelsPage } from '../feature/model/pages/ModelsPage'
import { ResultsPage } from '../feature/result/pages/ResultsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/experiments/new" element={<NewExperimentPage />} />
      <Route path="/models" element={<ModelsPage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/minimization" element={<MinimizationPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
