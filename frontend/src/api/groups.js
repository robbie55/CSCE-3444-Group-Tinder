import { apiFetch } from './auth';
import { parseApiError } from './errors';

export async function fetchGroups() {
    const res = await apiFetch('/api/groups/');
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch groups'));
    return res.json();
}

export async function fetchGroup(groupId) {
    const res = await apiFetch(`/api/groups/${groupId}`);
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch group'));
    return res.json();
}

export async function createGroup(data) {
    const res = await apiFetch('/api/groups/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to create group'));
    return res.json();
}

export async function updateGroup(groupId, data) {
    const res = await apiFetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update group'));
    return res.json();
}

export async function deleteGroup(groupId) {
    const res = await apiFetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to delete group'));
    return res.json();
}

export async function joinGroup(groupId) {
    const res = await apiFetch(`/api/groups/${groupId}/join`, { method: 'POST' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to join group'));
    return res.json();
}

export async function leaveGroup(groupId) {
    const res = await apiFetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to leave group'));
    return res.json();
}

export async function addGroupMember(groupId, userId) {
    const res = await apiFetch(`/api/groups/${groupId}/members/${userId}`, { method: 'POST' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to add member'));
    return res.json();
}
