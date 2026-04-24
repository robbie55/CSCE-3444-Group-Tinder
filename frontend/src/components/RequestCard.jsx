import PropTypes from 'prop-types';
import './RequestCard.css';
import UserSearchCard from './UserSearchCard';

export default function RequestCard({ request, onAccept, onReject, onMessage }) {
    const requestId = request.id ?? request._id;
    const user = request.sender;
    const userId = user?.id ?? user?._id;

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
                <button className='request-card-reject' onClick={() => onReject(requestId)}>
                    Reject
                </button>
                <button className='request-card-accept' onClick={() => onAccept(requestId)}>
                    Accept
                </button>
                <button className='request-card-message' onClick={() => onMessage?.(userId)}>
                    Message
                </button>
            </div>
        </div>
    );
}

RequestCard.propTypes = {
    request: PropTypes.shape({
        id: PropTypes.string,
        _id: PropTypes.string,
        sender: PropTypes.shape({
            id: PropTypes.string,
            _id: PropTypes.string,
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
    onMessage: PropTypes.func,
};
