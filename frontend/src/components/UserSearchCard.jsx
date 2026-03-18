import { PropTypes } from 'prop-types';
import './UserSearchCard.css';

// basic card template
// has student name and email
export default function UserSearchCard({ user }) {
    const initials = user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    return (
        <div className='profile-card'>
            <div className='card-header'>
                <div className='card-avatar'>
                    {user.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt='The avatar image'
                            className='avatar-image'
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        ></img>
                    ) : (
                        <div>{initials}</div>
                    )}
                </div>
            </div>
            <div className='card-info'>
                <div className='info-header'>
                    <div className='info-name'>
                        <h3>{user.full_name}</h3>
                    </div>
                </div>
                <p className='bio'>{user.bio}</p>
                <div className='details'>
                    <div className='skill-row'>
                        {user.skills.map((skill, idx) => (
                            <span key={idx} className='skill-badge'>
                                {skill}
                            </span>
                        ))}
                    </div>
                    <div className='detail-row'>
                        <a
                            href={user.external_links.github}
                            className='external_link'
                            target='_blank'
                            rel='noreferrer'
                        >
                            GitHub
                        </a>
                        <a
                            href={user.external_links.linkedin}
                            className='external_link'
                            target='_blank'
                            rel='noreferrer'
                        >
                            LinkedIn
                        </a>
                    </div>
                    <div className='detail-row'>
                        <a href={`mailto: ${user.username}`} className='profile-email'>
                            {user.username}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// verification to ensure these variables exist
UserSearchCard.propTypes = {
    user: PropTypes.shape({
        full_name: PropTypes.string.isRequired,
        username: PropTypes.string.isRequired,
        bio: PropTypes.arrayOf(PropTypes.string),
        skills: PropTypes.arrayOf(PropTypes.string).isRequired,
        external_links: PropTypes.shape({
            github: PropTypes.string.isRequired,
            linkedin: PropTypes.string.isRequired,
        }).isRequired,
        avatar_url: PropTypes.string,
    }).isRequired,
};
