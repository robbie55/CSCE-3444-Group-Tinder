import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    acceptMatchRequest,
    getConnections,
    getIncomingRequests,
    getOutgoingRequests,
    rejectMatchRequest,
} from '../api/match';
import { openOrGetConversation } from '../api/messages';
import RequestCard from '../components/RequestCard';
import Sidebar from '../components/Sidebar';
import UserSearchCard from '../components/UserSearchCard';
import './Requests.css';

export default function Requests() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [connectionsList, setConnectionsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [messageActionError, setMessageActionError] = useState(null);

    const getUserId = (user) => user?.id || user?._id;
    const getRequestId = (req) => req?.id ?? req?._id;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [incomingData, outgoingData, connectionsData] = await Promise.all([
                getIncomingRequests(),
                getOutgoingRequests(),
                getConnections(),
            ]);
            setRequests(incomingData);
            setOutgoingRequests(outgoingData);
            setConnectionsList(connectionsData);
            setError(null);
        } catch (err) {
            console.error('Error fetching requests:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (requestId) => {
        try {
            await acceptMatchRequest(requestId);
            setRequests((prev) => prev.filter((req) => getRequestId(req) !== requestId));
            const connectionsData = await getConnections();
            setConnectionsList(connectionsData);
        } catch (err) {
            console.error('Error accepting request:', err);
        }
    };

    const handleReject = async (requestId) => {
        try {
            await rejectMatchRequest(requestId);
            setRequests((prev) => prev.filter((req) => getRequestId(req) !== requestId));
        } catch (err) {
            console.error('Error rejecting request:', err);
        }
    };

    const handleMessageUser = async (userId) => {
        if (!userId) return;

        try {
            setMessageActionError(null);
            const conversation = await openOrGetConversation(userId);
            const conversationId = conversation?.id ?? conversation?._id;
            if (!conversationId) {
                setMessageActionError('Could not open chat. Please try again.');
                return;
            }
            navigate(`/messages?conversationId=${conversationId}`);
        } catch (err) {
            console.error('Error opening conversation:', err);
            setMessageActionError(err.message || 'Could not open chat. Please try again.');
        }
    };

    const normalizeUserForCard = (user) => ({
        ...user,
        full_name: user?.full_name || 'Unknown User',
        username: user?.username || 'unknown',
        bio: user?.bio || '',
        skills: Array.isArray(user?.skills) ? user.skills : [],
        external_links: {
            github: user?.external_links?.github || '',
            linkedin: user?.external_links?.linkedin || '',
        },
    });

    let content;

    if (loading) {
        content = (
            <div className='page-empty'>
                <p className='empty-message'>Loading...</p>
            </div>
        );
    } else if (error) {
        content = (
            <div className='page-empty'>
                <p className='empty-message'>{error}</p>
                <button className='requests-retry' onClick={fetchData}>
                    Try Again
                </button>
            </div>
        );
    } else {
        content = (
            <>
                {messageActionError && (
                    <div className='requests-error-banner'>
                        <p>{messageActionError}</p>
                    </div>
                )}
                <section className='requests-section'>
                    <h2>Pending Requests</h2>
                    {requests.length === 0 ? (
                        <p className='empty-message'>No pending requests.</p>
                    ) : (
                        <div className='users'>
                            {requests.map((request) => (
                                <RequestCard
                                    key={getRequestId(request)}
                                    request={request}
                                    onAccept={handleAccept}
                                    onReject={handleReject}
                                    onMessage={handleMessageUser}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section className='requests-section'>
                    <h2>Sent Requests</h2>
                    {outgoingRequests.length === 0 ? (
                        <p className='empty-message'>No outgoing requests.</p>
                    ) : (
                        <div className='users'>
                            {outgoingRequests.map((request) => {
                                const user = request.receiver;
                                if (!user) return null;
                                return (
                                    <div
                                        key={getRequestId(request)}
                                        className='outgoing-request-card'
                                    >
                                        <UserSearchCard user={normalizeUserForCard(user)} />
                                        <span className='outgoing-request-status'>Pending</span>
                                        <button
                                            className='requests-message-btn'
                                            onClick={() => handleMessageUser(getUserId(user))}
                                        >
                                            Message
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className='requests-section'>
                    <h2>Your Connections</h2>
                    {connectionsList.length === 0 ? (
                        <p className='empty-message'>No connections yet.</p>
                    ) : (
                        <div className='users'>
                            {connectionsList.map((user) => (
                                <div key={getUserId(user)} className='connected-user-card'>
                                    <UserSearchCard user={normalizeUserForCard(user)} />
                                    <button
                                        className='requests-message-btn'
                                        onClick={() => handleMessageUser(getUserId(user))}
                                    >
                                        Message
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </>
        );
    }

    return (
        <div className='page'>
            <div className='page-sidebar'>
                <Sidebar />
            </div>
            <div className='page-content'>{content}</div>
        </div>
    );
}
