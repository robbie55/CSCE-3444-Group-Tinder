import PropTypes from 'prop-types';
import './ConversationListItem.css';

function formatTimestamp(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
}

export default function ConversationListItem({ conversation, otherUser, isActive, onSelect }) {
    const conversationId = conversation.id ?? conversation._id;
    const displayName = otherUser?.full_name || otherUser?.username || 'Unknown User';
    const username = otherUser?.username ? `@${otherUser.username}` : '';
    const preview = conversation.last_message_preview || 'No messages yet';
    const updatedAt = formatTimestamp(conversation.last_message_at ?? conversation.created_at);

    return (
        <button
            type='button'
            className={`conversation-list-item${isActive ? ' conversation-list-item--active' : ''}`}
            onClick={() => onSelect(conversationId)}
        >
            <div className='conversation-list-item-top'>
                <h3>{displayName}</h3>
                {updatedAt && <span>{updatedAt}</span>}
            </div>
            <p className='conversation-list-item-username'>{username}</p>
            <p className='conversation-list-item-preview'>{preview}</p>
        </button>
    );
}

ConversationListItem.propTypes = {
    conversation: PropTypes.shape({
        id: PropTypes.string,
        _id: PropTypes.string,
        created_at: PropTypes.string,
        last_message_at: PropTypes.string,
        last_message_preview: PropTypes.string,
    }).isRequired,
    otherUser: PropTypes.shape({
        id: PropTypes.string,
        _id: PropTypes.string,
        full_name: PropTypes.string,
        username: PropTypes.string,
    }),
    isActive: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
};

ConversationListItem.defaultProps = {
    otherUser: null,
    isActive: false,
};
