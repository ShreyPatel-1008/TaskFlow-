import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectUrl = new URLSearchParams(location.search).get('redirect');

    // Wake up the Render backend as soon as the login page loads
    // so it doesn't timeout when the user clicks the login button.
    useEffect(() => {
        // We catch and ignore errors here because the goal is just to start 
        // the server spinning up, we don't care about the response.
        fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/health` : '/api/health')
            .catch(() => {});
    }, []);

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError('');
        try {
            await googleLogin(credentialResponse.credential);
            navigate(redirectUrl || '/');
        } catch (err) {
            setError(err.response?.data?.message || 'Google Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate(redirectUrl || '/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout-wrapper">
            <div className="auth-hero-section">
                <div className="auth-hero-content">
                    <h1 className="auth-hero-title">
                        Manage tasks.<br />
                        Track progress.<br />
                        <span>Achieve more.</span>
                    </h1>
                    <p className="auth-hero-subtitle">
                        The all-in-one task management platform designed for deep work and high-output productivity.
                    </p>
                </div>
                <div className="auth-preview-cards">
                    <div className="auth-preview-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }}></div>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>Design System Update</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', width: '100%', marginBottom: '8px' }}>
                            <div style={{ height: '100%', background: 'var(--color-success)', borderRadius: '2px', width: '100%' }}></div>
                        </div>
                    </div>
                    <div className="auth-preview-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }}></div>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>API Refactoring</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', width: '100%', marginBottom: '8px' }}>
                            <div style={{ height: '100%', background: 'var(--color-warning)', borderRadius: '2px', width: '45%' }}></div>
                        </div>
                    </div>
                    <div className="auth-preview-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-info)' }}></div>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>User Research Interviews</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', width: '100%', marginBottom: '8px' }}>
                            <div style={{ height: '100%', background: 'var(--color-info)', borderRadius: '2px', width: '15%' }}></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="auth-form-section">
                <div className="auth-container">
                    <div className="auth-card">
                        <div className="auth-logo">
                            <div className="auth-logo-icon">⚡</div>
                            <h2>TaskFlow</h2>
                        </div>

                        <h3 className="auth-title">Welcome Back</h3>
                        <p className="auth-subtitle">Sign in to continue your productivity journey</p>

                        {error && <div className="auth-error">{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="login-email"
                                        type="email"
                                        className="form-input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        style={{ paddingLeft: '40px' }}
                                    />
                                    <Mail size={16} style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: 'var(--text-muted)'
                                    }} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        style={{ paddingLeft: '40px', paddingRight: '40px' }}
                                    />
                                    <Lock size={16} style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: 'var(--text-muted)'
                                    }} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: '12px', top: '50%',
                                            transform: 'translateY(-50%)', background: 'none',
                                            border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                                        }}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button id="login-submit" type="submit" className="btn btn-primary btn-lg" disabled={loading}
                                style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
                                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                                <span style={{ padding: '0 10px', fontSize: '14px', fontWeight: 500 }}>OR</span>
                                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google Login was unsuccessful.')}
                                    width="100%"
                                />
                            </div>
                        </form>

                        <div className="auth-footer">
                            Don't have an account? <Link to="/register">Create one</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
