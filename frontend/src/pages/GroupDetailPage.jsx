import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    addGroupMember,
    deleteGroup,
    fetchGroup,
    joinGroup,
    leaveGroup,
    updateGroup,
} from '../api/groups';
import { getCurrentUser } from '../api/users';
import ConnectionPicker from '../components/ConnectionPicker.jsx';
import GroupFormModal from '../components/GroupFormModal.jsx';
import Modal from '../components/Modal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import './GroupDetailPage.css';

export default function GroupDetailPage() {
    const { groupId } = useParams();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [invitingUserId, setInvitingUserId] = useState(null);
    const [inviteError, setInviteError] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [groupData, user] = await Promise.all([
                    fetchGroup(groupId),
                    getCurrentUser(),
                ]);
                setGroup(groupData);
                setCurrentUser(user);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [groupId]);

    const isOwner = currentUser && group && group.created_by === currentUser._id;
    const isMember =
        currentUser && group && (group.members ?? []).some((m) => m._id === currentUser._id);
    const isFull = group && (group.members ?? []).length >= group.max_members;

    const handleJoin = async () => {
        setActionLoading(true);
        setActionError('');
        try {
            const updated = await joinGroup(groupId);
            setGroup(updated);
        } catch (err) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeave = async () => {
        setActionLoading(true);
        setActionError('');
        try {
            const updated = await leaveGroup(groupId);
            setGroup(updated);
        } catch (err) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        setActionLoading(true);
        setActionError('');
        try {
            await deleteGroup(groupId);
            navigate('/groups');
        } catch (err) {
            setActionError(err.message);
            setActionLoading(false);
        }
    };

    const handleInvite = async (userId) => {
        setInvitingUserId(userId);
        setInviteError('');
        try {
            const updated = await addGroupMember(groupId, userId);
            setGroup(updated);
            setInviteModalOpen(false);
        } catch (err) {
            setInviteError(err.message);
        } finally {
            setInvitingUserId(null);
        }
    };

    const handleEdit = async (data) => {
        setSaving(true);
        setSaveError('');
        try {
            const updated = await updateGroup(groupId, data);
            setGroup(updated);
            setEditModalOpen(false);
        } catch (err) {
            setSaveError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className='page'>
                <div className='page-sidebar'>
                    <Sidebar />
                </div>
                <div className='page-content'>
                    <p className='detail-message'>Loading group...</p>
                </div>
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className='page'>
                <div className='page-sidebar'>
                    <Sidebar />
                </div>
                <div className='page-content'>
                    <p className='detail-error'>{error || 'Group not found.'}</p>
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
                <button className='detail-back' onClick={() => navigate('/groups')}>
                    &larr; Back to Groups
                </button>

                <div className='group-detail'>
                    <div className='group-detail-info'>
                        <div className='group-detail-header'>
                            <h1 className='group-detail-name'>{group.name}</h1>
                            {group.course_code && (
                                <span className='group-detail-course'>{group.course_code}</span>
                            )}
                        </div>

                        <p className='group-detail-description'>{group.description}</p>

                        {(group.tags ?? []).length > 0 && (
                            <div className='group-detail-tags'>
                                {group.tags.map((tag) => (
                                    <span key={tag} className='skill-badge'>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className='group-members-section'>
                            <h2 className='group-members-title'>
                                Members ({(group.members ?? []).length}/{group.max_members})
                            </h2>
                            <div className='group-members-list'>
                                {(group.members ?? []).map((m) => (
                                    <div key={m._id} className='group-member-row'>
                                        <div className='group-member-avatar'>
                                            {(m.full_name ?? 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span className='group-member-name'>{m.full_name}</span>
                                        {m._id === group.created_by && (
                                            <span className='group-owner-badge'>Owner</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {actionError && <p className='detail-error'>{actionError}</p>}

                        <div className='group-detail-actions'>
                            {!isMember && !isFull && (
                                <button
                                    className='modal-btn modal-btn-primary'
                                    onClick={handleJoin}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Joining...' : 'Join Group'}
                                </button>
                            )}
                            {!isMember && isFull && (
                                <button className='modal-btn modal-btn-disabled' disabled>
                                    Group Full
                                </button>
                            )}
                            {isMember && !isOwner && (
                                <button
                                    className='modal-btn modal-btn-secondary'
                                    onClick={handleLeave}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Leaving...' : 'Leave Group'}
                                </button>
                            )}
                            {isOwner && (
                                <>
                                    <button
                                        className='modal-btn modal-btn-primary'
                                        onClick={() => {
                                            setInviteError('');
                                            setInviteModalOpen(true);
                                        }}
                                        disabled={isFull}
                                    >
                                        {isFull ? 'Group Full' : 'Add Member'}
                                    </button>
                                    <button
                                        className='modal-btn modal-btn-secondary'
                                        onClick={() => {
                                            setSaveError('');
                                            setEditModalOpen(true);
                                        }}
                                    >
                                        Edit Group
                                    </button>
                                    <button
                                        className='modal-btn modal-btn-danger'
                                        onClick={() => {
                                            setActionError('');
                                            setDeleteModalOpen(true);
                                        }}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Deleting...' : 'Delete Group'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className='group-detail-chat'>
                        <div className='chat-placeholder'>
                            <p>Group chat coming soon</p>
                        </div>
                    </div>
                </div>

                {editModalOpen && (
                    <GroupFormModal
                        isOpen={editModalOpen}
                        onClose={() => setEditModalOpen(false)}
                        onSubmit={handleEdit}
                        initialData={group}
                        saving={saving}
                        error={saveError}
                    />
                )}

                <Modal
                    isOpen={inviteModalOpen}
                    onClose={() => setInviteModalOpen(false)}
                    title='Add Member'
                >
                    {inviteError && <p className='group-form-error'>{inviteError}</p>}
                    <ConnectionPicker
                        mode='single'
                        excludeUserIds={(group.members ?? []).map((m) => m._id)}
                        onSelect={handleInvite}
                        actionLabel='Add'
                        busyUserId={invitingUserId}
                    />
                </Modal>

                <Modal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    title='Delete Group?'
                    disableClose={actionLoading}
                >
                    <p className='delete-confirm-message'>
                        Are you sure you want to delete &ldquo;{group.name}&rdquo;? This can&rsquo;t
                        be undone.
                    </p>

                    {actionError && <p className='group-form-error'>{actionError}</p>}

                    <div className='modal-actions'>
                        <button
                            className='modal-btn modal-btn-secondary'
                            type='button'
                            onClick={() => setDeleteModalOpen(false)}
                            disabled={actionLoading}
                        >
                            Cancel
                        </button>
                        <button
                            className='modal-btn modal-btn-danger'
                            type='button'
                            onClick={handleDelete}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Deleting...' : 'Delete Group'}
                        </button>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
