import { apiFetch, getToken } from './auth';
import { parseApiError } from './errors';

const API_BASE_URL = 'http://localhost:8000';

export async function openOrGetConversation(otherUserId) {
    const response = await apiFetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ other_user_id: otherUserId }),
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to open conversation'));
    }

    return response.json();
}

export async function listConversations() {
    const response = await apiFetch('/api/messages/conversations');

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to fetch conversations'));
    }

    return response.json();
}

export async function getConversationMessages(conversationId, options = {}) {
    const params = new URLSearchParams();
    params.set('limit', String(options.limit ?? 50));

    if (options.before) {
        params.set('before', options.before);
    }

    const response = await apiFetch(
        `/api/messages/conversations/${conversationId}?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to fetch messages'));
    }

    return response.json();
}

export async function sendConversationMessage(conversationId, content) {
    const response = await apiFetch(`/api/messages/conversations/${conversationId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to send message'));
    }

    return response.json();
}

export function createMessagesSocket(token = getToken()) {
    if (!token) return null;

    const wsBaseUrl = API_BASE_URL.replace(/^http/i, 'ws');
    const wsUrl = `${wsBaseUrl}/api/messages/ws?token=${encodeURIComponent(token)}`;
    return new WebSocket(wsUrl);
}
