import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/auth';
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
    const [_users, _setUsers] = useState([]);

    useEffect(() => {
        async function fetchUsers() {
            try {
                const res = await apiFetch('/api/users');

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || 'Error fetching users');
                }

                const userList = await res.json();
                _setUsers(userList);
            } catch (err) {
                console.error('Failed to fetch users: ', err.message);
            }
        }
        fetchUsers();
    }, []);

    const filterUsers = useCallback(
        (usersArray) => {
            return (usersArray ?? []).filter((user) => {
                const matchesSearch = user.full_name.toLowerCase().includes(_search.toLowerCase());
                const matchesMajor = _major === 'all' || user.major === _major;
                const matchesSkill = _skills === 'all' || user.skills.includes(_skills);

                return matchesSearch && matchesMajor && matchesSkill;
            });
        },
        [_search, _major, _skills]
    );

    const _filteredUsers = useMemo(() => {
        return filterUsers(_users);
    }, [filterUsers, _users]);

    return (
        <div className='page'>
            <div className='page-sidebar'>
                <Sidebar></Sidebar>
            </div>
            <div className='content'>
                <div className='search-filters'>
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
                            <UserSearchCard key={user.id} user={user} />
                        ))}
                    </div>
                ) : (
                    <div className='empty'>
                        <p className='empty-message'>No users found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
