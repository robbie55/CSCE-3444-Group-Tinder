import { useState } from 'react';
import { UserSearchCard } from '../components/userSearchCard';
import './UserSearchPage.css';

// basic search page
// display either user cards or no user message
export default function UserSearchPage() {
    const [_query, _setQuery] = useState(''); // user search
    const [_major, _setMajor] = useState('all'); // major filter
    const [_year, _setYear] = useState('all'); // year filter
    const [_availability, _setAvailability] = useState('all'); // availability filter
    const [_skills, _setSkills] = useState('all'); // skills filter
    const [_users, _setUsers] = useState([]); // users

    // make the user fetch a function and call in the useEffect
    // look into recalling useEffect on query or filter to update the search
    // actually look into useMemo instead of useEffect for filtering

    /*
    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/users')
            .then((response) => response.json())
            .then((data) => _setUsers(data))
            .catch((error) => console.error('Error fetching users: ', error));
    }, [_query, _major, _year, _availability, _skills]);
    */

    const _mockUsers = [
        {
            id: 12,
            email: 'something@my.unt.edu',
            name: 'Some Student',
        },
        {
            id: 13,
            email: 'anotherstudent@my.unt.edu',
            name: 'Another Student',
        },
        {
            id: 14,
            email: 'THIRDSTUDENT@my.unt.edu',
            name: 'Third Student',
        },
        {
            id: 15,
            email: 'edwinnoon@my.unt.edu',
            name: 'Edwin Noon',
        },
    ];

    const _noUsers = [];

    return (
        <div>
            {_mockUsers.length > 0 ? (
                <div className='app-grid'>
                    {_mockUsers.map((user) => (
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
