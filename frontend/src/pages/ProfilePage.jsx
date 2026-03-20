import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '../api/users';
import Sidebar from '../components/Sidebar.jsx';
import './ProfilePage.css';
import './UserSearchPage.css';

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const data = await getCurrentUser();
            setUser(data);
        } catch (err) {
            setError(err.message || 'Failed to load profile');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const initials = useMemo(() => {
        const name = user?.full_name;
        if (!name) return 'U';

        return name
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .join('')
            .toUpperCase();
    }, [user]);

    if (loading) {
        return (
            <div className='page'>
                <div className='page-sidebar'>
                    <Sidebar />
                </div>
                <div className='page-content'>
                    <p className='profile-placeholder-text'>Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='page'>
                <div className='page-sidebar'>
                    <Sidebar />
                </div>
                <div className='page-content'>
                    <div className='profile-section'>
                        <h2 className='profile-section-title'>Could not load profile</h2>
                        <p className='profile-placeholder-text'>{error}</p>
                        <div style={{ marginTop: 12 }}>
                            <button
                                type='button'
                                className='profile-action-button profile-action-button-secondary'
                                onClick={loadProfile}
                            >
                                Retry
                            </button>
                        </div>
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
                <div className='profile'>
                    <div className='profile-header'>
                        <div className='profile-avatar'>{initials}</div>

                        <div className='profile-header-info'>
                            <h1 className='profile-name'>Profile</h1>
                            <div className='profile-username'>@{user?.username ?? 'username'}</div>
                            <div className='profile-major'>Major: {user?.major ?? '—'}</div>
                        </div>
                    </div>

                    <div className='profile-section'>
                        <h2 className='profile-section-title'>Bio</h2>
                        <p className='profile-placeholder-text'>
                            {user?.bio ? user.bio : 'No bio yet.'}
                        </p>
                    </div>

                    <div className='profile-section'>
                        <h2 className='profile-section-title'>Skills</h2>
                        <div className='profile-skill-row'>
                            {(user?.skills ?? []).length > 0 ? (
                                user.skills.map((skill) => (
                                    <span key={skill} className='skill-badge'>
                                        {skill}
                                    </span>
                                ))
                            ) : (
                                <span className='profile-placeholder-text'>No skills yet.</span>
                            )}
                        </div>
                    </div>

                    <div className='profile-section'>
                        <h2 className='profile-section-title'>External Links</h2>

                        <div className='profile-links'>
                            <div className='profile-link-row'>
                                <span className='profile-link-label'>GitHub</span>
                                {user?.external_links?.github ? (
                                    <a
                                        className='profile-link-placeholder'
                                        href={user.external_links.github}
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        Connected
                                    </a>
                                ) : (
                                    <span className='profile-link-placeholder'>Not connected</span>
                                )}
                            </div>

                            <div className='profile-link-row'>
                                <span className='profile-link-label'>LinkedIn</span>
                                {user?.external_links?.linkedin ? (
                                    <a
                                        className='profile-link-placeholder'
                                        href={user.external_links.linkedin}
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        Connected
                                    </a>
                                ) : (
                                    <span className='profile-link-placeholder'>Not connected</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='profile-actions'>
                        <button className='profile-action-button' type='button'>
                            Edit profile
                        </button>

                        <button
                            className='profile-action-button profile-action-button-secondary'
                            type='button'
                            disabled
                        >
                            Save
                        </button>

                        <button
                            className='profile-action-button profile-action-button-secondary'
                            type='button'
                            disabled
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
