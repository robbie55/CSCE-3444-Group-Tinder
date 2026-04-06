import { apiFetch } from './auth';

async function parseApiError(response, fallbackMessage) {
    const err = await response.json().catch(() => ({}));

    if (response.status === 401) {
        return 'Session expired or unauthorized. Please log in again.';
    }

    return err?.detail || fallbackMessage;
}

export async function sendMatchRequest(userId) {
    const response = await apiFetch(`/api/match/request/${userId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to send match request'));
    }

    return response.json();
}

export async function getIncomingRequests() {
    const response = await apiFetch('/api/match/requests/incoming');

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to fetch incoming requests'));
    }

    return response.json();
}

export async function getOutgoingRequests() {
    const response = await apiFetch('/api/match/requests/outgoing');

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to fetch outgoing requests'));
    }

    return response.json();
}

export async function acceptMatchRequest(requestId) {
    const response = await apiFetch(`/api/match/requests/${requestId}/accept`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to accept match request'));
    }

    return response.json();
}

export async function rejectMatchRequest(requestId) {
    const response = await apiFetch(`/api/match/requests/${requestId}/reject`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to reject match request'));
    }

    return response.json();
}

export async function getConnections() {
    const response = await apiFetch('/api/match/connections');

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to fetch connections'));
    }

    return response.json();
}
