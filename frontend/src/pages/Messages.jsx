import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    createMessagesSocket,
    getConversationMessages,
    listConversations,
    sendConversationMessage,
} from '../api/messages';
import { getCurrentUser } from '../api/users';
import ConversationListItem from '../components/ConversationListItem';
import MessageBubble from '../components/MessageBubble';
import Sidebar from '../components/Sidebar';
import './Messages.css';

const MAX_MESSAGE_LENGTH = 500;
const MESSAGE_WARNING_THRESHOLD = 50;

function getId(value) {
    return value?.id ?? value?._id ?? null;
}

export default function Messages() {
    const [searchParams] = useSearchParams();
    const [currentUser, setCurrentUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [messagesByConversation, setMessagesByConversation] = useState({});
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const requestedConversationId = searchParams.get('conversationId');

    const wsRef = useRef(null);
    const endRef = useRef(null);

    const myUserId = getId(currentUser);

    const selectedConversation = useMemo(
        () => conversations.find((conv) => getId(conv) === selectedConversationId) ?? null,
        [conversations, selectedConversationId]
    );

    const selectedMessages = useMemo(() => {
        if (!selectedConversationId) return [];
        return messagesByConversation[selectedConversationId] ?? [];
    }, [messagesByConversation, selectedConversationId]);
    const charactersRemaining = MAX_MESSAGE_LENGTH - messageInput.length;
    const isNearMessageLimit = charactersRemaining <= MESSAGE_WARNING_THRESHOLD;
    const isAtMessageLimit = charactersRemaining <= 0;

    const getOtherParticipant = (conversation) => {
        const participants = Array.isArray(conversation?.participants) ? conversation.participants : [];
        return participants.find((participant) => getId(participant) !== myUserId) ?? participants[0] ?? null;
    };

    const upsertMessage = (conversationId, incomingMessage) => {
        const incomingMessageId = getId(incomingMessage);

        setMessagesByConversation((prev) => {
            const existing = prev[conversationId] ?? [];
            const alreadyExists = existing.some((msg) => getId(msg) === incomingMessageId);
            if (alreadyExists) {
                return prev;
            }
            return {
                ...prev,
                [conversationId]: [...existing, incomingMessage],
            };
        });
    };

    const fetchMessagesForConversation = async (conversationId) => {
        const rows = await getConversationMessages(conversationId, { limit: 50 });
        setMessagesByConversation((prev) => ({
            ...prev,
            [conversationId]: rows,
        }));
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [me, inbox] = await Promise.all([getCurrentUser(), listConversations()]);

            setCurrentUser(me);
            setConversations(inbox);
            setError(null);

            if (inbox.length > 0) {
                const hasRequestedConversation = inbox.some(
                    (conversation) => getId(conversation) === requestedConversationId
                );
                const initialConversationId = hasRequestedConversation
                    ? requestedConversationId
                    : getId(inbox[0]);

                setSelectedConversationId(initialConversationId);
                await fetchMessagesForConversation(initialConversationId);
            }
        } catch (err) {
            console.error('Error loading messages:', err);
            setError('Failed to load messages. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [requestedConversationId]);

    useEffect(() => {
        if (!selectedConversationId) return;
        if (messagesByConversation[selectedConversationId]) return;

        fetchMessagesForConversation(selectedConversationId).catch((err) => {
            console.error('Error loading conversation messages:', err);
            setError('Failed to load conversation messages.');
        });
    }, [selectedConversationId, messagesByConversation]);

    useEffect(() => {
        const socket = createMessagesSocket();
        if (!socket) return undefined;

        wsRef.current = socket;

        socket.onopen = () => {
            setSocketConnected(true);
        };

        socket.onclose = () => {
            setSocketConnected(false);
        };

        socket.onerror = () => {
            setSocketConnected(false);
        };

        socket.onmessage = (event) => {
            try {
                const envelope = JSON.parse(event.data);
                if (envelope?.type !== 'message_created' || !envelope?.payload) return;

                const incomingMessage = envelope.payload;
                const conversationId = incomingMessage.conversation_id;
                if (!conversationId) return;

                upsertMessage(conversationId, incomingMessage);

                setConversations((prev) =>
                    prev.map((conv) => {
                        if (getId(conv) !== conversationId) return conv;
                        return {
                            ...conv,
                            last_message_at: incomingMessage.created_at,
                            last_message_preview: incomingMessage.content,
                        };
                    })
                );
            } catch (parseError) {
                console.error('Invalid websocket frame:', parseError);
            }
        };

        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        if (!selectedConversationId) return;
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConversationId, selectedMessages]);

    const handleSelectConversation = async (conversationId) => {
        setSelectedConversationId(conversationId);

        if (!messagesByConversation[conversationId]) {
            try {
                await fetchMessagesForConversation(conversationId);
            } catch (err) {
                console.error('Error selecting conversation:', err);
                setError('Failed to load selected conversation.');
            }
        }
    };

    const handleSend = async (event) => {
        event.preventDefault();
        if (!selectedConversationId || sending) return;

        const trimmed = messageInput.trim();
        if (!trimmed) return;

        try {
            setSending(true);
            const created = await sendConversationMessage(selectedConversationId, trimmed);
            upsertMessage(selectedConversationId, created);
            setMessageInput('');

            setConversations((prev) =>
                prev.map((conv) => {
                    if (getId(conv) !== selectedConversationId) return conv;
                    return {
                        ...conv,
                        last_message_at: created.created_at,
                        last_message_preview: created.content,
                    };
                })
            );
        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const handleMessageInputChange = (event) => {
        const nextValue = event.target.value;
        if (nextValue.length > MAX_MESSAGE_LENGTH) {
            return;
        }
        setMessageInput(nextValue);
    };

    if (loading) {
        return (
            <div className='page'>
                <div className='page-sidebar'>
                    <Sidebar />
                </div>
                <div className='page-content'>
                    <div className='page-empty'>
                        <p className='empty-message'>Loading messages...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='page'>
            <div className='page-sidebar'>
                <Sidebar />
            </div>
            <div className='page-content'>
                <div className='messages-header'>
                    <h2>Messages</h2>
                    <span
                        className={`messages-connection-state${socketConnected ? ' messages-connection-state--online' : ''}`}
                    >
                        {socketConnected ? 'Realtime connected' : 'Realtime disconnected'}
                    </span>
                </div>

                {error && (
                    <div className='messages-error-banner'>
                        <p>{error}</p>
                        <button type='button' onClick={fetchInitialData}>
                            Retry
                        </button>
                    </div>
                )}

                {conversations.length === 0 ? (
                    <div className='page-empty'>
                        <p className='empty-message'>No conversations yet.</p>
                    </div>
                ) : (
                    <div className='messages-layout'>
                        <aside className='messages-inbox-panel'>
                            <h3>Inbox</h3>
                            <div className='messages-inbox-list'>
                                {conversations.map((conversation) => (
                                    <ConversationListItem
                                        key={getId(conversation)}
                                        conversation={conversation}
                                        otherUser={getOtherParticipant(conversation)}
                                        isActive={getId(conversation) === selectedConversationId}
                                        onSelect={handleSelectConversation}
                                    />
                                ))}
                            </div>
                        </aside>

                        <section className='messages-chat-panel'>
                            {selectedConversation ? (
                                <>
                                    <div className='messages-chat-header'>
                                        <h3>
                                            {getOtherParticipant(selectedConversation)?.full_name ||
                                                getOtherParticipant(selectedConversation)?.username ||
                                                'Conversation'}
                                        </h3>
                                    </div>

                                    <div className='messages-thread'>
                                        {selectedMessages.length === 0 ? (
                                            <p className='messages-thread-empty'>
                                                No messages yet. Start the conversation.
                                            </p>
                                        ) : (
                                            selectedMessages.map((message) => (
                                                <MessageBubble
                                                    key={getId(message)}
                                                    message={message}
                                                    isMine={message.sender_id === myUserId}
                                                />
                                            ))
                                        )}
                                        <div ref={endRef} />
                                    </div>

                                    <form className='messages-composer' onSubmit={handleSend}>
                                        <input
                                            type='text'
                                            value={messageInput}
                                            onChange={handleMessageInputChange}
                                            placeholder='Write a message...'
                                            maxLength={MAX_MESSAGE_LENGTH}
                                            disabled={sending}
                                        />
                                        <button
                                            type='submit'
                                            disabled={
                                                sending || !messageInput.trim() || messageInput.length > MAX_MESSAGE_LENGTH
                                            }
                                        >
                                            {sending ? 'Sending...' : 'Send'}
                                        </button>
                                    </form>
                                    <p
                                        className={`messages-character-count${isNearMessageLimit ? ' messages-character-count--warning' : ''}${isAtMessageLimit ? ' messages-character-count--error' : ''}`}
                                    >
                                        {isAtMessageLimit
                                            ? `Message limit reached (${MAX_MESSAGE_LENGTH} characters max). Delete characters to continue.`
                                            : `${charactersRemaining} characters remaining`}
                                    </p>
                                </>
                            ) : (
                                <div className='messages-chat-empty'>
                                    <p className='empty-message'>Select a conversation to start messaging.</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
