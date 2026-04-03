import { apiFetch } from './auth';

export async function fetchGroups() {
    const res = await apiFetch('/api/groups/');

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch groups');
    }

    return res.json();
}

export async function fetchGroup(groupId) {
    const res = await apiFetch(`/api/groups/${groupId}`);

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch group');
    }

    return res.json();
}

export async function createGroup(data) {
    const res = await apiFetch('/api/groups/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.detail;
        let message = 'Failed to create group';

        if (typeof detail === 'string') {
            message = detail;
        } else if (Array.isArray(detail)) {
            message = detail.map((item) => item?.msg || 'Invalid value').join('; ');
        }
        throw new Error(message);
    }

    return res.json();
}

export async function updateGroup(groupId, data) {
    const res = await apiFetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.detail;
        let message = 'Failed to update group';

        if (typeof detail === 'string') {
            message = detail;
        } else if (Array.isArray(detail)) {
            message = detail.map((item) => item?.msg || 'Invalid value').join('; ');
        }
        throw new Error(message);
    }

    return res.json();
}

export async function deleteGroup(groupId) {
    const res = await apiFetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete group');
    }

    return res.json();
}

export async function joinGroup(groupId) {
    const res = await apiFetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to join group');
    }

    return res.json();
}

export async function leaveGroup(groupId) {
    const res = await apiFetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to leave group');
    }

    return res.json();
}
