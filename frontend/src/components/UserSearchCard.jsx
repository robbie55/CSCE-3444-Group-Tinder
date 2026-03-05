import PropTypes from 'prop-types';
import './UserSearchCard.css';

// basic card template
// has student name and email
export default function UserSearchCard({ user }) {
    return (
        <div className='profile-card'>
            <div className='profile-card-content'>
                <div className='profile-card-avatar'>
                    <img
                        src='user.avatar_url'
                        alt='The avatar image'
                        className='profile-avatar-image'
                    ></img>
                </div>
            </div>
            <div className='profile-card-info'>
                <div className='profile-info-header'>
                    <div className='profile-info-name'>
                        <h3>{user.full_name}</h3>
                        <p className='profile-info-meta'></p>
                    </div>
                </div>
                <p className='profile-bio'>{user.bio}</p>
                <div className='profile-details'>
                    <div className='detail-row'>
                        {/*Will need to expand user.skills*/}
                        <div className='detail-skills'>{user.skills}</div>
                    </div>
                </div>
                <div className='detail-row'>
                    <p className='profile-email'>{user.email}</p>
                    <a href='str(user.external_links.github)' className='profile-github'></a>
                    <a href='str(user.external_links.linkedin)' className='profile-linkedin'></a>
                </div>
            </div>
        </div>
    );
}

// verification to ensure these variables exist
UserSearchCard.propTypes = {
    user: PropTypes.shape({
        full_name: PropTypes.string.isRequired,
        email: PropTypes.string.isRequired,
        bio: PropTypes.arrayOf(PropTypes.string),
        skills: PropTypes.arrayOf(PropTypes.string).isRequired,
        external_links: PropTypes.shape({
            key: PropTypes.string.isRequired,
            link: PropTypes.string.isRequired,
        }),
    }).isRequired,
};
