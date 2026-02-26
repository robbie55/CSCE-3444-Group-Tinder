import PropTypes from 'prop-types';
import './UserSearchCard.css';

// basic card template
// has student name and email
export function UserSearchCard({ user }) {
    return (
        <div className='profile-card'>
            <div className='profile-card-content'>
                <div className='profile-card-avatar'>
                    <img className='profile-avatar-image'></img>
                </div>
            </div>
            <div className='profile-card-info'>
                <div className='profile-info-header'>
                    <div className='profile-info-name'>
                        <h3>{user.name}</h3>
                        <p className='profile-info-meta'></p>
                    </div>
                    <span className='profile-availability'></span>
                </div>
                <p className='profile-bio'></p>
                <div className='profile-details'>
                    <div className='detail-row'>
                        <div className='detail-skills'></div>
                    </div>
                    <div className='detail-row'>
                        <div className='detail-courses'></div>
                    </div>
                </div>
                <div className='detail-row'>
                    <p className='profile-email'>{user.email}</p>
                    <a href='' className='profile-github'></a>
                    <a href='' className='profile-linkedin'></a>
                </div>
            </div>
        </div>
    );
}

// verification to ensure these variables exist
UserSearchCard.propTypes = {
    user: PropTypes.shape({
        name: PropTypes.string.isRequired,
        email: PropTypes.string.isRequired,
    }).isRequired,
};
