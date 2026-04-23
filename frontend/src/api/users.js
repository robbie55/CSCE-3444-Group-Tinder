import { apiFetch } from './auth';
import { parseApiError } from './errors';

export async function getCurrentUser() {
    const res = await apiFetch('/api/users/me');
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch current user'));
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

        const detail = err.detail;
        let message = 'Failed to update profile';

        if (typeof detail === 'string') {
            message = detail;
        } else if (Array.isArray(detail)) {
            message = detail
                .map((item) => {
                    const loc = Array.isArray(item?.loc) ? item.loc : [];
                    const rawField = loc.length ? loc[loc.length - 1] : 'field';
                    const prettyField =
                        rawField === 'github'
                            ? 'GitHub URL'
                            : rawField === 'linkedin'
                              ? 'LinkedIn URL'
                              : rawField;
                    const msg = item?.msg || 'Invalid value';
                    return `${prettyField}: ${msg}`;
                })
                .join('; ');
        } else if (typeof err.message === 'string') {
            message = err.message;
        }
        throw new Error(message);
    }
    return res.json();
}
