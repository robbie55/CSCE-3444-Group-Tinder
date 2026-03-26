const BASE_URL = 'http://localhost:8000/api';

export async function sendMatchRequest(userId) {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${BASE_URL}/match/request/${userId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to send match request');
    }

    return response.json();
}

export async function getIncomingRequests() {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${BASE_URL}/match/requests/incoming`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch incoming requests');
    }

    return response.json();
}

export async function getOutgoingRequests() {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${BASE_URL}/match/requests/outgoing`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch outgoing requests');
    }

    return response.json();
}

export async function acceptMatchRequest(requestId) {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${BASE_URL}/match/requests/${requestId}/accept`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to accept match request');
    }

    return response.json();
}

export async function rejectMatchRequest(requestId) {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${BASE_URL}/match/requests/${requestId}/reject`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to reject match request');
    }

    return response.json();
}

export async function getConnections() {
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${BASE_URL}/match/connections`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch connections');
    }

    return response.json();
}
