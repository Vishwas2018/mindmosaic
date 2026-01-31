import { createBrowserRouter } from 'react-router-dom';

import { PublicLayout } from './layouts/PublicLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { ParentLayout } from './layouts/ParentLayout';
import { AdminLayout } from './layouts/AdminLayout';

import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Pricing } from './pages/Pricing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { AuthHome } from './pages/auth/AuthHome';
import { StudentHome } from './pages/student/StudentHome';
import { ParentHome } from './pages/parent/ParentHome';
import { AdminHome } from './pages/admin/AdminHome';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
  {
    path: '/pricing',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Pricing />,
      },
    ],
  },
  {
    path: '/login',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Login />,
      },
    ],
  },
  {
    path: '/signup',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Signup />,
      },
    ],
  },
  {
    path: '/forgot-password',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <ForgotPassword />,
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <AuthHome />,
      },
    ],
  },
  {
    path: '/student',
    element: <StudentLayout />,
    children: [
      {
        index: true,
        element: <StudentHome />,
      },
    ],
  },
  {
    path: '/parent',
    element: <ParentLayout />,
    children: [
      {
        index: true,
        element: <ParentHome />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminHome />,
      },
    ],
  },
  {
    path: '*',
    element: <PublicLayout />,
    children: [
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
