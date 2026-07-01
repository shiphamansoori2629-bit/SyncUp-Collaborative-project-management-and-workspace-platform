import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthTokenSetup } from '@/components/AuthTokenSetup'
import { AppLayout } from '@/components/layout/AppLayout'
import { DataRefreshProvider } from '@/context/DataRefreshContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { Dashboard } from '@/pages/Dashboard'
import { ProjectDetails } from '@/pages/ProjectDetails'
import { Projects } from '@/pages/Projects'
import { Settings } from '@/pages/Settings'
import { SignInPage } from '@/pages/SignIn'
import { SignUpPage } from '@/pages/SignUp'
import { Team } from '@/pages/Team'

function ProtectedApp() {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <DataRefreshProvider>
          <AuthTokenSetup />
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetails />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DataRefreshProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/sign-in/*"
          element={
            <>
              <SignedIn>
                <Navigate to="/" replace />
              </SignedIn>
              <SignedOut>
                <SignInPage />
              </SignedOut>
            </>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <>
              <SignedIn>
                <Navigate to="/" replace />
              </SignedIn>
              <SignedOut>
                <SignUpPage />
              </SignedOut>
            </>
          }
        />
        <Route
          path="/*"
          element={
            <>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
              <SignedIn>
                <ProtectedApp />
              </SignedIn>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
