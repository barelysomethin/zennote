import React, { createContext, useContext, useState, useEffect } from 'react';
import { hashPassword, verifyPassword } from '../utils/crypto';

const AuthContext = createContext();

const STORAGE_KEY_HASH = 'zen_pass_hash';
const STORAGE_KEY_HINT = 'zen_pass_hint';
const STORAGE_KEY_AUTOLOCK = 'zen_autolock_mins';

export function AuthProvider({ children }) {
  const [hasPasswordSet, setHasPasswordSet] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [passwordHint, setPasswordHint] = useState('');
  const [autoLockMins, setAutoLockMins] = useState(0); // 0 = disabled

  useEffect(() => {
    const storedHash = localStorage.getItem(STORAGE_KEY_HASH);
    const storedHint = localStorage.getItem(STORAGE_KEY_HINT) || '';
    const storedAutoLock = localStorage.getItem(STORAGE_KEY_AUTOLOCK) || '0';

    if (storedHash) {
      setHasPasswordSet(true);
      setIsLocked(true);
      setPasswordHint(storedHint);
    } else {
      setHasPasswordSet(false);
      setIsLocked(false); // No password set yet, prompt user on setup screen or unlock
    }
    setAutoLockMins(parseInt(storedAutoLock, 10));
  }, []);

  // Auto-lock timer on idle if enabled
  useEffect(() => {
    if (!hasPasswordSet || isLocked || autoLockMins === 0) return;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
      }, autoLockMins * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [hasPasswordSet, isLocked, autoLockMins]);

  const setupPassword = async (newPassword, hint = '') => {
    const hash = await hashPassword(newPassword);
    localStorage.setItem(STORAGE_KEY_HASH, hash);
    localStorage.setItem(STORAGE_KEY_HINT, hint);
    setHasPasswordSet(true);
    setPasswordHint(hint);
    setIsLocked(false);
    return true;
  };

  const unlockApp = async (inputPassword) => {
    const storedHash = localStorage.getItem(STORAGE_KEY_HASH);
    if (!storedHash) {
      setIsLocked(false);
      return true;
    }

    const isValid = await verifyPassword(inputPassword, storedHash);
    if (isValid) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (hasPasswordSet) {
      setIsLocked(true);
    }
  };

  const changePassword = async (oldPassword, newPassword, newHint = '') => {
    const storedHash = localStorage.getItem(STORAGE_KEY_HASH);
    if (storedHash) {
      const isValid = await verifyPassword(oldPassword, storedHash);
      if (!isValid) return { success: false, message: 'Incorrect current password' };
    }

    const newHash = await hashPassword(newPassword);
    localStorage.setItem(STORAGE_KEY_HASH, newHash);
    localStorage.setItem(STORAGE_KEY_HINT, newHint);
    setPasswordHint(newHint);
    return { success: true };
  };

  const updateAutoLock = (mins) => {
    setAutoLockMins(mins);
    localStorage.setItem(STORAGE_KEY_AUTOLOCK, mins.toString());
  };

  return (
    <AuthContext.Provider
      value={{
        hasPasswordSet,
        isLocked,
        passwordHint,
        autoLockMins,
        setupPassword,
        unlockApp,
        lockApp,
        changePassword,
        updateAutoLock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
