import PropTypes from 'prop-types';
import './MessageBubble.css';

function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function MessageBubble({ message, isMine }) {
    const timestamp = formatTime(message.created_at);

    return (
        <div className={`message-bubble-row${isMine ? ' message-bubble-row--mine' : ''}`}>
            <div className={`message-bubble${isMine ? ' message-bubble--mine' : ''}`}>
                <p>{message.content}</p>
                {timestamp && <span>{timestamp}</span>}
            </div>
        </div>
    );
}

MessageBubble.propTypes = {
    message: PropTypes.shape({
        id: PropTypes.string,
        _id: PropTypes.string,
        content: PropTypes.string,
        created_at: PropTypes.string,
    }).isRequired,
    isMine: PropTypes.bool,
};

MessageBubble.defaultProps = {
    isMine: false,
};
