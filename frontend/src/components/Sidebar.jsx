import { Link } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
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
                <Link className='sidebar-link' to='/login'>
                    Log out
                </Link>
            </div>
        </div>
    );
}
