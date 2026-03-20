import { Link, useNavigate } from 'react-router-dom';
import { clearToken } from '../api/auth';
import './Sidebar.css';

export default function Sidebar() {
    const navigate = useNavigate();

    return (
        <div className='sidebar'>
            <div className='sidebar-header'>
                <span>UNT</span>
            </div>
            <div className='sidebar-options'>
                <Link className='sidebar-link' to='/dashboard'>
                    Dashboard
                </Link>
                <Link className='sidebar-link' to='/profile'>
                    Profile
                </Link>
                <Link className='sidebar-link' to='/groups'>
                    Groups
                </Link>
                <Link className='sidebar-link' to='/search'>
                    Search
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
