import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api/auth';
import { getConnections, getOutgoingRequests, sendMatchRequest } from '../api/match';
import { getCurrentUser } from '../api/users';
import Sidebar from '../components/Sidebar';
import './ProfilePage.css';

export default function UserProfilePage() {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [connected, setConnected] = useState(false);
    const [pending, setPending] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const currentUser = await getCurrentUser();
            if (userId == currentUser._id) {
                navigate('/profile/');
            }

            const res = await apiFetch(`/api/users/${userId}`);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Error fetching user.');
            }

            const userData = await res.json();
            setUser(userData);
        } catch (err) {
            setError(err.message || 'Failed to load user profile.');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [userId, navigate]);

    const checkConnections = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const connectionsData = await getConnections();
            setConnected(userId in connectionsData);
            const outgoingData = await getOutgoingRequests();
            setPending(userId in outgoingData);
        } catch (err) {
            console.error('Error fetching requests:', err);
            setError(err.message || 'Failed to load connections.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadProfile();
        checkConnections();
    }, [loadProfile, checkConnections]);

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

    const githubUrl = user?.external_links?.github ?? '';
    const linkedinUrl = user?.external_links?.linkedin ?? '';
    const hasExternalLinks = Boolean(githubUrl || linkedinUrl);
    // Loading mode
    /*
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

    // Error mode (with Retry)
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
    */
    // Success mode: view vs edit UI
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
                            <div className='profile-username'>{user?.username}</div>
                            <div className='profile-major'>Major: {user?.major}</div>
                        </div>
                        <div className='profile-actions' style={{ marginLeft: 'auto' }}>
                            <button
                                className='profile-action-button'
                                onClick={(e) => {
                                    sendMatchRequest(userId);
                                    e.stopPropagation;
                                }}
                                disabled={connected}
                            >
                                {pending ? 'Pending' : connected ? 'Connected' : 'Connect'}
                            </button>
                            <button
                                className='profile-action-button'
                                onClick={(e) => {
                                    navigate('/groups');
                                    e.stopPropagation;
                                }}
                                disabled={!connected}
                            >
                                Invite to Group
                            </button>
                        </div>
                    </div>

                    <div className='profile-section'>
                        <h2 className='profile-section-title'>Account</h2>

                        <div className='profile-placeholder-text'>
                            <div>Full name: {user?.full_name}</div>
                            <div>Username: {user?.username}</div>
                            <div>Major: {user?.major}</div>
                        </div>
                    </div>
                    <div className='profile-section'>
                        <h2 className='profile-section-title'>Bio</h2>
                        <p className='profile-placeholder-text'>
                            {user?.bio ? user.bio : 'No bio provided.'}
                        </p>
                    </div>

                    {/* SKILLS */}
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
                                <span className='profile-placeholder-text'>No skills found.</span>
                            )}
                        </div>
                    </div>

                    {/* EXTERNAL LINKS */}
                    <div className='profile-section'>
                        <h2 className='profile-section-title'>External Links</h2>
                        <div className='profile-links'>
                            {!hasExternalLinks ? (
                                <span className='profile-link-placeholder'>No external links</span>
                            ) : (
                                <>
                                    <div className='profile-link-row'>
                                        <span className='profile-link-label'>GitHub</span>
                                        {githubUrl ? (
                                            <a
                                                className='profile-link-placeholder'
                                                href={githubUrl}
                                                target='_blank'
                                                rel='noreferrer'
                                            >
                                                Connected
                                            </a>
                                        ) : (
                                            <span className='profile-link-placeholder'>
                                                Not connected
                                            </span>
                                        )}
                                    </div>
                                    <div className='profile-link-row'>
                                        <span className='profile-link-label'>LinkedIn</span>
                                        {linkedinUrl ? (
                                            <a
                                                className='profile-link-placeholder'
                                                href={linkedinUrl}
                                                target='_blank'
                                                rel='noreferrer'
                                            >
                                                Connected
                                            </a>
                                        ) : (
                                            <span className='profile-link-placeholder'>
                                                Not connected
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
