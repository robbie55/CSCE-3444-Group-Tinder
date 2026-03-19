import { useState, useEffect } from 'react';
import { getConnections } from '../api/match';
import styles from './Connections.module.css';

export default function Connections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const data = await getConnections();
      setConnections(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError('Failed to load connections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading connections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={fetchConnections}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Your Connections</h1>
        <p>Students you're matched with</p>
      </div>

      {connections.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No connections yet. Start connecting with students!</p>
          <button className={styles.retryButton} onClick={fetchConnections}>
            Refresh
          </button>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {connections.map((user) => (
            <div key={user.id} className={styles.card}>
              <div className={styles.imageContainer}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className={styles.content}>
                <h2 className={styles.name}>{user.full_name}</h2>
                <p className={styles.username}>@{user.username}</p>
                <p className={styles.major}>{user.major}</p>

                <div className={styles.skillsContainer}>
                  <p className={styles.skillsLabel}>Languages & Skills:</p>
                  <div className={styles.skills}>
                    {user.skills && user.skills.length > 0 ? (
                      user.skills.map((skill, index) => (
                        <span key={index} className={styles.skillTag}>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className={styles.noSkills}>No skills listed</span>
                    )}
                  </div>
                </div>

                {user.bio && (
                  <div className={styles.bioContainer}>
                    <p className={styles.bio}>{user.bio}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
