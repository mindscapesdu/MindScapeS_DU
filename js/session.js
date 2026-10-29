/* ==========================================================================
   MindScapeS Frontier Talk Series on Cognition - Session 1 Scripts
   Handles Session 1 registration, localStorage caching, Supabase cloud sync,
   and Google Form background submission.
   ========================================================================== */

(function () {
  'use strict';

  var SUPABASE_CONFIG = {
    url: 'https://aicypxqetxjhofluwdwf.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY3lweHFldHhqaG9mbHV3ZHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjE3NDQsImV4cCI6MjEwODMzNzc0NH0.AJaqqkMCb3apx5gG8UaEDu0feeC2DKo6dU6tdzb-Aeo',
    table: 'registrations'
  };

  var GOOGLE_FORM_CONFIG = {
    actionUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc9GHa7LaAngXlcaXEmzhS1PrPtv2-zagMveQ4TSSEp_ddL7g/formResponse',
    fields: {
      name: 'entry.1928414796',
      email: 'entry.995403077',
      affiliation: 'entry.722565591',
      academic_status: 'entry.1906996205',
      sessions: 'entry.970231916',
      remarks: 'entry.189452490'
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  var regForm = document.getElementById('session-reg-form');
  var regFormWrap = document.getElementById('reg-form-wrap');
  var regConfirmWrap = document.getElementById('reg-confirm-wrap');
  var regConfirmDetails = document.getElementById('reg-confirm-details');

  // Populate from localStorage if user previously registered
  var savedReg = localStorage.getItem('mindscapes_registration');
  if (savedReg && regForm) {
    try {
      var data = JSON.parse(savedReg);
      if (data.name) document.getElementById('reg-name').value = data.name;
      if (data.email) document.getElementById('reg-email').value = data.email;
      if (data.affiliation) document.getElementById('reg-affiliation').value = data.affiliation;
      if (data.academic_status) document.getElementById('reg-status').value = data.academic_status;
      if (data.remarks) document.getElementById('reg-remarks').value = data.remarks;
    } catch (e) {}
  }

  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var existingId = localStorage.getItem('mindscapes_reg_id') || ('reg_' + Date.now());

      var regData = {
        id: existingId,
        name: document.getElementById('reg-name').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        affiliation: document.getElementById('reg-affiliation').value.trim(),
        academic_status: document.getElementById('reg-status').value,
        sessions: 'Oct 30 - Kibbe',
        remarks: document.getElementById('reg-remarks').value.trim()
      };

      // 1. LocalStorage
      localStorage.setItem('mindscapes_reg_id', regData.id);
      localStorage.setItem('mindscapes_registration', JSON.stringify(regData));

      // 2. Local/Render Backend CSV sync if running with server.py
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      }).catch(function (err) {
        console.log('Backend CSV endpoint note (safe in static mode):', err);
      });

      // 3. Supabase Cloud Database sync
      if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.url.indexOf('YOUR_SUPABASE') === -1) {
        var supabaseEndpoint = SUPABASE_CONFIG.url.replace(/\/$/, '') + '/rest/v1/' + SUPABASE_CONFIG.table + '?on_conflict=email';
        fetch(supabaseEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(regData)
        }).then(function (res) {
          console.log('Supabase sync status:', res.status);
        }).catch(function (sErr) {
          console.log('Supabase sync note:', sErr);
        });
      }

      // 4. Google Forms silent sync
      if (GOOGLE_FORM_CONFIG.actionUrl) {
        var gFormData = new URLSearchParams();
        gFormData.append(GOOGLE_FORM_CONFIG.fields.name, regData.name);
        gFormData.append(GOOGLE_FORM_CONFIG.fields.email, regData.email);
        gFormData.append(GOOGLE_FORM_CONFIG.fields.affiliation, regData.affiliation || '');
        gFormData.append(GOOGLE_FORM_CONFIG.fields.academic_status, regData.academic_status || '');
        gFormData.append(GOOGLE_FORM_CONFIG.fields.sessions, regData.sessions);
        gFormData.append(GOOGLE_FORM_CONFIG.fields.remarks, regData.remarks || '');

        fetch(GOOGLE_FORM_CONFIG.actionUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: gFormData.toString()
        }).then(function () {
          console.log('Google Form silent sync dispatched');
        }).catch(function (gErr) {
          console.log('Google Form sync note:', gErr);
        });
      }

      // Show confirmation & enable in-place edit
      if (regConfirmDetails) {
        regConfirmDetails.innerHTML =
          '<p><strong>Name:</strong> ' + escapeHtml(regData.name) + '</p>' +
          '<p><strong>Email ID:</strong> ' + escapeHtml(regData.email) + '</p>' +
          '<p><strong>Affiliation:</strong> ' + escapeHtml(regData.affiliation || '(Not specified)') + '</p>' +
          '<p><strong>Academic Status:</strong> ' + escapeHtml(regData.academic_status || '(Not specified)') + '</p>' +
          '<p><strong>Session:</strong> Friday, October 30, 2026 • 6:30 PM IST (Prof. Melissa Kibbe)</p>' +
          (regData.remarks ? '<p><strong>Remarks:</strong> ' + escapeHtml(regData.remarks) + '</p>' : '');
      }

      if (regFormWrap) regFormWrap.style.display = 'none';
      if (regConfirmWrap) regConfirmWrap.style.display = 'block';
    });
  }


})();
