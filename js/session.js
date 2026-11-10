/* ==========================================================================
   MindScapeS Frontier Talk Series on Cognition - University of Delhi
   Client Scripts: Navigation, Form Sync (LocalStorage, Server CSV, Supabase, Google Form)
   ========================================================================== */

(function () {
  'use strict';

  // Mobile Navigation Menu Toggle
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Supabase Configuration
  var SUPABASE_CONFIG = {
    url: 'https://aicypxqetxjhofluwdwf.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY3lweHFldHhqaG9mbHV3ZHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjE3NDQsImV4cCI6MjEwODMzNzc0NH0.AJaqqkMCb3apx5gG8UaEDu0feeC2DKo6dU6tdzb-Aeo',
    table: 'registrations'
  };

  // Google Forms Configuration
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

  // Helpers for Failproof Document Retrieval & Abstract Sanitization
  function cleanAbstract(raw) {
    if (!raw) return '';
    return raw.replace(/<!--MINDSCAPES_DOCS:[\s\S]*?-->/g, '').trim();
  }

  function extractTalkDocs(talk, docsConfigMap) {
    if (!talk) return { papers: [], handouts: [] };
    var papers = [];
    var handouts = [];

    // 1. In-memory arrays
    if (Array.isArray(talk.papers) && talk.papers.length > 0) {
      papers = talk.papers.filter(function (p) { return p && p.url; });
    }
    if (Array.isArray(talk.handouts) && talk.handouts.length > 0) {
      handouts = talk.handouts.filter(function (h) { return h && h.url; });
    }

    // 2. JSON strings
    if (papers.length === 0 && talk.papers_json) {
      try {
        var pj = JSON.parse(talk.papers_json);
        if (Array.isArray(pj)) papers = pj.filter(function (p) { return p && p.url; });
      } catch (e) {}
    }
    if (handouts.length === 0 && talk.handouts_json) {
      try {
        var hj = JSON.parse(talk.handouts_json);
        if (Array.isArray(hj)) handouts = hj.filter(function (h) { return h && h.url; });
      } catch (e) {}
    }

    // 3. Embedded in talk.abstract <!--MINDSCAPES_DOCS:...-->
    if ((papers.length === 0 || handouts.length === 0) && talk.abstract) {
      var match = talk.abstract.match(/<!--MINDSCAPES_DOCS:([\s\S]*?)-->/);
      if (match && match[1]) {
        try {
          var parsed = JSON.parse(match[1]);
          if (papers.length === 0 && Array.isArray(parsed.papers)) {
            papers = parsed.papers.filter(function (p) { return p && p.url; });
          }
          if (handouts.length === 0 && Array.isArray(parsed.handouts)) {
            handouts = parsed.handouts.filter(function (h) { return h && h.url; });
          }
        } catch (e) {}
      }
    }

    // 4. From docsConfigMap (from config-talk-docs row in Supabase)
    if ((papers.length === 0 || handouts.length === 0) && docsConfigMap && docsConfigMap[talk.id]) {
      var conf = docsConfigMap[talk.id];
      if (papers.length === 0 && Array.isArray(conf.papers)) {
        papers = conf.papers.filter(function (p) { return p && p.url; });
      }
      if (handouts.length === 0 && Array.isArray(conf.handouts)) {
        handouts = conf.handouts.filter(function (h) { return h && h.url; });
      }
    }

    // 5. Fallback legacy single fields
    if (papers.length === 0 && talk.paper_url) {
      papers.push({ title: talk.paper_title || talk.reading_title || 'Research Paper', url: talk.paper_url });
    }
    if (handouts.length === 0 && talk.handout_url) {
      handouts.push({ title: talk.handout_title || 'Seminar Handout', url: talk.handout_url });
    }
    if (papers.length === 0 && handouts.length === 0 && talk.reading_url) {
      if ((talk.reading_title || '').toLowerCase().includes('handout') || (talk.reading_url || '').toLowerCase().includes('handout')) {
        handouts.push({ title: talk.reading_title || 'Seminar Handout', url: talk.reading_url });
      } else {
        papers.push({ title: talk.reading_title || 'Prep Reading', url: talk.reading_url });
      }
    }

    return { papers: papers, handouts: handouts };
  }

  var regForm = document.getElementById('session-reg-form');
  var regFormWrap = document.getElementById('reg-form-wrap');
  var regConfirmWrap = document.getElementById('reg-confirm-wrap');
  var regConfirmDetails = document.getElementById('reg-confirm-details');

  // Clear any past registration info from browser storage to ensure privacy & clean forms
  try {
    localStorage.removeItem('mindscapes_registration');
    localStorage.removeItem('mindscapes_reg_id');
  } catch (e) { }

  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var regId = 'reg_' + Date.now();
      var selectedSession = document.getElementById('reg-session') ? document.getElementById('reg-session').value : 'Nov 6 - Schellenberg (Session 2)';

      var regData = {
        id: regId,
        name: document.getElementById('reg-name').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        affiliation: document.getElementById('reg-affiliation') ? document.getElementById('reg-affiliation').value.trim() : '',
        academic_status: document.getElementById('reg-status') ? document.getElementById('reg-status').value : '',
        sessions: selectedSession,
        remarks: document.getElementById('reg-remarks') ? document.getElementById('reg-remarks').value.trim() : ''
      };

      // 1. Local / Render Backend CSV sync
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      }).catch(function (err) {
        console.log('CSV sync note (safe in static mode):', err);
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

      // 4. Google Forms silent background submission
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

      // 5. Update UI with confirmation & Zoom access details
      if (regConfirmDetails) {
        regConfirmDetails.innerHTML =
          '<p><strong>Name:</strong> ' + escapeHtml(regData.name) + '</p>' +
          '<p><strong>Email ID:</strong> ' + escapeHtml(regData.email) + '</p>' +
          '<p><strong>Affiliation:</strong> ' + escapeHtml(regData.affiliation || '(Not specified)') + '</p>' +
          '<p><strong>Academic Status:</strong> ' + escapeHtml(regData.academic_status || '(Not specified)') + '</p>' +
          '<p><strong>Registered Session:</strong> ' + escapeHtml(regData.sessions) + '</p>' +
          (regData.remarks ? '<p><strong>Remarks / Question:</strong> ' + escapeHtml(regData.remarks) + '</p>' : '');
      }

      // Dynamic Zoom Credentials presentation based on chosen session
      var regSelectEl = document.getElementById('reg-session');
      var selectedOpt = regSelectEl && regSelectEl.options[regSelectEl.selectedIndex];
      var zoomId = selectedOpt ? selectedOpt.getAttribute('data-zoom-id') : '';
      var zoomPass = selectedOpt ? selectedOpt.getAttribute('data-zoom-pass') : '';
      var zoomLink = selectedOpt ? selectedOpt.getAttribute('data-zoom-link') : '';
      var zoomNote = selectedOpt ? selectedOpt.getAttribute('data-zoom-note') : '';

      var confZoomId = document.getElementById('conf-zoom-id');
      var confZoomPass = document.getElementById('conf-zoom-pass');
      var confZoomLink = document.getElementById('conf-zoom-link');
      var confZoomNote = document.getElementById('conf-zoom-note');
      var confZoomDetails = document.getElementById('conf-zoom-details');

      var hideZoomOpt = selectedOpt && selectedOpt.getAttribute('data-hide-zoom') === 'true';

      if (confZoomDetails) {
        if (!hideZoomOpt && (zoomId || zoomLink)) {
          if (confZoomId) confZoomId.textContent = zoomId || 'Check registered email';
          if (confZoomPass) confZoomPass.textContent = zoomPass || 'None';
          if (confZoomNote) {
            confZoomNote.textContent = zoomNote || '';
            confZoomNote.style.display = zoomNote ? 'block' : 'none';
          }
          if (confZoomLink) {
            if (zoomLink) {
              confZoomLink.href = zoomLink;
              confZoomLink.style.display = 'inline-block';
            } else {
              confZoomLink.style.display = 'none';
            }
          }
        } else {
          var noticeText = hideZoomOpt
            ? '<strong>Restricted Access Session:</strong> Zoom meeting credentials are kept confidential and will be shared directly with verified registrants at <strong>' + escapeHtml(regData.email) + '</strong> before the session starts.'
            : '<strong>Zoom credentials in preparation:</strong> Meeting links will be emailed directly to <strong>' + escapeHtml(regData.email) + '</strong> before this colloquium commences.';
          confZoomDetails.innerHTML = '<p style="margin: 0.35rem 0; font-family: var(--font-sans); font-size: 0.94rem; color: #1e3a8a;">' + noticeText + '</p>';
        }
      }

      if (regFormWrap) regFormWrap.style.display = 'none';
      if (regConfirmWrap) regConfirmWrap.style.display = 'block';
    });
  }

  // ===== Abstract Modal System =====
  function bindModalEvents() {
    var modalButtons = document.querySelectorAll('[data-modal-target]');
    modalButtons.forEach(function (btn) {
      // Remove prior listener to prevent duplicates
      btn.onclick = function () {
        var targetId = btn.getAttribute('data-modal-target');
        var modal = document.getElementById(targetId);
        if (modal) {
          modal.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
      };
    });

    document.querySelectorAll('.abstract-modal-backdrop').forEach(function (backdrop) {
      backdrop.onclick = function (e) {
        if (e.target === backdrop) closeAllModals();
      };
      var closeBtn = backdrop.querySelector('.modal-close-btn');
      if (closeBtn) {
        closeBtn.onclick = function () {
          closeAllModals();
        };
      }
    });

    document.querySelectorAll('.modal-reg-link').forEach(function (link) {
      link.onclick = function () {
        closeAllModals();
      };
    });
  }

  function closeAllModals() {
    var openModals = document.querySelectorAll('.abstract-modal-backdrop.open');
    openModals.forEach(function (m) {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  function ensureModalExists(talk) {
    var modalId = 'modal-' + talk.id;
    var existing = document.getElementById(modalId);
    var cleanAbs = cleanAbstract(talk.abstract);
    var paragraphs = (cleanAbs || '').split('\n\n').filter(function (p) { return p.trim().length > 0; });
    var abstractHtml = paragraphs.map(function (p) { return '<p style="font-size: 0.96rem; line-height: 1.65; margin-bottom: 0.85rem;">' + escapeHtml(p) + '</p>'; }).join('') || '<p>Abstract in preparation.</p>';

    var docs = extractTalkDocs(talk);
    var readingBtns = [];
    docs.papers.forEach(function (p, pIdx) {
      if (p && p.url) {
        var label = p.title ? ('Paper: ' + (p.title.length > 28 ? p.title.substring(0, 26) + '...' : p.title)) : ('Download Paper ' + (docs.papers.length > 1 ? (pIdx + 1) : '') + ' (PDF)');
        readingBtns.push('<a href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="margin-right: 0.5rem; margin-bottom: 0.4rem;">' + escapeHtml(label) + '</a>');
      }
    });
    docs.handouts.forEach(function (h, hIdx) {
      if (h && h.url) {
        var label = h.title ? ('Handout: ' + (h.title.length > 28 ? h.title.substring(0, 26) + '...' : h.title)) : ('Download Handout ' + (docs.handouts.length > 1 ? (hIdx + 1) : '') + ' (PDF)');
        readingBtns.push('<a href="' + escapeHtml(h.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="margin-right: 0.5rem; margin-bottom: 0.4rem;">' + escapeHtml(label) + '</a>');
      }
    });
    var readingHtml = readingBtns.join(' ');

    var registerHtml = '';
    if (talk.has_register) {
      registerHtml = '<a href="#register" class="btn btn-gold btn-sm modal-reg-link" data-register-target="' + escapeHtml(talk.id) + '">Register for this Session &darr;</a>';
    }

    var statusBadgeClass = talk.status === 'concluded' ? 'completed' : 'upcoming';
    var statusBadgeText = talk.status === 'concluded' ? 'Concluded' : (talk.status === 'active' ? 'Active' : 'Upcoming');

    var modalContent = `
      <div class="abstract-modal">
        <button type="button" class="modal-close-btn" aria-label="Close abstract">&times;</button>
        <span class="status-badge ${statusBadgeClass}" style="margin-bottom: 0.5rem; display: inline-block;">${statusBadgeText} &bull; Session ${talk.session_number || ''}</span>
        <h3 style="margin: 0.5rem 0 0.35rem; font-size: 1.35rem; color: #0c1a2e;">${escapeHtml(talk.title)}</h3>
        <p style="margin: 0 0 1rem; font-family: var(--font-sans); font-size: 0.92rem; color: #64748b;">
          <strong>${escapeHtml(talk.speaker_name)}</strong> ${talk.speaker_affiliation ? '&bull; ' + escapeHtml(talk.speaker_affiliation) : ''}
        </p>
        <div style="background: var(--card-bg); padding: 1.25rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 1.25rem;">
          <h4 style="margin: 0 0 0.5rem; font-size: 1.05rem; color: var(--accent-color);">Abstract</h4>
          ${abstractHtml}
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          ${registerHtml}
          ${readingHtml}
        </div>
      </div>
    `;

    if (!existing) {
      var backdrop = document.createElement('div');
      backdrop.className = 'abstract-modal-backdrop';
      backdrop.id = modalId;
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.innerHTML = modalContent;
      document.body.appendChild(backdrop);
    } else {
      existing.innerHTML = modalContent;
    }
  }

  // ===== Dynamic Schedule Synchronization (Supabase & LocalStorage) =====
  function initDynamicSchedule() {
    var tableBody = document.querySelector('.programme-table tbody');
    if (!tableBody) return;

    function renderDynamicTable(talks) {
      if (!Array.isArray(talks) || talks.length === 0) return;
      var schedTalks = talks.filter(function(t) { return t.id !== 'config-homepage-poster' && !t.id.startsWith('config-'); });
      schedTalks.sort(function (a, b) { return (a.session_number || 0) - (b.session_number || 0); });

      var newRowsHtml = '';
      schedTalks.forEach(function (talk) {
        var timeHtml = escapeHtml(talk.time_display || '').replace(/\n/g, '<br>');

        // Filter out any format line containing TBA
        var formatLines = (talk.format_commentators || '')
          .split('\n')
          .map(function (s) { return s.trim(); })
          .filter(function (s) { return s.length > 0 && !/\bTBA\b/i.test(s); });

        var formatHtml = '';
        if (formatLines.length > 0) {
          formatHtml = '<ol class="sched-format-list">' +
            formatLines.map(function (line) { return '<li>' + escapeHtml(line) + '</li>'; }).join('') +
            '</ol>';
        }

        var actionsHtml = '<span class="sched-empty-action">&mdash;</span>';
        var actionBtns = [];
        if (!talk.hide_zoom) {
          if (talk.zoom_link) {
            actionBtns.push('<a href="' + escapeHtml(talk.zoom_link) + '" target="_blank" rel="noopener noreferrer" class="btn-table-zoom">Join Zoom</a>');
          } else if (talk.status === 'active' || talk.id === 'session-2') {
            actionBtns.push('<a href="https://us04web.zoom.us/launch/jc/78997015908" target="_blank" rel="noopener noreferrer" class="btn-table-zoom">Join Zoom</a>');
          }
        }
        if (talk.has_abstract) {
          actionBtns.push('<button type="button" class="btn-table-outline" data-modal-target="modal-' + escapeHtml(talk.id) + '">View Abstract</button>');
        }
        if (talk.has_register) {
          actionBtns.push('<a href="#register" class="btn-table-primary" data-register-target="' + escapeHtml(talk.id) + '">Register</a>');
        }
        if (actionBtns.length > 0) {
          actionsHtml = '<div class="sched-actions">' + actionBtns.join('') + '</div>';
        }

        newRowsHtml += '<tr>' +
          '<td>' +
          '<div class="sched-date">' + escapeHtml(talk.date_display) + '</div>' +
          '<div class="sched-time">' + timeHtml + '</div>' +
          '</td>' +
          '<td>' +
          '<strong class="sched-speaker-name">' + escapeHtml(talk.speaker_name) + '</strong>' +
          (talk.speaker_affiliation ? '<span class="sched-affiliation">' + escapeHtml(talk.speaker_affiliation) + '</span>' : '') +
          '</td>' +
          '<td>' +
          '<div class="sched-talk-title">' + escapeHtml(talk.title) + '</div>' +
          '</td>' +
          '<td>' + formatHtml + '</td>' +
          '<td>' + actionsHtml + '</td>' +
          '</tr>';

        if (talk.has_abstract) {
          ensureModalExists(talk);
        }
      });

      tableBody.innerHTML = newRowsHtml;
      bindModalEvents();
      bindRegisterButtons();
      updateRegistrationDropdown(talks);
    }

    // Dynamic dropdown generator for open sessions
    function updateRegistrationDropdown(talks) {
      var regSelect = document.getElementById('reg-session');
      if (!regSelect || !Array.isArray(talks)) return;

      var openTalks = talks.filter(function (t) {
        return t.has_register || t.status === 'active';
      });

      if (openTalks.length === 0) {
        regSelect.innerHTML = '<option value="" disabled selected>No sessions currently open for active registration</option>';
        return;
      }

      var optionsHtml = '';
      openTalks.forEach(function (talk, idx) {
        var label = 'Session ' + (talk.session_number || '') + ': ' + talk.date_display + ' — ' + talk.speaker_name;
        optionsHtml += '<option value="' + escapeHtml(label) + '" ' +
          'data-session-id="' + escapeHtml(talk.id) + '" ' +
          'data-zoom-id="' + escapeHtml(talk.zoom_meeting_id || '') + '" ' +
          'data-zoom-pass="' + escapeHtml(talk.zoom_passcode || '') + '" ' +
          'data-zoom-link="' + escapeHtml(talk.zoom_link || '') + '" ' +
          'data-zoom-note="' + escapeHtml(talk.zoom_instructions || '') + '" ' +
          'data-hide-zoom="' + (talk.hide_zoom ? 'true' : 'false') + '" ' +
          (idx === 0 ? 'selected' : '') + '>' +
          escapeHtml(label) +
          '</option>';
      });

      if (openTalks.length > 1) {
        optionsHtml += '<option value="All Open Colloquium Sessions (Full Series Pass)" data-session-id="all">All Open Colloquium Sessions (Full Series Pass)</option>';
      }

      regSelect.innerHTML = optionsHtml;
    }

    function bindRegisterButtons() {
      document.querySelectorAll('[data-register-target]').forEach(function (btn) {
        btn.onclick = function () {
          var targetId = btn.getAttribute('data-register-target');
          var regSelect = document.getElementById('reg-session');
          if (regSelect && targetId) {
            for (var i = 0; i < regSelect.options.length; i++) {
              if (regSelect.options[i].getAttribute('data-session-id') === targetId) {
                regSelect.selectedIndex = i;
                break;
              }
            }
          }
        };
      });
    }

    // 1. Try local storage cache from admin
    var cached = localStorage.getItem('mindscapes_talks');
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          renderDynamicTable(parsed);
        }
      } catch (e) { }
    }

    // 2. Fetch live updates from Supabase
    if (SUPABASE_CONFIG.url) {
      fetch(SUPABASE_CONFIG.url + '/rest/v1/talks?select=*&order=session_number.asc&_t=' + Date.now(), {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(function (res) {
        if (res.ok) return res.json();
      }).then(function (remoteTalks) {
        if (Array.isArray(remoteTalks) && remoteTalks.length > 0) {
          var localCached = [];
          try { localCached = JSON.parse(localStorage.getItem('mindscapes_talks') || '[]'); } catch (e) {}

          var docsConf = remoteTalks.find(function (t) { return t.id === 'config-talk-docs'; });
          var docsConfigMap = {};
          if (docsConf && docsConf.abstract) {
            try { docsConfigMap = JSON.parse(docsConf.abstract); } catch (e) {}
          }

          remoteTalks = remoteTalks.map(function (remoteTalk) {
            var localMatch = localCached.find(function (t) { return t.id === remoteTalk.id; });
            var docs = extractTalkDocs(remoteTalk, docsConfigMap);
            if (localMatch) {
              var localDocs = extractTalkDocs(localMatch);
              if (localDocs.papers.length > docs.papers.length) docs.papers = localDocs.papers;
              if (localDocs.handouts.length > docs.handouts.length) docs.handouts = localDocs.handouts;
            }
            remoteTalk.papers = docs.papers;
            remoteTalk.handouts = docs.handouts;
            remoteTalk.papers_json = JSON.stringify(docs.papers);
            remoteTalk.handouts_json = JSON.stringify(docs.handouts);
            return remoteTalk;
          });

          localStorage.setItem('mindscapes_talks', JSON.stringify(remoteTalks));
          renderDynamicTable(remoteTalks);
        }
      }).catch(function (err) {
        console.log('Supabase schedule sync note:', err);
      });
    }
  }

  // ===== Dynamic Speakers Page & Spotlight Hydration =====
  function initDynamicVisuals() {
    function applyData(talks) {
      if (!Array.isArray(talks) || talks.length === 0) return;
      var realTalks = talks.filter(function (t) { return t.id !== 'config-homepage-poster' && !t.id.startsWith('config-'); });

      // Look for Cloud Document Registry row
      var docsConf = talks.find(function (t) { return t.id === 'config-talk-docs'; });
      var docsConfigMap = {};
      if (docsConf && docsConf.abstract) {
        try { docsConfigMap = JSON.parse(docsConf.abstract); } catch (e) {}
      }

      // 1. Dynamic Homepage Spotlight Card (index.html)
      var spotlightCard = document.querySelector('.spotlight-card');
      if (spotlightCard) {
        var activeTalk = realTalks.find(function (t) { return t.status === 'active'; }) ||
          realTalks.find(function (t) { return t.has_register; }) ||
          realTalks[0];

        if (activeTalk) {
          var badgeEl = spotlightCard.querySelector('.spotlight-badge');
          if (badgeEl) badgeEl.innerHTML = (activeTalk.status === 'active' ? 'Active' : 'Upcoming') + ' &bull; Session ' + (activeTalk.session_number || '');

          var timeEl = spotlightCard.querySelector('.spotlight-time');
          if (timeEl) timeEl.textContent = activeTalk.date_display + ' • Starts at ' + (activeTalk.time_display || '').replace(/\n/g, ' ');

          var titleLink = spotlightCard.querySelector('.spotlight-title a');
          if (titleLink) {
            titleLink.textContent = activeTalk.title;
            titleLink.href = 'schedule.html#session-' + (activeTalk.session_number || '');
          }

          var speakerEl = spotlightCard.querySelector('.spotlight-speaker');
          if (speakerEl) speakerEl.textContent = activeTalk.speaker_name;

          var affilEl = spotlightCard.querySelector('.spotlight-affil');
          if (affilEl) affilEl.textContent = activeTalk.speaker_affiliation || '';

          var spotPhoto = document.getElementById('spotlight-speaker-photo');
          if (spotPhoto) {
            if (activeTalk.speaker_image) {
              spotPhoto.src = activeTalk.speaker_image;
              spotPhoto.style.display = 'block';
            } else {
              spotPhoto.style.display = 'none';
            }
          }

          var abstractEl = spotlightCard.querySelector('.abstract-content');
          if (abstractEl && activeTalk.abstract) {
            var cleanAbs = cleanAbstract(activeTalk.abstract);
            var paras = cleanAbs.split('\n\n').filter(function (p) { return p.trim().length > 0; });
            abstractEl.innerHTML = paras.map(function (p, i) {
              return '<p>' + (i === 0 ? '<strong>Abstract:</strong> ' : '') + escapeHtml(p) + '</p>';
            }).join('');
          }

          var actionsEl = spotlightCard.querySelector('.spotlight-actions');
          if (actionsEl) {
            var btns = [];
            if (!activeTalk.hide_zoom) {
              if (activeTalk.zoom_link) {
                btns.push('<a href="' + escapeHtml(activeTalk.zoom_link) + '" target="_blank" rel="noopener noreferrer" class="btn btn-zoom" id="spotlight-zoom-btn">Join Zoom Meeting &rarr;</a>');
              } else if (activeTalk.status === 'active' || activeTalk.id === 'session-2') {
                btns.push('<a href="https://us04web.zoom.us/launch/jc/78997015908" target="_blank" rel="noopener noreferrer" class="btn btn-zoom" id="spotlight-zoom-btn">Join Zoom Meeting &rarr;</a>');
              }
            }
            if (activeTalk.has_register || activeTalk.status === 'active') {
              btns.push('<a href="schedule.html#register" class="btn btn-gold">Register for Session ' + (activeTalk.session_number || '') + '</a>');
            }

            // Extract all research papers and handouts for Spotlight
            var spotDocs = extractTalkDocs(activeTalk, docsConfigMap);

            spotDocs.papers.forEach(function (p, pIdx) {
              if (p && p.url) {
                var docLabel = p.title ? ('PDF: ' + (p.title.length > 28 ? p.title.substring(0, 26) + '...' : p.title)) : ('Download Paper ' + (spotDocs.papers.length > 1 ? (pIdx + 1) : '') + ' (PDF)');
                btns.push('<a href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">' + escapeHtml(docLabel) + '</a>');
              }
            });

            spotDocs.handouts.forEach(function (h, hIdx) {
              if (h && h.url) {
                var docLabel = h.title ? ('PDF: ' + (h.title.length > 28 ? h.title.substring(0, 26) + '...' : h.title)) : ('Download Handout ' + (spotDocs.handouts.length > 1 ? (hIdx + 1) : '') + ' (PDF)');
                btns.push('<a href="' + escapeHtml(h.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">' + escapeHtml(docLabel) + '</a>');
              }
            });

            btns.push('<a href="schedule.html" class="btn btn-secondary">View Full Schedule &rarr;</a>');
            actionsEl.innerHTML = btns.join(' ');
          }
        }
      }

      // 1b. Dynamic Concluded Sessions Card on Homepage (index.html)
      var recentCard = document.querySelector('.session-card.completed');
      if (recentCard) {
        var concludedTalk = realTalks.find(function (t) { return t.status === 'concluded'; });
        if (concludedTalk) {
          var concDocs = extractTalkDocs(concludedTalk, docsConfigMap);
          var actionsWrap = recentCard.querySelector('div[style*="display: flex"]');
          if (actionsWrap) {
            var concBtns = [
              '<a href="archive.html#session-' + (concludedTalk.session_number || '') + '" class="btn btn-secondary btn-sm">View Session Archive</a>',
              '<a href="readings.html#session-' + (concludedTalk.session_number || '') + '" class="btn btn-secondary btn-sm">Access Session Handouts</a>'
            ];
            concDocs.papers.forEach(function (p, pIdx) {
              if (p && p.url) {
                var lbl = p.title ? ('Paper: ' + (p.title.length > 24 ? p.title.substring(0, 22) + '...' : p.title)) : ('Paper ' + (concDocs.papers.length > 1 ? (pIdx + 1) : '') + ' (PDF)');
                concBtns.push('<a href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">' + escapeHtml(lbl) + '</a>');
              }
            });
            concDocs.handouts.forEach(function (h, hIdx) {
              if (h && h.url) {
                var lbl = h.title ? ('Handout: ' + (h.title.length > 24 ? h.title.substring(0, 22) + '...' : h.title)) : ('Handout ' + (concDocs.handouts.length > 1 ? (hIdx + 1) : '') + ' (PDF)');
                concBtns.push('<a href="' + escapeHtml(h.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">' + escapeHtml(lbl) + '</a>');
              }
            });
            actionsWrap.innerHTML = concBtns.join(' ');
          }
        }
      }

      // 2. Dynamic Keynote Speakers Grid (speakers.html)
      var speakersGrid = document.getElementById('keynote-speakers-grid') || document.querySelector('.speakers-grid');
      if (speakersGrid && document.querySelector('.page-hero-title')?.textContent.includes('Speakers')) {
        var sorted = [...realTalks].sort(function (a, b) { return (a.session_number || 0) - (b.session_number || 0); });
        var gridHtml = '';
        sorted.forEach(function (talk) {
          var initials = (talk.speaker_name || '')
            .replace(/^(prof\.|dr\.|ms\.|mr\.)\s*/i, '')
            .split(' ')
            .filter(Boolean)
            .map(w => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'SP';

          var avatarHtml = talk.speaker_image
            ? '<img src="' + escapeHtml(talk.speaker_image) + '" alt="' + escapeHtml(talk.speaker_name) + '" loading="lazy">'
            : '<div class="speaker-monogram">' + initials + '</div>';

          var roleLabel = 'Speaker &bull; Session ' + (talk.session_number || '');
          if (talk.date_display) roleLabel += ' (' + escapeHtml(talk.date_display) + ')';

          gridHtml += '<article class="speaker-profile-card">' +
            '<div class="speaker-avatar-wrap">' + avatarHtml + '</div>' +
            '<div class="speaker-card-body">' +
            '<span class="speaker-role-pill">' + roleLabel + '</span>' +
            '<h3 class="speaker-name">' + escapeHtml(talk.speaker_name) + '</h3>' +
            '<div class="speaker-affiliation">' + escapeHtml(talk.speaker_affiliation || '') + '</div>' +
            (talk.speaker_bio ? '<p class="subtext" style="margin-top: 0.75rem; font-size: 0.88rem; line-height: 1.55;">' + escapeHtml(talk.speaker_bio) + '</p>' : (talk.abstract ? '<p class="subtext" style="margin-top: 0.75rem; font-size: 0.88rem; line-height: 1.5;">' + escapeHtml(talk.abstract.substring(0, 160)) + '...</p>' : '')) +
            '<div class="speaker-talk-topic" style="margin-top: 0.85rem;">' +
            '<strong>Talk:</strong> <em>' + escapeHtml(talk.title || '') + '</em>' +
            '</div>' +
            '</div>' +
            '</article>';
        });
        speakersGrid.innerHTML = gridHtml;
      }

      // 2b. Dynamic Commentators Grid (speakers.html)
      var commentatorsGrid = document.getElementById('commentators-grid');
      if (commentatorsGrid) {
        var commData = null;

        // 1. Try fetching live commentators from Supabase talks table (config-commentators)
        if (Array.isArray(talks)) {
          var commConf = talks.find(function (t) { return t.id === 'config-commentators'; });
          if (commConf && commConf.abstract) {
            try {
              var parsedRemote = JSON.parse(commConf.abstract);
              if (Array.isArray(parsedRemote) && parsedRemote.length > 0) {
                commData = parsedRemote;
                try { localStorage.setItem('mindscapes_commentators', JSON.stringify(commData)); } catch (e) { }
              }
            } catch (e) { }
          }
        }

        // 2. Fallback to localStorage
        if (!commData) {
          try {
            var commRaw = localStorage.getItem('mindscapes_commentators');
            if (commRaw) commData = JSON.parse(commRaw);
          } catch (e) { }
        }

        if (!Array.isArray(commData) || commData.length === 0) {
          commData = [
            {
              id: 'comm-1',
              name: 'Prof. Sami Yousif',
              affiliation: 'The Ohio State University, USA \u2022 Department of Psychology',
              image: 'Images/sami-yousif.jpeg',
              role_pill: 'Commentator \u2022 Session 1',
              topic: "Commentary on Prof. Melissa Kibbe's colloquium on infant object representation.",
              bio: 'Sami Yousif explores spatial cognition, perceptual grouping, numerical representation, and how cognitive systems organize complex visual and mental information across development.'
            },
            {
              id: 'comm-2',
              name: 'Sarita Tamang',
              affiliation: 'University of Delhi, India \u2022 Department of Philosophy',
              image: '',
              role_pill: 'Commentator',
              topic: '',
              bio: ''
            }
          ];
        } else {
          // Remove old test entries if any
          commData = commData.filter(function (c) { return c.name !== 'Prof. Tarun'; });
        }

        var commHtml = '';
        commData.forEach(function (comm) {
          var initials = (comm.name || '')
            .replace(/^(prof\.|dr\.|ms\.|mr\.)\s*/i, '')
            .split(' ')
            .filter(Boolean)
            .map(w => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'CM';

          var avatarHtml = comm.image
            ? '<img src="' + escapeHtml(comm.image) + '" alt="' + escapeHtml(comm.name) + '" loading="lazy">'
            : '<div class="speaker-monogram" style="background: #92400e;">' + initials + '</div>';

          commHtml += '<article class="speaker-profile-card">' +
            '<div class="speaker-avatar-wrap">' + avatarHtml + '</div>' +
            '<div class="speaker-card-body">' +
            '<span class="speaker-role-pill commentator">' + (comm.role_pill || 'Commentator') + '</span>' +
            '<h3 class="speaker-name">' + escapeHtml(comm.name) + '</h3>' +
            '<div class="speaker-affiliation">' + (comm.affiliation || '') + '</div>' +
            (comm.bio ? '<p class="subtext" style="margin-bottom: 1.15rem;">' + escapeHtml(comm.bio) + '</p>' : '') +
            (comm.topic ? '<div class="speaker-talk-topic" style="border-left-color: #92400e;"><strong>Commentary on:</strong> ' + escapeHtml(comm.topic) + '</div>' : '') +
            '</div>' +
            '</article>';
        });
        commentatorsGrid.innerHTML = commHtml;
      }

      // 3. Dynamic Upcoming Archival Banner & Concluded Sessions (archive.html)
      initDynamicArchive(talks);
      initDynamicArchivedSessions(talks);

      // 4. Dynamic Literature Modules (readings.html)
      initDynamicReadings(talks);

      // 5. Dynamic Homepage Colloquium Poster (index.html)
      initDynamicPoster(talks);
    }

    // Function to dynamically update Homepage Series Poster
    function initDynamicPoster(talks) {
      var posterWrap = document.getElementById('homepage-poster-wrap');
      var posterImg = document.getElementById('homepage-poster-img');
      var posterLink = document.getElementById('homepage-poster-link');
      if (!posterWrap || !posterImg) return;

      var posterUrl = null;

      // Check remote talks table for config-homepage-poster
      if (Array.isArray(talks)) {
        var posterConf = talks.find(function (t) { return t.id === 'config-homepage-poster'; });
        if (posterConf && posterConf.reading_url) {
          posterUrl = posterConf.reading_url;
        }
      }

      // Check localStorage fallback
      if (!posterUrl) {
        try {
          var raw = localStorage.getItem('mindscapes_homepage_poster');
          if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.url) posterUrl = parsed.url;
          }
        } catch (e) { }
      }

      if (posterUrl) {
        posterImg.src = posterUrl;
        if (posterLink) posterLink.href = posterUrl;
        posterWrap.style.display = 'block';
      } else {
        posterWrap.style.display = 'none';
        posterImg.src = '';
      }
    }

    // Function to dynamically update Archive Upcoming Banner
    function initDynamicArchive(talks) {
      var banner = document.getElementById('archive-upcoming-banner');
      if (!banner || !Array.isArray(talks)) return;

      var realTalks = talks.filter(function (t) { return t.id !== 'config-homepage-poster' && !t.id.startsWith('config-'); });
      var sorted = [...realTalks].sort(function (a, b) { return (a.session_number || 0) - (b.session_number || 0); });
      var nextSession = sorted.find(function (t) { return t.status === 'active' || t.status === 'upcoming'; });

      if (nextSession) {
        banner.innerHTML = '<strong>Upcoming Archival:</strong> Session ' + (nextSession.session_number || '') +
          ' with <strong>' + escapeHtml(nextSession.speaker_name) + '</strong> (<em>' + escapeHtml(nextSession.title) + '</em>)' +
          ' is scheduled for <strong>' + escapeHtml(nextSession.date_display) + (nextSession.time_display ? ' at ' + escapeHtml(nextSession.time_display) : '') + '</strong>.' +
          ' Following the live session, discussion records and materials will be indexed here.';
      } else {
        banner.innerHTML = '<strong>Series Complete:</strong> All sessions from the current colloquium cycle are indexed above. Discussion records, video archives, and seminar materials are permanently preserved.';
      }
    }

    // Function to dynamically render Concluded Sessions in archive.html
    function initDynamicArchivedSessions(talks) {
      var archiveContainer = document.getElementById('archived-sessions-container');
      if (!archiveContainer || !Array.isArray(talks)) return;

      var docsConf = talks.find(function (t) { return t.id === 'config-talk-docs'; });
      var docsConfigMap = {};
      if (docsConf && docsConf.abstract) {
        try { docsConfigMap = JSON.parse(docsConf.abstract); } catch (e) {}
      }

      var concludedTalks = talks.filter(function (t) { return t.status === 'concluded' && t.id !== 'config-homepage-poster'; });
      concludedTalks.sort(function (a, b) { return (a.session_number || 0) - (b.session_number || 0); });

      if (concludedTalks.length > 0) {
        var archiveHtml = '';
        concludedTalks.forEach(function (talk) {
          var materialsList = [];
          var docs = extractTalkDocs(talk, docsConfigMap);

          // 1. Gather all research papers
          docs.papers.forEach(function (p, pIdx) {
            if (p && p.url) {
              var pTitle = p.title || ('Research Paper ' + (docs.papers.length > 1 ? (pIdx + 1) : ''));
              materialsList.push(
                '<li style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; font-family: var(--font-sans); font-size: 0.92rem;' + (materialsList.length > 0 ? ' border-top: 1px solid #eae5de; padding-top: 0.65rem;' : '') + '">' +
                '<span><strong>Research Paper:</strong> ' + escapeHtml(pTitle) + '</span>' +
                '<a href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">Download Paper (PDF) &darr;</a>' +
                '</li>'
              );
            }
          });

          // 2. Gather all seminar handouts
          docs.handouts.forEach(function (h, hIdx) {
            if (h && h.url) {
              var hTitle = h.title || ('Speaker Handout ' + (docs.handouts.length > 1 ? (hIdx + 1) : ''));
              materialsList.push(
                '<li style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; font-family: var(--font-sans); font-size: 0.92rem;' + (materialsList.length > 0 ? ' border-top: 1px solid #eae5de; padding-top: 0.65rem;' : '') + '">' +
                '<span><strong>Seminar Handout:</strong> <em>' + escapeHtml(hTitle) + '</em></span>' +
                '<a href="' + escapeHtml(h.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">Download Handout (PDF) &darr;</a>' +
                '</li>'
              );
            }
          });

          var materialsBox = '';
          if (materialsList.length > 0) {
            materialsBox = '<div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 4px; padding: 1.25rem 1.5rem; margin: 1.5rem 0;">' +
              '<h4 style="margin: 0 0 0.75rem; font-family: var(--font-serif); font-size: 1.1rem; color: var(--accent-color);">Session Materials &amp; Artifacts</h4>' +
              '<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.65rem;">' +
              materialsList.join('') +
              '</ul>' +
              '</div>';
          }

          var commentatorLine = '';
          if (talk.format_commentators) {
            commentatorLine = '<div class="session-commentator-line">' + escapeHtml(talk.format_commentators) + '</div>';
          }

          var abstractHtml = '';
          var rawAbs = cleanAbstract(talk.abstract);
          if (rawAbs) {
            abstractHtml = '<div style="margin: 1.25rem 0;"><p style="font-size: 0.98rem; line-height: 1.65; color: var(--text-color);">' + escapeHtml(rawAbs) + '</p></div>';
          }

          archiveHtml += '<article class="session-card" id="session-' + (talk.session_number || '') + '">' +
            '<div class="session-card-header">' +
            '<span class="status-badge completed">Concluded &bull; Session ' + (talk.session_number || '') + '</span>' +
            '<span class="subtext">Held on ' + escapeHtml(talk.date_display) + (talk.time_display ? ' &bull; ' + escapeHtml(talk.time_display) : '') + '</span>' +
            '</div>' +
            '<h3 class="session-title">' + escapeHtml(talk.title) + '</h3>' +
            '<div class="session-speaker-line">Speaker: ' + escapeHtml(talk.speaker_name) + (talk.speaker_affiliation ? ' (' + escapeHtml(talk.speaker_affiliation) + ')' : '') + '</div>' +
            commentatorLine +
            abstractHtml +
            materialsBox +
            '<div class="subtext" style="margin-top: 1rem;">' +
            '<em>Note on Recordings:</em> For scholarly inquiries regarding audio/video archives or discussion transcripts, please email <a href="mailto:mindscapesdu@gmail.com">mindscapesdu@gmail.com</a>.' +
            '</div>' +
            '</article>';
        });
        archiveContainer.innerHTML = archiveHtml;
      } else {
        archiveContainer.innerHTML = '<div style="padding: 2.5rem; text-align: center; color: #64748b; font-family: var(--font-sans); background: var(--card-bg); border: 1px dashed var(--border-color); border-radius: 6px; margin-bottom: 2rem;">' +
          '<p style="margin: 0; font-size: 0.96rem;">No sessions have concluded yet. Archived talk materials and session recordings will appear here following each colloquium.</p>' +
          '</div>';
      }
    }

    // Function to dynamically render Literature & Handouts in readings.html
    function initDynamicReadings(talks) {
      var readingsContainer = document.getElementById('readings-container');
      if (!readingsContainer || !Array.isArray(talks)) return;

      var docsConf = talks.find(function (t) { return t.id === 'config-talk-docs'; });
      var docsConfigMap = {};
      if (docsConf && docsConf.abstract) {
        try { docsConfigMap = JSON.parse(docsConf.abstract); } catch (e) {}
      }

      var readTalks = talks.filter(function (t) { return t.id !== 'config-homepage-poster' && !t.id.startsWith('config-'); });
      var sorted = [...readTalks].sort(function (a, b) { return (b.session_number || 0) - (a.session_number || 0); });
      var hasAnyReading = false;
      var readingsHtml = '';

      sorted.forEach(function (talk) {
        var docs = extractTalkDocs(talk, docsConfigMap);
        var hasDocs = (docs.papers.length > 0) || (docs.handouts.length > 0);

        if (hasDocs) {
          hasAnyReading = true;
          var isUpcoming = talk.status === 'active' || talk.status === 'upcoming';
          var badgeText = isUpcoming ? 'Active Preparation' : 'Archived Readings';
          var badgeClass = isUpcoming ? 'upcoming' : 'completed';

          var buttonsHtml = '';
          docs.papers.forEach(function (p, pIdx) {
            if (p && p.url) {
              var pBtnLabel = p.title ? ('Paper: ' + (p.title.length > 28 ? p.title.substring(0, 26) + '...' : p.title)) : ('Download Paper ' + (docs.papers.length > 1 ? (pIdx + 1) : '') + ' (PDF) &darr;');
              buttonsHtml += '<a href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer" class="btn ' + (isUpcoming ? 'btn-gold' : 'btn-secondary') + ' btn-sm" style="margin-right: 0.5rem; margin-bottom: 0.5rem;">' + escapeHtml(pBtnLabel) + '</a>';
            }
          });
          docs.handouts.forEach(function (h, hIdx) {
            if (h && h.url) {
              var hBtnLabel = h.title ? ('Handout: ' + (h.title.length > 28 ? h.title.substring(0, 26) + '...' : h.title)) : ('Download Handout ' + (docs.handouts.length > 1 ? (hIdx + 1) : '') + ' (PDF) &darr;');
              buttonsHtml += '<a href="' + escapeHtml(h.url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="margin-right: 0.5rem; margin-bottom: 0.5rem;">' + escapeHtml(hBtnLabel) + '</a>';
            }
          });

          var citation = talk.reading_title || (talk.speaker_name + ' \u2014 "' + talk.title + '"');
          var rawAbs = cleanAbstract(talk.abstract);
          var context = rawAbs ? (rawAbs.length > 280 ? rawAbs.substring(0, 280) + '...' : rawAbs) : 'Preparatory reading material for Session ' + (talk.session_number || '') + '.';

          readingsHtml += '<section class="reading-module" id="session-' + (talk.session_number || '') + '">' +
            '<div class="reading-module-header">' +
            '<span class="status-badge ' + badgeClass + '" style="float: right;">' + badgeText + '</span>' +
            '<h3>Session ' + (talk.session_number || '') + ': ' + escapeHtml(talk.speaker_name) + (talk.date_display ? ' (' + escapeHtml(talk.date_display) + ')' : '') + '</h3>' +
            '</div>' +
            '<article class="reading-card">' +
            '<div class="reading-details">' +
            '<div class="reading-citation"><strong>' + escapeHtml(citation) + '</strong></div>' +
            '<p class="reading-context">' + escapeHtml(context) + '</p>' +
            '</div>' +
            '<div>' + buttonsHtml + '</div>' +
            '</article>' +
            '</section>';
        }
      });

      if (hasAnyReading) {
        readingsContainer.innerHTML = readingsHtml;
      } else {
        readingsContainer.innerHTML = '<div style="padding: 2.5rem; text-align: center; color: #64748b; font-family: var(--font-sans); background: var(--card-bg); border: 1px dashed var(--border-color); border-radius: 6px;">' +
          '<p style="margin: 0; font-size: 0.96rem;">Preparatory readings and handouts for upcoming colloquium dates are currently being compiled. Please check back prior to each session.</p>' +
          '</div>';
      }
    }

    initDynamicPoster(null);
    var cached = localStorage.getItem('mindscapes_talks');
    if (cached) {
      try { applyData(JSON.parse(cached)); } catch (e) { }
    }

    if (SUPABASE_CONFIG.url) {
      fetch(SUPABASE_CONFIG.url + '/rest/v1/talks?select=*&order=session_number.asc&_t=' + Date.now(), {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(function (res) {
        if (res.ok) return res.json();
      }).then(function (remoteTalks) {
        if (Array.isArray(remoteTalks) && remoteTalks.length > 0) {
          var localCached = [];
          try { localCached = JSON.parse(localStorage.getItem('mindscapes_talks') || '[]'); } catch (e) {}

          var docsConf = remoteTalks.find(function (t) { return t.id === 'config-talk-docs'; });
          var docsConfigMap = {};
          if (docsConf && docsConf.abstract) {
            try { docsConfigMap = JSON.parse(docsConf.abstract); } catch (e) {}
          }

          remoteTalks = remoteTalks.map(function (remoteTalk) {
            var localMatch = localCached.find(function (t) { return t.id === remoteTalk.id; });
            var docs = extractTalkDocs(remoteTalk, docsConfigMap);
            if (localMatch) {
              var localDocs = extractTalkDocs(localMatch);
              if (localDocs.papers.length > docs.papers.length) docs.papers = localDocs.papers;
              if (localDocs.handouts.length > docs.handouts.length) docs.handouts = localDocs.handouts;
            }
            remoteTalk.papers = docs.papers;
            remoteTalk.handouts = docs.handouts;
            remoteTalk.papers_json = JSON.stringify(docs.papers);
            remoteTalk.handouts_json = JSON.stringify(docs.handouts);
            return remoteTalk;
          });

          localStorage.setItem('mindscapes_talks', JSON.stringify(remoteTalks));
          applyData(remoteTalks);
        }
      }).catch(function (err) {
        console.log('Visual sync note:', err);
      });
    }
  }

  // Bind initial modal triggers & dynamic schedule
  bindModalEvents();
  initDynamicSchedule();
  initDynamicVisuals();
})();
