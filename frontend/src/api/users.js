import { apiFetch } from './auth';

export async function getCurrentUser() {
    const res = await apiFetch('/api/users/me');

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch current user');
    }

    return res.json();
}

export async function updateCurrentUser(partialUpdate) {
    const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialUpdate),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update profile');
    }

    return res.json();
}
