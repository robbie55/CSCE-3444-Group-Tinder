import { PropTypes } from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConnections } from '../api/match';
import './ConnectionPicker.css';

function initialsOf(fullName) {
    return (
        (fullName ?? '')
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .join('')
            .toUpperCase() || 'U'
    );
}

export default function ConnectionPicker({
    mode,
    excludeUserIds = [],
    maxSelectable,
    selectedIds = [],
    onChange,
    onSelect,
    actionLabel = 'Add',
    busyUserId = null,
}) {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const list = await getConnections();
                if (!cancelled) setConnections(list);
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const excludeSet = useMemo(() => new Set(excludeUserIds), [excludeUserIds]);
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const visible = useMemo(
        () => connections.filter((u) => !excludeSet.has(u._id)),
        [connections, excludeSet]
    );

    const toggle = (userId) => {
        if (mode !== 'multi') return;
        const isSelected = selectedSet.has(userId);
        if (isSelected) {
            onChange(selectedIds.filter((id) => id !== userId));
            return;
        }
        if (maxSelectable != null && selectedIds.length >= maxSelectable) return;
        onChange([...selectedIds, userId]);
    };

    if (loading) {
        return <p className='connection-picker-msg'>Loading connections...</p>;
    }

    if (error) {
        return <p className='connection-picker-error'>{error}</p>;
    }

    if (visible.length === 0) {
        return (
            <div className='connection-picker-empty'>
                <p>No connections available.</p>
                <Link to='/search' className='connection-picker-link'>
                    Match with someone first →
                </Link>
            </div>
        );
    }

    return (
        <ul className='connection-picker-list'>
            {visible.map((u) => {
                const isSelected = selectedSet.has(u._id);
                const atCap =
                    mode === 'multi' &&
                    maxSelectable != null &&
                    !isSelected &&
                    selectedIds.length >= maxSelectable;
                const isBusy = busyUserId === u._id;
                return (
                    <li key={u._id} className='connection-picker-row'>
                        <div className='connection-picker-avatar'>{initialsOf(u.full_name)}</div>
                        <div className='connection-picker-meta'>
                            <span className='connection-picker-name'>{u.full_name}</span>
                            <span className='connection-picker-username'>{u.username}</span>
                        </div>
                        {mode === 'multi' ? (
                            <label className='connection-picker-check'>
                                <input
                                    type='checkbox'
                                    checked={isSelected}
                                    disabled={atCap}
                                    onChange={() => toggle(u._id)}
                                />
                                <span>{isSelected ? 'Added' : 'Add'}</span>
                            </label>
                        ) : (
                            <button
                                type='button'
                                className='connection-picker-btn'
                                onClick={() => onSelect(u._id)}
                                disabled={isBusy}
                            >
                                {isBusy ? 'Adding...' : actionLabel}
                            </button>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

ConnectionPicker.propTypes = {
    mode: PropTypes.oneOf(['multi', 'single']).isRequired,
    excludeUserIds: PropTypes.arrayOf(PropTypes.string),
    maxSelectable: PropTypes.number,
    selectedIds: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func,
    onSelect: PropTypes.func,
    actionLabel: PropTypes.string,
    busyUserId: PropTypes.string,
};
