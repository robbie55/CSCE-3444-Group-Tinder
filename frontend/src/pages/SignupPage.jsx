import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';
import styles from './Auth.module.css';

const MAJORS = [
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Computer Engineering', label: 'Computer Engineering' },
    { value: 'Information Technology', label: 'Information Technology' },
    { value: 'Data Science', label: 'Data Science' },
    { value: 'Cybersecurity', label: 'Cybersecurity' },
    { value: 'Other', label: 'Other' },
];

export default function SignupPage() {
    const [form, setForm] = useState({
        email: '',
        password: '',
        username: '',
        full_name: '',
        major: '',
        bio: '',
        skills: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    function update(field) {
        return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = {
                email: form.email,
                password: form.password,
                username: form.username,
                full_name: form.full_name,
                major: form.major,
            };

            if (form.bio.trim()) {
                data.bio = form.bio.trim();
            }

            if (form.skills.trim()) {
                data.skills = form.skills
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
            }

            await signup(data);
            navigate('/login', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Group Meet UNT</h1>
                <p className={styles.subtitle}>Create your account</p>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor='email'>
                            UNT Email
                        </label>
                        <input
                            id='email'
                            className={styles.input}
                            type='email'
                            placeholder='student@my.unt.edu'
                            value={form.email}
                            onChange={update('email')}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor='password'>
                            Password
                        </label>
                        <input
                            id='password'
                            className={styles.input}
                            type='password'
                            placeholder='Create a password'
                            value={form.password}
                            onChange={update('password')}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor='username'>
                            Username
                        </label>
                        <input
                            id='username'
                            className={styles.input}
                            type='text'
                            placeholder='Choose a username'
                            value={form.username}
                            onChange={update('username')}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor='full_name'>
                            Full Name
                        </label>
                        <input
                            id='full_name'
                            className={styles.input}
                            type='text'
                            placeholder='Your full name'
                            value={form.full_name}
                            onChange={update('full_name')}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor='major'>
                            Major
                        </label>
                        <select
                            id='major'
                            className={styles.select}
                            value={form.major}
                            onChange={update('major')}
                            required
                        >
                            <option value='' disabled>
                                Select your major
                            </option>
                            {MAJORS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor='bio'>
                            Bio (optional)
                        </label>
                        <textarea
                            id='bio'
                            className={styles.textarea}
                            placeholder='Tell us about yourself'
                            value={form.bio}
                            onChange={update('bio')}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor='skills'>
                            Skills (optional)
                        </label>
                        <input
                            id='skills'
                            className={styles.input}
                            type='text'
                            placeholder='e.g. React, Python, SQL'
                            value={form.skills}
                            onChange={update('skills')}
                        />
                    </div>

                    <button className={styles.button} type='submit' disabled={loading}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <p className={styles.footer}>
                    Already have an account?{' '}
                    <Link className={styles.link} to='/login'>
                        Log In
                    </Link>
                </p>
            </div>
        </div>
    );
}
