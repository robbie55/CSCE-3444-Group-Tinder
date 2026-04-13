import { useState, useEffect } from 'react';
import {
    getIncomingRequests,
    getOutgoingRequests,
    getConnections,
    acceptMatchRequest,
    rejectMatchRequest,
} from '../api/match';
import RequestCard from '../components/RequestCard';
import Sidebar from '../components/Sidebar';
import UserSearchCard from '../components/UserSearchCard';
import './Requests.css';

export default function Requests() {
    const [requests, setRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [connectionsList, setConnectionsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getUserId = (user) => user?.id || user?._id;

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
            setRequests((prev) => prev.filter((req) => req.id !== requestId));
            const connectionsData = await getConnections();
            setConnectionsList(connectionsData);
        } catch (err) {
            console.error('Error accepting request:', err);
        }
    };

    const handleReject = async (requestId) => {
        try {
            await rejectMatchRequest(requestId);
            setRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            console.error('Error rejecting request:', err);
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
                <section className='requests-section'>
                    <h2>Pending Requests</h2>
                    {requests.length === 0 ? (
                        <p className='empty-message'>No pending requests.</p>
                    ) : (
                        <div className='users'>
                            {requests.map((request) => (
                                <RequestCard
                                    key={request.id}
                                    request={request}
                                    onAccept={handleAccept}
                                    onReject={handleReject}
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
                                    <div key={request.id} className='outgoing-request-card'>
                                        <UserSearchCard user={normalizeUserForCard(user)} />
                                        <span className='outgoing-request-status'>Pending</span>
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
                                <UserSearchCard
                                    key={getUserId(user)}
                                    user={normalizeUserForCard(user)}
                                />
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
