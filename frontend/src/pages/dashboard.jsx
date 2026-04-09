import { useCallback, useEffect, useState } from 'react';
import MatchCard from './MatchCard';
import { getOutgoingRequests, getConnections, getIncomingRequests } from '../api/match';
import { apiFetch } from '../api/auth';
import Sidebar from '../components/Sidebar';
import styles from './Dashboard.module.css';

export default function Dashboard() {
    const [users, setUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [outgoingRequests, setOutgoingRequests] = useState(new Map());
    const [connections, setConnections] = useState(new Set());
    const [incomingCount, setIncomingCount] = useState(0);

    const getUserId = useCallback((user) => user?.id || user?._id, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            const [meResponse, suggestionsResponse, outgoingData, connectionsData, incomingData] =
                await Promise.all([
                    apiFetch('/api/users/me'),
                    apiFetch('/api/users/suggestions?limit=50'),
                    getOutgoingRequests(),
                    getConnections(),
                    getIncomingRequests(),
                ]);

            if (!meResponse.ok) {
                throw new Error('Failed to fetch current user');
            }

            if (!suggestionsResponse.ok) {
                throw new Error('Failed to fetch suggested users');
            }

            const currentUser = await meResponse.json();
            setCurrentUserId(getUserId(currentUser));

            const suggestedUsersRaw = await suggestionsResponse.json();
            const suggestedUsers = suggestedUsersRaw.map((user) => ({
                ...user,
                id: getUserId(user),
            }));

            // Only allow connect cards for users that have a positive similarity score.
            const similarUsers = suggestedUsers.filter(
                (user) => typeof user.match_score === 'number' && user.match_score > 0
            );

            setUsers(similarUsers);

            const outgoingMap = new Map();
            outgoingData.forEach((req) => {
                outgoingMap.set(req.receiver_id, 'pending');
            });
            setOutgoingRequests(outgoingMap);

            const connectionsSet = new Set(connectionsData.map((user) => getUserId(user)));
            setConnections(connectionsSet);
            setIncomingCount(incomingData.length);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load suggestions. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [getUserId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConnect = (userId) => {
        setOutgoingRequests((prev) => {
            const next = new Map(prev);
            next.set(userId, 'pending');
            return next;
        });
    };

    const getUserStatus = (userId) => {
        if (userId && currentUserId && userId === currentUserId) {
            return 'self';
        }
        if (connections.has(userId)) {
            return 'connected';
        }
        if (outgoingRequests.has(userId)) {
            return 'pending';
        }
        return null;
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.pageSidebar}>
                    <Sidebar />
                </div>
                <div className={styles.pageContent}>
                    <div className={styles.container}>
                        <div className={styles.loadingSpinner}>
                            <div className={styles.spinner}></div>
                            <p>Loading users...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.pageSidebar}>
                    <Sidebar />
                </div>
                <div className={styles.pageContent}>
                    <div className={styles.container}>
                        <div className={styles.errorContainer}>
                            <p className={styles.errorText}>{error}</p>
                            <button className={styles.retryButton} onClick={fetchData}>
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.pageSidebar}>
                <Sidebar />
            </div>
            <div className={styles.pageContent}>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <h1>All Users</h1>
                        <p>Connect with users who have similar skills and major.</p>
                    </div>

                    <div className={styles.notificationBanner}>
                        <p>
                            Incoming: <strong>{incomingCount}</strong> | Outgoing:{' '}
                            <strong>{outgoingRequests.size}</strong>
                        </p>
                        <a href='/requests' className={styles.bannerLink}>
                            View Requests
                        </a>
                    </div>

                    {users.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No similar users found yet.</p>
                            <button className={styles.retryButton} onClick={fetchData}>
                                Refresh
                            </button>
                        </div>
                    ) : (
                        <div className={styles.cardsGrid}>
                            {users.map((user) => (
                                <MatchCard
                                    key={user.id || user.username}
                                    user={user}
                                    onConnect={handleConnect}
                                    requestStatus={getUserStatus(getUserId(user))}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
