import { Link } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
    return (
        <div className='sidebar'>
            <div className='title'>
                <span>UNT</span>
            </div>
            <div className='options'>
                <Link className='link' to='#'>
                    Dashboard
                </Link>
                <Link className='link' to='#'>
                    Dashboard
                </Link>
                <Link className='link' to='#'>
                    Dashboard
                </Link>
                <Link className='link' to='#'>
                    Dashboard
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
