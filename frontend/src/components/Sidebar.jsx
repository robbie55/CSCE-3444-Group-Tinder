import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearToken } from '../api/auth';
import './Sidebar.css';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const linkClass = (to) =>
        `sidebar-link${location.pathname === to ? ' sidebar-link--active' : ''}`;

    return (
        <div className='sidebar'>
            <div className='sidebar-header'>
                <span>UNT</span>
            </div>
            <div className='sidebar-options'>
                <Link className={linkClass('/dashboard')} to='/dashboard'>
                    Dashboard
                </Link>
                <Link className={linkClass('/profile')} to='/profile'>
                    Profile
                </Link>
                <Link className={linkClass('/groups')} to='/groups'>
                    Groups
                </Link>
                <Link className={linkClass('/search')} to='/search'>
                    Search
                </Link>
                <Link className={linkClass('/requests')} to='/requests'>
                    Requests
                </Link>
                <Link className={linkClass('/messages')} to='/messages'>
                    Messages
                </Link>
            </div>
            <div className='sidebar-logout'>
                <button
                    className='logout-button'
                    onClick={() => {
                        clearToken();
                        navigate('/login');
                    }}
                >
                    Log out
                </button>
            </div>
        </div>
    );
}
