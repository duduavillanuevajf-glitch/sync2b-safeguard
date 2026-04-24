import { createBrowserRouter } from 'react-router-dom'
import { AuthGuard, GuestGuard } from '@/guards/AuthGuard'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Login } from '@/pages/Login'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { Setup2FA } from '@/pages/Setup2FA'
import { Dashboard } from '@/pages/Dashboard'
import { Vault } from '@/pages/Vault'
import { VaultDetail } from '@/pages/VaultDetail'
import { Audit } from '@/pages/Audit'
import { Users } from '@/pages/Users'
import { Permissions } from '@/pages/Permissions'
import { Import } from '@/pages/Import'
import { Alerts } from '@/pages/Alerts'
import { Settings } from '@/pages/Settings'
import { Profile } from '@/pages/Profile'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GuestGuard><AuthLayout /></GuestGuard>,
    children: [
      { index: true, element: <Login /> },
      { path: 'login', element: <Login /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'setup-2fa', element: <Setup2FA /> },
    ],
  },
  {
    path: '/',
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'vault', element: <Vault /> },
      { path: 'vault/:id', element: <VaultDetail /> },
      { path: 'audit', element: <Audit /> },
      { path: 'users', element: <Users /> },
      { path: 'permissions', element: <Permissions /> },
      { path: 'import', element: <Import /> },
      { path: 'alerts', element: <Alerts /> },
      { path: 'settings', element: <Settings /> },
      { path: 'profile', element: <Profile /> },
    ],
  },
])
