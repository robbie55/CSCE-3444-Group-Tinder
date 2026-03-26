import { useState, useEffect } from 'react';
import MatchCard from './MatchCard';
import { getOutgoingRequests, getConnections, getIncomingRequests } from '../api/match';
import styles from './Dashboard.module.css';

export default function Dashboard() {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [outgoingRequests, setOutgoingRequests] = useState(new Map());
    const [connections, setConnections] = useState(new Set());
    const [incomingCount, setIncomingCount] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');

            // Fetch current user
            const meResponse = await fetch('http://localhost:8000/api/users/me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!meResponse.ok) {
                throw new Error('Failed to fetch current user');
            }

            const currentUserData = await meResponse.json();
            setCurrentUser(currentUserData);

            // Fetch all users
            const usersResponse = await fetch('http://localhost:8000/api/users', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!usersResponse.ok) {
                throw new Error('Failed to fetch users');
            }

            const allUsers = await usersResponse.json();

            // Filter out the current user
            const filteredUsers = allUsers.filter((user) => user.id !== currentUserData.id);

            setUsers(filteredUsers);

            // Fetch outgoing requests
            const outgoingData = await getOutgoingRequests();
            const outgoingMap = new Map();
            outgoingData.forEach((req) => {
                outgoingMap.set(req.receiver_id, 'pending');
            });
            setOutgoingRequests(outgoingMap);

            // Fetch connections
            const connectionsData = await getConnections();
            const connectionsSet = new Set(connectionsData.map((user) => user.id));
            setConnections(connectionsSet);

            // Fetch incoming requests count
            const incomingData = await getIncomingRequests();
            setIncomingCount(incomingData.length);

            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load matches. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = (userId) => {
        setOutgoingRequests((prev) => new Map(prev).set(userId, 'pending'));
    };

    const getUserStatus = (userId) => {
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
            <div className={styles.container}>
                <div className={styles.loadingSpinner}>
                    <div className={styles.spinner}></div>
                    <p>Loading matches...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <p className={styles.errorText}>{error}</p>
                    <button className={styles.retryButton} onClick={fetchData}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Find Your Study Group</h1>
                <p>Connect with students who share your interests</p>
            </div>

            {incomingCount > 0 && (
                <div className={styles.notificationBanner}>
                    <p>
                        You have{' '}
                        <strong>
                            {incomingCount} new connection request{incomingCount !== 1 ? 's' : ''}
                        </strong>
                    </p>
                    <a href='/requests' className={styles.bannerLink}>
                        View Requests
                    </a>
                </div>
            )}

            {users.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No matches available at the moment.</p>
                    <button className={styles.retryButton} onClick={fetchData}>
                        Refresh
                    </button>
                </div>
            ) : (
                <div className={styles.cardsGrid}>
                    {users.map((user) => (
                        <MatchCard
                            key={user.id}
                            user={user}
                            onConnect={handleConnect}
                            requestStatus={getUserStatus(user.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
