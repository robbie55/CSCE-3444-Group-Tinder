import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SignupPage from './pages/SignupPage';
import UserSearchPage from './pages/UserSearchPage';

export default function App() {
    return (
        <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/signup' element={<SignupPage />} />
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
            <Route path='*' element={<Navigate to='/login' replace />} />
        </Routes>
    );
}
