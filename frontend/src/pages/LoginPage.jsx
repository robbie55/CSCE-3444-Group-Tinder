import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../api/auth';
import styles from './Auth.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            // TODO: redirect to dashboard after login
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
                <p className={styles.subtitle}>Connect. Collaborate. Create.</p>

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
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            placeholder='Enter your password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button className={styles.button} type='submit' disabled={loading}>
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <p className={styles.footer}>
                    Don&apos;t have an account?{' '}
                    <Link className={styles.link} to='/signup'>
                        Create an Account
                    </Link>
                </p>
            </div>
        </div>
    );
}
