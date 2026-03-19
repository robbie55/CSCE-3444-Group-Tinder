import { useState, useEffect } from 'react';
import RequestCard from './RequestCard';
import {
  getIncomingRequests,
  acceptMatchRequest,
  rejectMatchRequest,
} from '../api/match';
import styles from './Requests.module.css';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getIncomingRequests();
      setRequests(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await acceptMatchRequest(requestId);
      // Remove the request from the list
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error('Error accepting request:', err);
      alert('Failed to accept request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectMatchRequest(requestId);
      // Remove the request from the list
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={fetchRequests}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Connection Requests</h1>
        <p>Accept or reject students who want to connect with you</p>
      </div>

      {requests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No pending requests yet.</p>
          <button className={styles.retryButton} onClick={fetchRequests}>
            Refresh
          </button>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
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
    </div>
  );
}
