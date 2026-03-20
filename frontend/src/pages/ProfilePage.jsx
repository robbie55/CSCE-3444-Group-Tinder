import Sidebar from '../components/Sidebar.jsx';
import './UserSearchPage.css';

export default function ProfilePage() {
    return (
        <div className='page'>
            <div className='page-sidebar'>
                <Sidebar />
            </div>
            <div className='page-content'>
                <h1>Profile</h1>
            </div>
        </div>
    );
}
