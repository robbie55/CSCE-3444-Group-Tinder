import { useState } from 'react';
import { PropTypes } from 'prop-types';
import ConnectionPicker from './ConnectionPicker.jsx';
import Modal from './Modal.jsx';
import './GroupFormModal.css';

function buildInitialDraft(initialData) {
    if (!initialData) {
        return { name: '', description: '', course_code: '', max_members: 5, tagsText: '' };
    }
    return {
        name: initialData.name || '',
        description: initialData.description || '',
        course_code: initialData.course_code || '',
        max_members: initialData.max_members ?? 5,
        tagsText: (initialData.tags ?? []).join(', '),
    };
}

export default function GroupFormModal({ isOpen, onClose, onSubmit, initialData, saving, error }) {
    const [draft, setDraft] = useState(() => buildInitialDraft(initialData));
    const [inviteUserIds, setInviteUserIds] = useState([]);

    const isEdit = !!initialData;
    const parsedMaxMembers = parseInt(draft.max_members, 10) || 5;
    const maxInvites = Math.max(0, parsedMaxMembers - 1);

    const handleChange = (field) => (e) => {
        setDraft((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const tags = draft.tagsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        const payload = {
            name: draft.name.trim(),
            description: draft.description.trim(),
            course_code: draft.course_code.trim() || null,
            max_members: parsedMaxMembers,
            tags,
        };
        if (!isEdit) {
            payload.invite_user_ids = inviteUserIds.slice(0, maxInvites);
        }
        onSubmit(payload);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Group' : 'Create Group'}>
            <form onSubmit={handleSubmit}>
                <div className='group-form-field'>
                    <label className='group-form-label'>
                        Name <span className='required'>*</span>
                    </label>
                    <input
                        className='group-form-input'
                        type='text'
                        value={draft.name}
                        onChange={handleChange('name')}
                        required
                    />
                </div>

                <div className='group-form-field'>
                    <label className='group-form-label'>
                        Description <span className='required'>*</span>
                    </label>
                    <textarea
                        className='group-form-textarea'
                        value={draft.description}
                        onChange={handleChange('description')}
                        rows={3}
                        required
                    />
                </div>

                <div className='group-form-field'>
                    <label className='group-form-label'>Course Code</label>
                    <input
                        className='group-form-input'
                        type='text'
                        value={draft.course_code}
                        onChange={handleChange('course_code')}
                        placeholder='e.g. CSCE 3444'
                    />
                </div>

                <div className='group-form-field'>
                    <label className='group-form-label'>Max Members</label>
                    <input
                        className='group-form-input'
                        type='number'
                        value={draft.max_members}
                        onChange={handleChange('max_members')}
                        min={2}
                        max={10}
                    />
                </div>

                <div className='group-form-field'>
                    <label className='group-form-label'>Tags</label>
                    <input
                        className='group-form-input'
                        type='text'
                        value={draft.tagsText}
                        onChange={handleChange('tagsText')}
                        placeholder='e.g. Capstone, Study Group'
                    />
                </div>

                {!isEdit && (
                    <div className='group-form-field'>
                        <label className='group-form-label'>
                            Add connections{' '}
                            <span className='group-form-hint'>
                                ({inviteUserIds.length}/{maxInvites})
                            </span>
                        </label>
                        <ConnectionPicker
                            mode='multi'
                            maxSelectable={maxInvites}
                            selectedIds={inviteUserIds}
                            onChange={setInviteUserIds}
                        />
                    </div>
                )}

                {error && <p className='group-form-error'>{error}</p>}

                <div className='modal-actions'>
                    <button
                        className='modal-btn modal-btn-secondary'
                        type='button'
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button className='modal-btn modal-btn-primary' type='submit' disabled={saving}>
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Group'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

GroupFormModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    initialData: PropTypes.shape({
        name: PropTypes.string,
        description: PropTypes.string,
        course_code: PropTypes.string,
        max_members: PropTypes.number,
        tags: PropTypes.arrayOf(PropTypes.string),
    }),
    saving: PropTypes.bool,
    error: PropTypes.string,
};
