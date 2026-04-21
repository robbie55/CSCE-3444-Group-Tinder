import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import Requests from './pages/Requests';
import SignupPage from './pages/SignupPage';
import UserProfilePage from './pages/UserProfilePage';
import UserSearchPage from './pages/UserSearchPage';

export default function App() {
    return (
        <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/signup' element={<SignupPage />} />
            <Route
                path='/dashboard'
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path='/search'
                element={
                    <ProtectedRoute>
                        <UserSearchPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path='/profile'
                element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                }
            />
            <Route
                path='/requests'
                element={
                    <ProtectedRoute>
                        <Requests />
                    </ProtectedRoute>
                }
            />
            <Route path='/users/:userId' element={<UserProfilePage />} />
            <Route path='*' element={<Navigate to='/login' replace />} />
        </Routes>
    );
}
