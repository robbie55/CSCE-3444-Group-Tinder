import { Link } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
    return (
        <div className='sidebar'>
            <div className='title'>
                <span>UNT</span>
            </div>
            <div className='options'>
                <Link className='link' to='/dashboard'>
                    Dashboard
                </Link>
                <Link className='link' to='/profile'>
                    Profile
                </Link>
                <Link className='link' to='/groups'>
                    Groups
                </Link>
                <Link className='link' to='/search'>
                    Search
                </Link>
            </div>
            <div className='logout'>
                <Link className='link' to='/login'>
                    Log out
                </Link>
            </div>
        </div>
    );
}
