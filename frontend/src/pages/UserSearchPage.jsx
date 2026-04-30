import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/auth';
import { getCurrentUser } from '../api/users.js';
import SearchFilters from '../components/SearchFilters.jsx';
import Sidebar from '../components/Sidebar.jsx';
import UserSearchCard from '../components/UserSearchCard.jsx';
import './UserSearchPage.css';

// basic search page
// display either user cards or no user message
export default function UserSearchPage() {
    const [_search, _setSearch] = useState('');
    const [_major, _setMajor] = useState('all');
    const [_skills, _setSkills] = useState('all');

    const [_loading, _setLoading] = useState(true);
    const [_error, _setError] = useState('');

    const [_users, _setUsers] = useState([]);
    const [_currentUserId, _setCurrentUserId] = useState(null);

    const fetchUsers = useCallback(async () => {
        try {
            _setLoading(true);
            _setError('');

            const res = await apiFetch('/api/users/');

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Error fetching users.');
            }

            const userList = await res.json();
            _setUsers(userList);
        } catch (err) {
            _setError('Failed to fetch users. ', err.message);
            console.error('Failed to fetch users. ', err.message);
        } finally {
            _setLoading(false);
        }
    }, []);

    const fetchCurrentUserId = useCallback(async () => {
        try {
            _setLoading(true);
            _setError('');

            const currentUserRes = await getCurrentUser();
            _setCurrentUserId(currentUserRes._id);
        } catch (err) {
            _setError('Failed to fetch current user. ', err.message);
            console.error('Failed to fetch current user. ', err.message);
        } finally {
            _setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentUserId();
        fetchUsers();
    }, [fetchCurrentUserId, fetchUsers]);

    const filterUsers = useCallback(
        (usersArray) => {
            return (usersArray ?? []).filter((user) => {
                if (_currentUserId && _currentUserId === user._id) return false;

                const matchesSearch = user.full_name
                    .trim()
                    .toLowerCase()
                    .includes(_search.trim().toLowerCase());
                const matchesMajor = _major === 'all' || user.major === _major;
                const matchesSkill = _skills === 'all' || user.skills.includes(_skills);

                return matchesSearch && matchesMajor && matchesSkill;
            });
        },
        [_search, _major, _skills, _currentUserId]
    );

    const _filteredUsers = useMemo(() => {
        return filterUsers(_users);
    }, [filterUsers, _users]);

    if (_loading)
        return (
            <div className='page'>
                <div className='page-sidebar'>
                    <Sidebar />
                </div>
                <div className='page-content'>
                    <div className='page-filters'>
                        <SearchFilters
                            search={_search}
                            onSearchChange={_setSearch}
                            major={_major}
                            onMajorChange={_setMajor}
                            skills={_skills}
                            onSkillsChange={_setSkills}
                        />
                    </div>
                    <div className='page-empty'>
                        <p className='empty-message'>Loading...</p>
                    </div>
                </div>
            </div>
        );

    if (_error)
        return (
            <div className='page'>
                <div className='page-sidebar'>
                    <Sidebar />
                </div>
                <div className='page-content'>
                    <div className='page-filters'>
                        <SearchFilters
                            search={_search}
                            onSearchChange={_setSearch}
                            major={_major}
                            onMajorChange={_setMajor}
                            skills={_skills}
                            onSkillsChange={_setSkills}
                        />
                    </div>
                    <div className='page-empty'>
                        <p className='empty-message'>{_error}</p>
                        <div>
                            <button
                                type='button'
                                className='retry-button'
                                onClick={() => {
                                    fetchCurrentUserId();
                                    fetchUsers();
                                    filterUsers(_users);
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );

    return (
        <div className='page'>
            <div className='page-sidebar'>
                <Sidebar />
            </div>
            <div className='page-content'>
                <div className='page-filters'>
                    <SearchFilters
                        search={_search}
                        onSearchChange={_setSearch}
                        major={_major}
                        onMajorChange={_setMajor}
                        skills={_skills}
                        onSkillsChange={_setSkills}
                    />
                </div>
                {_filteredUsers.length > 0 ? (
                    <div className='users'>
                        {_filteredUsers.map((user) => (
                            <UserSearchCard key={user._id} user={user} />
                        ))}
                    </div>
                ) : (
                    <div className='page-empty'>
                        <p className='empty-message'>No users found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
