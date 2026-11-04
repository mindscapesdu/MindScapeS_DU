/**
 * MindScapeS Frontier Talk Series on Cognition - University of Delhi
 * Cryptographic Authentication & Security Module (SHA-256 + Salt + Rate Limiting + Recovery)
 */

(function (global) {
  'use strict';

  var SALT = 'mindscapes_salt_du_2026_';
  // Default hash for 'mindscapes2026' with SALT
  var DEFAULT_PASSWORD_HASH = '6377d450717de022148c2028222ff5f30706b9b2e58066b38de6249603350674';
  var DEFAULT_USERNAME = 'admin';
  var DEFAULT_RECOVERY_EMAIL = 'mindscapesdu@gmail.com';
  var MAX_ATTEMPTS = 5;
  var LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  var SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

  // Helper: SHA-256 hashing using Web Crypto API
  async function sha256(str) {
    var buffer = new TextEncoder().encode(SALT + str);
    var hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // Generate cryptographically secure random token
  function generateSecureToken() {
    var arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // Generate 6-digit OTP for recovery
  function generateOtp() {
    var arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(100000 + (arr[0] % 900000));
  }

  var AuthSecurity = {
    getUsername: function () {
      return localStorage.getItem('mindscapes_admin_username') || DEFAULT_USERNAME;
    },

    getRecoveryEmail: function () {
      return localStorage.getItem('mindscapes_recovery_email') || DEFAULT_RECOVERY_EMAIL;
    },

    setRecoveryEmail: function (email) {
      if (!email || !email.includes('@')) return false;
      localStorage.setItem('mindscapes_recovery_email', email.trim().toLowerCase());
      return true;
    },

    getPasswordHash: function () {
      return localStorage.getItem('mindscapes_password_hash') || DEFAULT_PASSWORD_HASH;
    },

    setPassword: async function (newPassword) {
      if (!newPassword || newPassword.length < 6) return false;
      var hash = await sha256(newPassword);
      localStorage.setItem('mindscapes_password_hash', hash);
      return true;
    },

    // Rate Limiting & Lockout
    getLockoutStatus: function () {
      var lockUntil = parseInt(localStorage.getItem('mindscapes_lockout_until') || '0', 10);
      var now = Date.now();
      if (lockUntil > now) {
        var remainingSec = Math.ceil((lockUntil - now) / 1000);
        return { locked: true, remainingSeconds: remainingSec };
      }
      return { locked: false, remainingSeconds: 0 };
    },

    recordFailedAttempt: function () {
      var attempts = parseInt(localStorage.getItem('mindscapes_failed_attempts') || '0', 10) + 1;
      localStorage.setItem('mindscapes_failed_attempts', attempts);
      if (attempts >= MAX_ATTEMPTS) {
        var lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem('mindscapes_lockout_until', lockUntil);
        return { locked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
      }
      return { locked: false, remainingAttempts: MAX_ATTEMPTS - attempts };
    },

    resetFailedAttempts: function () {
      localStorage.removeItem('mindscapes_failed_attempts');
      localStorage.removeItem('mindscapes_lockout_until');
    },

    // Login verification
    login: async function (username, password, remember) {
      var lock = this.getLockoutStatus();
      if (lock.locked) {
        return {
          success: false,
          error: 'Account temporarily locked due to multiple failed attempts. Please retry in ' + Math.ceil(lock.remainingSeconds / 60) + ' minute(s).'
        };
      }

      var currentUsername = this.getUsername();
      var currentHash = this.getPasswordHash();

      var inputHash = await sha256(password);

      if (username.trim().toLowerCase() === currentUsername.toLowerCase() && inputHash === currentHash) {
        this.resetFailedAttempts();
        var token = generateSecureToken();
        var expiresAt = Date.now() + SESSION_TIMEOUT_MS;

        var sessionData = {
          token: token,
          user: currentUsername,
          expiresAt: expiresAt,
          loginTime: new Date().toISOString()
        };

        var storage = remember ? localStorage : sessionStorage;
        storage.setItem('mindscapes_session', JSON.stringify(sessionData));
        // Clear old legacy keys
        localStorage.removeItem('mindscapes_admin_logged_in');
        sessionStorage.removeItem('mindscapes_admin_logged_in');

        return { success: true };
      } else {
        var failResult = this.recordFailedAttempt();
        if (failResult.locked) {
          return {
            success: false,
            error: 'Account locked for 15 minutes due to 5 consecutive failed attempts.'
          };
        } else {
          return {
            success: false,
            error: 'Invalid username or password. (' + failResult.remainingAttempts + ' attempt(s) remaining)'
          };
        }
      }
    },

    // Session validation
    checkSession: function () {
      var raw = sessionStorage.getItem('mindscapes_session') || localStorage.getItem('mindscapes_session');
      if (!raw) return null;
      try {
        var session = JSON.parse(raw);
        if (Date.now() > session.expiresAt) {
          this.logout();
          return null;
        }
        return session;
      } catch (e) {
        return null;
      }
    },

    logout: function () {
      sessionStorage.removeItem('mindscapes_session');
      localStorage.removeItem('mindscapes_session');
      localStorage.removeItem('mindscapes_admin_logged_in');
      sessionStorage.removeItem('mindscapes_admin_logged_in');
    },

    // Password Recovery Flow
    requestRecoveryOtp: function (email) {
      var currentEmail = this.getRecoveryEmail();
      if (email.trim().toLowerCase() !== currentEmail.toLowerCase()) {
        return { success: false, error: 'Email address does not match the configured recovery email.' };
      }
      var otp = generateOtp();
      var otpData = {
        otp: otp,
        email: currentEmail,
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      };
      sessionStorage.setItem('mindscapes_recovery_otp', JSON.stringify(otpData));
      return { success: true, otp: otp, email: currentEmail };
    },

    verifyOtpAndResetPassword: async function (enteredOtp, newPassword) {
      var raw = sessionStorage.getItem('mindscapes_recovery_otp');
      if (!raw) return { success: false, error: 'Recovery session expired. Please start over.' };
      try {
        var data = JSON.parse(raw);
        if (Date.now() > data.expiresAt) {
          sessionStorage.removeItem('mindscapes_recovery_otp');
          return { success: false, error: 'Recovery code expired. Please request a new code.' };
        }
        if (enteredOtp.trim() !== data.otp) {
          return { success: false, error: 'Invalid verification code. Please check and try again.' };
        }
        // Set new password
        await this.setPassword(newPassword);
        sessionStorage.removeItem('mindscapes_recovery_otp');
        this.resetFailedAttempts();
        return { success: true };
      } catch (e) {
        return { success: false, error: 'Recovery verification failed.' };
      }
    }
  };

  global.AuthSecurity = AuthSecurity;
})(window);

