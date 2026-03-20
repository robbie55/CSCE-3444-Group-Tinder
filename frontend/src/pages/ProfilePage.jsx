import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, updateCurrentUser } from '../api/users';
import Sidebar from '../components/Sidebar.jsx';
import './ProfilePage.css';
import './UserSearchPage.css';
const MAJORS = [
    'Computer Science',
    'Computer Engineering',
    'Information Technology',
    'Data Science',
    'Cybersecurity',
    'Other',
];

function parseSkills(skillsText) {
    return (skillsText ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

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

    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');

    const startEditing = useCallback(() => {
        if (!user) return;

        setSaveError('');
        setSaveSuccess('');
        setIsEditing(true);
        setDraft({
            username: user.username ?? '',
            full_name: user.full_name ?? '',
            major: user.major ?? 'Other',
            bio: user.bio ?? '',
            skillsText: (user.skills ?? []).join(', '),
            external_links: {
                github: user.external_links?.github ?? '',
                linkedin: user.external_links?.linkedin ?? '',
            },
        });
    }, [user]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setDraft(null);
        setSaveError('');
        setSaveSuccess('');
    }, []);

    const saveChanges = useCallback(async () => {
        if (!user || !draft) return;

        setSaving(true);
        setSaveError('');
        setSaveSuccess('');

        try {
            const patchBody = {};
            const nextUsername = draft.username.trim();
            const nextFullName = draft.full_name.trim();

            if (nextUsername !== user.username) {
                patchBody.username = nextUsername;
            }

            if (nextFullName !== user.full_name) {
                patchBody.full_name = nextFullName;
            }

            if (draft.major !== user.major) {
                patchBody.major = draft.major;
            }

            const userBio = user.bio ?? '';
            const nextBioTrim = (draft.bio ?? '').trim();

            if (nextBioTrim !== userBio) {
                patchBody.bio = nextBioTrim === '' ? null : nextBioTrim;
            }

            const nextSkills = parseSkills(draft.skillsText);
            const userSkills = (user.skills ?? []).map((s) => s.trim()).filter(Boolean);

            const normalizeSkills = (skills) =>
                skills
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));

            const normalizedNext = normalizeSkills(nextSkills);
            const normalizedUser = normalizeSkills(userSkills);
            if (normalizedNext.join('|') !== normalizedUser.join('|')) {
                patchBody.skills = nextSkills;
            }

            const nextExternalLinks = {};
            const nextGitHub = (draft.external_links?.github ?? '').trim();
            const nextLinkedIn = (draft.external_links?.linkedin ?? '').trim();

            if (nextGitHub) nextExternalLinks.github = nextGitHub;
            if (nextLinkedIn) nextExternalLinks.linkedin = nextLinkedIn;

            const userExternalLinks = user.external_links ?? {};
            const userGitHub = userExternalLinks.github ?? '';
            const userLinkedIn = userExternalLinks.linkedin ?? '';

            if (
                (nextExternalLinks.github ?? '') !== userGitHub ||
                (nextExternalLinks.linkedin ?? '') !== userLinkedIn
            ) {
                patchBody.external_links = nextExternalLinks;
            }
            const updated = await updateCurrentUser(patchBody);
            setUser(updated);
            setSaveSuccess('Profile updated');
            setIsEditing(false);
            setDraft(null);
        } catch (err) {
            setSaveError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    }, [user, draft]);

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
                            <div className='profile-username'>
                                @{isEditing ? (draft?.username ?? user.username) : user.username}
                            </div>
                            <div className='profile-major'>
                                Major: {isEditing ? (draft?.major ?? user.major) : user.major}
                            </div>
                        </div>
                    </div>

                    <div className='profile-section'>
                        <h2 className='profile-section-title'>Account</h2>

                        {!isEditing ? (
                            <div className='profile-placeholder-text'>
                                <div>Full name: {user.full_name}</div>
                                <div>Username: {user.username}</div>
                                <div>Major: {user.major}</div>
                            </div>
                        ) : (
                            <div className='profile-form-grid'>
                                <div className='profile-field'>
                                    <label className='profile-label' htmlFor='edit-username'>
                                        Username
                                    </label>
                                    <input
                                        id='edit-username'
                                        className='profile-input'
                                        type='text'
                                        value={draft?.username ?? ''}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                username: e.target.value,
                                            }))
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div className='profile-field'>
                                    <label className='profile-label' htmlFor='edit-full-name'>
                                        Full Name
                                    </label>
                                    <input
                                        id='edit-full-name'
                                        className='profile-input'
                                        type='text'
                                        value={draft?.full_name ?? ''}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                full_name: e.target.value,
                                            }))
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div className='profile-field'>
                                    <label className='profile-label' htmlFor='edit-major'>
                                        Major
                                    </label>
                                    <select
                                        id='edit-major'
                                        className='profile-select'
                                        value={draft?.major ?? 'Other'}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                major: e.target.value,
                                            }))
                                        }
                                        disabled={saving}
                                    >
                                        {MAJORS.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className='profile-section'>
                        <h2 className='profile-section-title'>Bio</h2>

                        {!isEditing ? (
                            <p className='profile-placeholder-text'>
                                {user?.bio ? user.bio : 'No bio provided.'}
                            </p>
                        ) : (
                            <div className='profile-field'>
                                <textarea
                                    className='profile-textarea'
                                    value={draft?.bio ?? ''}
                                    onChange={(e) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            bio: e.target.value,
                                        }))
                                    }
                                    disabled={saving}
                                />
                            </div>
                        )}
                    </div>

                    {/* SKILLS */}
                    <div className='profile-section'>
                        <h2 className='profile-section-title'>Skills</h2>

                        {!isEditing ? (
                            <div className='profile-skill-row'>
                                {(user?.skills ?? []).length > 0 ? (
                                    user.skills.map((skill) => (
                                        <span key={skill} className='skill-badge'>
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <span className='profile-placeholder-text'>
                                        No skills found.
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className='profile-field'>
                                <label className='profile-label' htmlFor='edit-skills'>
                                    Skills (comma-separated)
                                </label>
                                <input
                                    id='edit-skills'
                                    className='profile-input'
                                    type='text'
                                    placeholder='e.g. React, Python, SQL'
                                    value={draft?.skillsText ?? ''}
                                    onChange={(e) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            skillsText: e.target.value,
                                        }))
                                    }
                                    disabled={saving}
                                />
                            </div>
                        )}
                    </div>

                    {/* EXTERNAL LINKS */}
                    <div className='profile-section'>
                        <h2 className='profile-section-title'>External Links</h2>

                        {!isEditing ? (
                            <div className='profile-links'>
                                {!hasExternalLinks ? (
                                    <span className='profile-link-placeholder'>
                                        No external links
                                    </span>
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
                        ) : (
                            <div className='profile-form-grid'>
                                <div className='profile-field'>
                                    <label className='profile-label' htmlFor='edit-github'>
                                        GitHub URL
                                    </label>
                                    <input
                                        id='edit-github'
                                        className='profile-input'
                                        type='url'
                                        placeholder='https://github.com/username'
                                        value={draft?.external_links?.github ?? ''}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                external_links: {
                                                    ...(prev?.external_links ?? {}),
                                                    github: e.target.value,
                                                },
                                            }))
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div className='profile-field'>
                                    <label className='profile-label' htmlFor='edit-linkedin'>
                                        LinkedIn URL
                                    </label>
                                    <input
                                        id='edit-linkedin'
                                        className='profile-input'
                                        type='url'
                                        placeholder='https://linkedin.com/in/username'
                                        value={draft?.external_links?.linkedin ?? ''}
                                        onChange={(e) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                external_links: {
                                                    ...(prev?.external_links ?? {}),
                                                    linkedin: e.target.value,
                                                },
                                            }))
                                        }
                                        disabled={saving}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className='profile-actions'>
                        {!isEditing ? (
                            <button
                                className='profile-action-button'
                                type='button'
                                onClick={startEditing}
                                disabled={saving}
                            >
                                Edit profile
                            </button>
                        ) : (
                            <>
                                <button
                                    className='profile-action-button'
                                    type='button'
                                    onClick={saveChanges}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>

                                <button
                                    className='profile-action-button profile-action-button-secondary'
                                    type='button'
                                    onClick={cancelEditing}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>

                    {saveSuccess ? (
                        <div className='profile-success' role='status' aria-live='polite'>
                            {saveSuccess}
                        </div>
                    ) : null}

                    {isEditing && saveError ? (
                        <div className='profile-error-banner' role='alert' aria-live='assertive'>
                            {saveError}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
