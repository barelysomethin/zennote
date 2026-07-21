import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, KeyRound, ArrowRight, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';

export function LockScreen() {
  const { hasPasswordSet, isLocked, passwordHint, setupPassword, unlockApp } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hintInput, setHintInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [showHint, setShowHint] = useState(false);

  if (!isLocked && hasPasswordSet) return null;

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!password || password.length < 3) {
      triggerError('Password must be at least 3 characters long');
      return;
    }
    if (password !== confirmPassword) {
      triggerError('Passwords do not match');
      return;
    }

    await setupPassword(password, hintInput);
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    const success = await unlockApp(password);
    if (!success) {
      triggerError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="lock-screen-overlay">
      <div className={`lock-card ${shake ? 'shake' : ''}`}>
        <div className="lock-icon-container">
          {hasPasswordSet ? <Lock size={30} /> : <ShieldCheck size={32} />}
        </div>

        {!hasPasswordSet ? (
          <>
            <h2 className="lock-title">Create Password</h2>
            <p className="lock-subtitle">
              Set a personal master password to protect your notes locally on this device.
            </p>

            <form onSubmit={handleSetup} className="lock-input-group">
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  className="lock-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                className="lock-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <input
                type="text"
                placeholder="Password Hint (Optional)"
                className="lock-input"
                style={{ fontSize: '0.85rem', letterSpacing: 'normal' }}
                value={hintInput}
                onChange={(e) => setHintInput(e.target.value)}
              />

              {error && <div className="lock-error">{error}</div>}

              <button type="submit" className="lock-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Set Password & Unlock <ArrowRight size={18} />
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="lock-title">ZenNote Locked</h2>
            <p className="lock-subtitle">Enter your passcode to open your private workspace.</p>

            <form onSubmit={handleUnlock} className="lock-input-group">
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  className="lock-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && <div className="lock-error">{error}</div>}

              <button type="submit" className="lock-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Unlock Workspace <KeyRound size={18} />
              </button>
            </form>

            {passwordHint && (
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => setShowHint(!showHint)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <HelpCircle size={14} /> {showHint ? 'Hide Hint' : 'Show Password Hint'}
                </button>
                {showHint && <div className="hint-text">Hint: {passwordHint}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
