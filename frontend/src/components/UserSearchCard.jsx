import { PropTypes } from 'prop-types';
import './UserSearchCard.css';

export default function UserSearchCard({ user }) {
    const initials =
        (user?.full_name ?? '')
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .join('')
            .toUpperCase() || 'U';

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
                                e.currentTarget.parentElement.innerHTML = `<div>${initials}</div>`;
                            }}
                        ></img>
                    ) : (
                        <div>{initials}</div>
                    )}
                </div>
            </div>
            <div className='card-info'>
                <div className='info-header'>
                    <div className='info-names'>
                        <h3>{user.full_name}</h3>
                        <h6>{user.username}</h6>
                    </div>
                </div>
                {user.bio ? (
                    <p className='card-bio'>{user.bio}</p>
                ) : (
                    <p className='card-bio'>No user bio provided.</p>
                )}
                <div className='card-details'>
                    <div className='skill-row'>
                        {(user.skills ?? []).length > 0 ? (
                            user.skills.map((skill) => (
                                <span key={skill} className='skill-badge'>
                                    {skill}
                                </span>
                            ))
                        ) : (
                            <span className='no-skills'>No skills listed</span>
                        )}
                    </div>
                    {user.external_links?.github || user.external_links?.linkedin ? (
                        <div className='links-row'>
                            {user.external_links?.github && (
                                <a
                                    href={user.external_links.github}
                                    className='card-link'
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    GitHub
                                </a>
                            )}
                            {user.external_links?.linkedin && (
                                <a
                                    href={user.external_links.linkedin}
                                    className='card-link'
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    LinkedIn
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className='detail-row'>
                            <span className='no-card-link'>No external links</span>
                        </div>
                    )}
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
        bio: PropTypes.string,
        skills: PropTypes.arrayOf(PropTypes.string).isRequired,
        external_links: PropTypes.shape({
            github: PropTypes.string,
            linkedin: PropTypes.string,
        }).isRequired,
        avatar_url: PropTypes.string,
    }).isRequired,
};
