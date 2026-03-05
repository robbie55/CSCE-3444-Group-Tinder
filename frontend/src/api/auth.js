const BASE_URL = 'http://localhost:8000';

export function getToken() {
    return localStorage.getItem('access_token');
}

export function clearToken() {
    localStorage.removeItem('access_token');
}

export async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

export async function login(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    return data;
}

export async function signup(data) {
    const res = await fetch(`${BASE_URL}/api/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Sign up failed');
    }

    const result = await res.json();
    localStorage.setItem('access_token', result.access_token);
    return result;
}
