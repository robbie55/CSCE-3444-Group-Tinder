import { Link } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
    return (
        <div className='sidebar'>
            <div className='header'>
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
        </div>
    );
}
