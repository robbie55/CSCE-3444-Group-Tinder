import { useState } from 'react';
import PropTypes from 'prop-types';
import { sendMatchRequest } from '../api/match';
import styles from './MatchCard.module.css';

export default function MatchCard({ user, onConnect, requestStatus = null }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async () => {
        try {
            setIsLoading(true);
            await sendMatchRequest(user.id);
            onConnect(user.id);
        } catch (error) {
            console.error('Error connecting with user:', error);
            alert('Failed to send connect request');
        } finally {
            setIsLoading(false);
        }
    };

    // Determine button state
    const isConnected = requestStatus === 'connected';
    const isPending = requestStatus === 'pending';
    const isDisabled = isConnected || isPending || isLoading;

    return (
        <div className={styles.card}>
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

            <button
                className={styles.connectButton}
                onClick={handleConnect}
                disabled={isDisabled}
                title={
                    isPending
                        ? 'Request pending'
                        : isConnected
                          ? 'Already connected'
                          : 'Send connect request'
                }
            >
                {isLoading
                    ? 'Sending...'
                    : isPending
                      ? 'Request Sent'
                      : isConnected
                        ? 'Connected'
                        : 'Connect'}
            </button>
        </div>
    );
}

MatchCard.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.string,
        avatar_url: PropTypes.string,
        full_name: PropTypes.string,
        major: PropTypes.string,
        skills: PropTypes.arrayOf(PropTypes.string),
        bio: PropTypes.string,
    }),
    onConnect: PropTypes.func,
    requestStatus: PropTypes.string,
};
