export async function parseApiError(response, fallbackMessage) {
    const err = await response.json().catch(() => ({}));

    if (response.status === 401) {
        return 'Session expired or unauthorized. Please log in again.';
    }

    const detail = err?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map((item) => item?.msg || 'Invalid value').join('; ');
    }
    return fallbackMessage;
}
