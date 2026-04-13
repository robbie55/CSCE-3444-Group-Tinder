import PropTypes from 'prop-types';
import UserSearchCard from './UserSearchCard';
import './RequestCard.css';

export default function RequestCard({ request, onAccept, onReject }) {
    const user = request.sender;

    if (!user) {
        return null;
    }

    const cardUser = {
        ...user,
        full_name: user.full_name || 'Unknown User',
        username: user.username || 'unknown',
        bio: user.bio || '',
        skills: Array.isArray(user.skills) ? user.skills : [],
        external_links: {
            github: user.external_links?.github || '',
            linkedin: user.external_links?.linkedin || '',
        },
    };

    return (
        <div className='request-card'>
            <UserSearchCard user={cardUser} />
            <div className='request-card-actions'>
                <button className='request-card-reject' onClick={() => onReject(request.id)}>
                    Reject
                </button>
                <button className='request-card-accept' onClick={() => onAccept(request.id)}>
                    Accept
                </button>
            </div>
        </div>
    );
}

RequestCard.propTypes = {
    request: PropTypes.shape({
        id: PropTypes.string,
        sender: PropTypes.shape({
            avatar_url: PropTypes.string,
            full_name: PropTypes.string,
            username: PropTypes.string,
            major: PropTypes.string,
            skills: PropTypes.arrayOf(PropTypes.string),
            bio: PropTypes.string,
            external_links: PropTypes.shape({
                github: PropTypes.string,
                linkedin: PropTypes.string,
            }),
        }),
    }),
    onAccept: PropTypes.func,
    onReject: PropTypes.func,
};
