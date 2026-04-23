import { useEffect, useMemo, useState } from 'react';
import { createGroup, fetchGroups } from '../api/groups';
import { getCurrentUser } from '../api/users';
import GroupCard from '../components/GroupCard.jsx';
import GroupFormModal from '../components/GroupFormModal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import './GroupsPage.css';

export default function GroupsPage() {
    const [groups, setGroups] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [tab, setTab] = useState('my');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        async function load() {
            try {
                const [groupList, user] = await Promise.all([fetchGroups(), getCurrentUser()]);
                setGroups(groupList);
                setCurrentUser(user);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const filteredGroups = useMemo(() => {
        const userId = currentUser?._id;
        const byTab =
            tab === 'my'
                ? groups.filter((g) => (g.members ?? []).some((m) => m._id === userId))
                : groups.filter((g) => !(g.members ?? []).some((m) => m._id === userId));

        if (!search.trim()) return byTab;

        const q = search.trim().toLowerCase();
        return byTab.filter((g) => {
            return (
                g.name.toLowerCase().includes(q) || (g.description ?? '').toLowerCase().includes(q)
            );
        });
    }, [groups, currentUser, tab, search]);

    const handleCreate = async (data) => {
        setSaving(true);
        setSaveError('');
        try {
            const newGroup = await createGroup(data);
            setGroups((prev) => [newGroup, ...prev]);
            setModalOpen(false);
        } catch (err) {
            setSaveError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='page'>
            <div className='page-sidebar'>
                <Sidebar />
            </div>
            <div className='page-content'>
                <div className='groups-header'>
                    <h1 className='groups-title'>Groups</h1>
                    <button
                        className='groups-create-btn'
                        onClick={() => {
                            setSaveError('');
                            setModalOpen(true);
                        }}
                    >
                        Create Group
                    </button>
                </div>

                <div className='groups-tabs'>
                    <button
                        className={`groups-tab ${tab === 'my' ? 'groups-tab-active' : ''}`}
                        onClick={() => setTab('my')}
                    >
                        My Groups
                    </button>
                    <button
                        className={`groups-tab ${tab === 'discover' ? 'groups-tab-active' : ''}`}
                        onClick={() => setTab('discover')}
                    >
                        Discover
                    </button>
                </div>

                <div className='groups-search'>
                    <input
                        className='groups-search-input'
                        type='text'
                        placeholder='Search groups...'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading && <p className='groups-message'>Loading groups...</p>}
                {error && <p className='groups-error'>{error}</p>}

                {!loading && !error && filteredGroups.length > 0 && (
                    <div className='groups-grid'>
                        {filteredGroups.map((g) => (
                            <GroupCard key={g._id} group={g} currentUserId={currentUser?._id} />
                        ))}
                    </div>
                )}

                {!loading && !error && filteredGroups.length === 0 && (
                    <div className='page-empty'>
                        <p className='empty-message'>
                            {tab === 'my'
                                ? "You haven't joined any groups yet."
                                : 'No groups to discover.'}
                        </p>
                    </div>
                )}

                {modalOpen && (
                    <GroupFormModal
                        isOpen={modalOpen}
                        onClose={() => setModalOpen(false)}
                        onSubmit={handleCreate}
                        initialData={null}
                        saving={saving}
                        error={saveError}
                    />
                )}
            </div>
        </div>
    );
}
