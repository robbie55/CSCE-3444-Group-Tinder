import { PropTypes } from 'prop-types';
import { Navigate } from 'react-router-dom';
import { getToken } from '../api/auth';

export default function ProtectedRoute({ children }) {
    const token = getToken();

    if (!token) {
        return <Navigate to='/login' replace />;
    }

    return children;
}

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};
