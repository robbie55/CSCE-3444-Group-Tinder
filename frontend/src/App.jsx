import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UserSearchPage from './pages/UserSearchPage';

export default function App() {
    return (
        <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/signup' element={<SignupPage />} />
            <Route path='*' element={<Navigate to='/login' replace />} />
            <Route path='/search' element={<UserSearchPage />} />
        </Routes>
    );
}
