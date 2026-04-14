import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/auth';
import {
    getOutgoingRequests,
    getConnections,
    getIncomingRequests,
    sendMatchRequest,
} from '../api/match';
import Sidebar from '../components/Sidebar';
import UserSearchCard from '../components/UserSearchCard';
import './Dashboard.css';

export default function Dashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [outgoingRequests, setOutgoingRequests] = useState(new Map());
    const [connections, setConnections] = useState(new Set());
    const [incomingCount, setIncomingCount] = useState(0);
    const [sendingRequests, setSendingRequests] = useState(new Set());
    const [requestErrors, setRequestErrors] = useState(new Map());

    const getUserId = (user) => user?.id || user?._id;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const meResponse = await apiFetch('/api/users/me');

            if (!meResponse.ok) {
                throw new Error('Failed to fetch current user');
            }

            const usersResponse = await apiFetch('/api/users/suggestions?limit=50');

            if (!usersResponse.ok) {
                throw new Error('Failed to fetch suggested users');
            }

            const allUsers = (await usersResponse.json()).map((user) => ({
                ...user,
                id: getUserId(user),
            }));

            const similarUsers = allUsers.filter(
                (user) => typeof user.match_score === 'number' && user.match_score > 0
            );

            setUsers(similarUsers);

            const outgoingData = await getOutgoingRequests();
            const outgoingMap = new Map();
            outgoingData.forEach((req) => {
                outgoingMap.set(req.receiver_id, 'pending');
            });
            setOutgoingRequests(outgoingMap);

            const connectionsData = await getConnections();
            const connectionsSet = new Set(connectionsData.map((user) => getUserId(user)));
            setConnections(connectionsSet);

            const incomingData = await getIncomingRequests();
            setIncomingCount(incomingData.length);

            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load suggestions. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConnect = async (userId) => {
        if (
            !userId ||
            outgoingRequests.has(userId) ||
            connections.has(userId) ||
            sendingRequests.has(userId)
        ) {
            return;
        }

        setSendingRequests((prev) => {
            const next = new Set(prev);
            next.add(userId);
            return next;
        });

        setRequestErrors((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
        });

        try {
            await sendMatchRequest(userId);
            setOutgoingRequests((prev) => {
                const next = new Map(prev);
                next.set(userId, 'pending');
                return next;
            });
        } catch (err) {
            setRequestErrors((prev) => {
                const next = new Map(prev);
                next.set(userId, err.message || 'Failed to send request');
                return next;
            });
        } finally {
            setSendingRequests((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    const getUserStatus = (userId) => {
        if (connections.has(userId)) return 'connected';
        if (outgoingRequests.has(userId)) return 'pending';
        return null;
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

    const getActionLabel = (userStatus, isSending) => {
        if (userStatus === 'connected') return 'Connected';
        if (userStatus === 'pending') return 'Pending';
        if (isSending) return 'Sending...';
        return 'Connect';
    };

    let content;

    if (loading) {
        content = (
            <div className='page-empty'>
                <p className='empty-message'>Loading matches...</p>
            </div>
        );
    } else if (error) {
        content = (
            <div className='page-empty'>
                <p className='empty-message'>{error}</p>
                <button className='dashboard-retry' onClick={fetchData}>
                    Try Again
                </button>
            </div>
        );
    } else {
        content = (
            <>
                <div className='dashboard-header'>
                    <h2>Find Your Study Group</h2>
                    <p className='dashboard-subtitle'>
                        Connect with users who have similar skills and major.
                    </p>
                </div>

                <div className='dashboard-banner'>
                    <p>
                        Incoming: <strong>{incomingCount}</strong> | Outgoing:{' '}
                        <strong>{outgoingRequests.size}</strong>
                    </p>
                    <Link to='/requests' className='dashboard-banner-link'>
                        View Requests
                    </Link>
                </div>

                {users.length === 0 ? (
                    <div className='page-empty'>
                        <p className='empty-message'>No similar users found yet.</p>
                        <button className='dashboard-retry' onClick={fetchData}>
                            Refresh
                        </button>
                    </div>
                ) : (
                    <div className='users'>
                        {users.map((user) => {
                            const userId = user.id;
                            const userStatus = getUserStatus(userId);
                            const isSending = sendingRequests.has(userId);
                            const cardUser = normalizeUserForCard(user);

                            return (
                                <div key={userId} className='dashboard-card-block'>
                                    <UserSearchCard user={cardUser} />
                                    {typeof user.match_score === 'number' && (
                                        <p className='dashboard-match-score'>
                                            {Math.round(user.match_score * 100)}% match
                                        </p>
                                    )}
                                    <button
                                        type='button'
                                        className='dashboard-connect-btn'
                                        disabled={
                                            userStatus === 'connected' ||
                                            userStatus === 'pending' ||
                                            isSending
                                        }
                                        onClick={() => handleConnect(userId)}
                                    >
                                        {getActionLabel(userStatus, isSending)}
                                    </button>
                                    {requestErrors.has(userId) && (
                                        <p className='dashboard-request-error'>
                                            {requestErrors.get(userId)}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
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
