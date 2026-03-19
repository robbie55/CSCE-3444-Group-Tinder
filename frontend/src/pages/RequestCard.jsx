import styles from './RequestCard.module.css';

export default function RequestCard({ request, onAccept, onReject }) {
  const handleAccept = async () => {
    await onAccept(request.id);
  };

  const handleReject = async () => {
    await onReject(request.id);
  };

  const user = request.sender;

  if (!user) {
    return null;
  }

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

      <div className={styles.actions}>
        <button className={styles.rejectButton} onClick={handleReject}>
          Reject
        </button>
        <button className={styles.acceptButton} onClick={handleAccept}>
          Accept
        </button>
      </div>
    </div>
  );
}
