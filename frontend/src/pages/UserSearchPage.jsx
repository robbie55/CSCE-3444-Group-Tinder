import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserSearchCard } from '../components/userSearchCard';
import './UserSearchPage.css';

// basic search page
// display either user cards or no user message
export default function UserSearchPage() {
    const [_search, _setSearch] = useState('');
    const [_major, _setMajor] = useState('all');
    const [_year, _setYear] = useState('all');
    const [_skills, _setSkills] = useState('all');
    const [_users, _setUsers] = useState([]);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/users')
            .then((response) => response.json())
            .then((data) => _setUsers(data))
            .catch((error) => console.error('Error fetching users: ', error));
    }, []);

    const filterUsers = useCallback(
        (usersArray) => {
            return (usersArray ?? []).filter((user) => {
                const matchesSearch = user.full_name.toLowerCase().includes(_search.toLowerCase());
                const matchesMajor = _major === 'all' || user.major === _major;
                const matchesYear = _year === 'all' || user.year === _year;
                const matchesSkill = _skills === 'all' || user.skills.includes(_skills);

                return matchesSearch && matchesMajor && matchesYear && matchesSkill;
            });
        },
        [_search, _major, _year, _skills]
    );

    const _filteredUsers = useMemo(() => {
        return filterUsers(_users);
    }, [filterUsers, _users]);

    return (
        <div>
            {_filteredUsers.length > 0 ? (
                <div className='app-grid'>
                    {_filteredUsers.map((user) => (
                        <UserSearchCard key={user.id} user={user} />
                    ))}
                </div>
            ) : (
                <div className='app-grid-empty'>
                    <p className='empty-message'>No users found</p>
                </div>
            )}
        </div>
    );
}
