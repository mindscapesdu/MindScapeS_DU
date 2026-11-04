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

  var regForm = document.getElementById('session-reg-form');
  var regFormWrap = document.getElementById('reg-form-wrap');
  var regConfirmWrap = document.getElementById('reg-confirm-wrap');
  var regConfirmDetails = document.getElementById('reg-confirm-details');

  // Populate form from localStorage if user previously filled details
  var savedReg = localStorage.getItem('mindscapes_registration');
  if (savedReg && regForm) {
    try {
      var data = JSON.parse(savedReg);
      if (data.name && document.getElementById('reg-name')) document.getElementById('reg-name').value = data.name;
      if (data.email && document.getElementById('reg-email')) document.getElementById('reg-email').value = data.email;
      if (data.affiliation && document.getElementById('reg-affiliation')) document.getElementById('reg-affiliation').value = data.affiliation;
      if (data.academic_status && document.getElementById('reg-status')) document.getElementById('reg-status').value = data.academic_status;
      if (data.remarks && document.getElementById('reg-remarks')) document.getElementById('reg-remarks').value = data.remarks;
    } catch (e) {
      console.warn('LocalStorage parse exception:', e);
    }
  }

  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var existingId = localStorage.getItem('mindscapes_reg_id') || ('reg_' + Date.now());
      var selectedSession = document.getElementById('reg-session') ? document.getElementById('reg-session').value : 'Nov 6 - Schellenberg (Session 2)';

      var regData = {
        id: existingId,
        name: document.getElementById('reg-name').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        affiliation: document.getElementById('reg-affiliation') ? document.getElementById('reg-affiliation').value.trim() : '',
        academic_status: document.getElementById('reg-status') ? document.getElementById('reg-status').value : '',
        sessions: selectedSession,
        remarks: document.getElementById('reg-remarks') ? document.getElementById('reg-remarks').value.trim() : ''
      };

      // 1. Cache to LocalStorage
      localStorage.setItem('mindscapes_reg_id', regData.id);
      localStorage.setItem('mindscapes_registration', JSON.stringify(regData));

      // 2. Local / Render Backend CSV sync
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

      if (confZoomDetails) {
        if (zoomId || zoomLink) {
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
          confZoomDetails.innerHTML = '<p style="margin: 0.35rem 0; font-family: var(--font-sans); font-size: 0.94rem; color: #1e3a8a;">' +
            '<strong>Zoom credentials in preparation:</strong> Meeting links will be emailed directly to <strong>' + escapeHtml(regData.email) + '</strong> before this colloquium commences.' +
            '</p>';
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
    var paragraphs = (talk.abstract || '').split('\n\n').filter(function(p) { return p.trim().length > 0; });
    var abstractHtml = paragraphs.map(function(p) { return '<p style="font-size: 0.96rem; line-height: 1.65; margin-bottom: 0.85rem;">' + escapeHtml(p) + '</p>'; }).join('') || '<p>Abstract in preparation.</p>';

    var readingHtml = '';
    if (talk.reading_url) {
      readingHtml = '<a href="' + escapeHtml(talk.reading_url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">Download Prep Reading (PDF)</a>';
    }

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
      talks.sort(function (a, b) { return (a.session_number || 0) - (b.session_number || 0); });

      var newRowsHtml = '';
      talks.forEach(function (talk) {
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
        if (talk.zoom_link) {
          actionBtns.push('<a href="' + escapeHtml(talk.zoom_link) + '" target="_blank" rel="noopener noreferrer" class="btn-table-zoom">Join Zoom</a>');
        } else if (talk.status === 'active' || talk.id === 'session-2') {
          actionBtns.push('<a href="https://us04web.zoom.us/launch/jc/78997015908" target="_blank" rel="noopener noreferrer" class="btn-table-zoom">Join Zoom</a>');
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
      } catch (e) {}
    }

    // 2. Fetch live updates from Supabase
    if (SUPABASE_CONFIG.url) {
      fetch(SUPABASE_CONFIG.url + '/rest/v1/talks?select=*&order=session_number.asc', {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey
        }
      }).then(function (res) {
        if (res.ok) return res.json();
      }).then(function (remoteTalks) {
        if (Array.isArray(remoteTalks) && remoteTalks.length > 0) {
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

      // 1. Dynamic Homepage Spotlight Card (index.html)
      var spotlightCard = document.querySelector('.spotlight-card');
      if (spotlightCard) {
        var activeTalk = talks.find(function(t) { return t.status === 'active'; }) ||
                         talks.find(function(t) { return t.has_register; }) ||
                         talks[0];

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
            var paras = activeTalk.abstract.split('\n\n').filter(function(p) { return p.trim().length > 0; });
            abstractEl.innerHTML = paras.map(function(p, i) {
              return '<p>' + (i === 0 ? '<strong>Abstract:</strong> ' : '') + escapeHtml(p) + '</p>';
            }).join('');
          }

          var actionsEl = spotlightCard.querySelector('.spotlight-actions');
          if (actionsEl) {
            var btns = [];
            if (activeTalk.zoom_link) {
              btns.push('<a href="' + escapeHtml(activeTalk.zoom_link) + '" target="_blank" rel="noopener noreferrer" class="btn btn-zoom" id="spotlight-zoom-btn">Join Zoom Meeting &rarr;</a>');
            } else if (activeTalk.status === 'active' || activeTalk.id === 'session-2') {
              btns.push('<a href="https://us04web.zoom.us/launch/jc/78997015908" target="_blank" rel="noopener noreferrer" class="btn btn-zoom" id="spotlight-zoom-btn">Join Zoom Meeting &rarr;</a>');
            }
            if (activeTalk.has_register || activeTalk.status === 'active') {
              btns.push('<a href="schedule.html#register" class="btn btn-gold">Register for Session ' + (activeTalk.session_number || '') + '</a>');
            }
            if (activeTalk.reading_url) {
              btns.push('<a href="' + escapeHtml(activeTalk.reading_url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Download Prep Reading (PDF)</a>');
            }
            btns.push('<a href="schedule.html" class="btn btn-secondary">View Full Schedule &rarr;</a>');
            actionsEl.innerHTML = btns.join(' ');
          }
        }
      }

      // 2. Dynamic Keynote Speakers Grid (speakers.html)
      var speakersGrid = document.querySelector('.speakers-grid');
      if (speakersGrid && document.querySelector('.page-hero-title')?.textContent.includes('Speakers')) {
        var sorted = [...talks].sort(function(a, b) { return (a.session_number || 0) - (b.session_number || 0); });
        var gridHtml = '';
        sorted.forEach(function(talk) {
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
    }

    var cached = localStorage.getItem('mindscapes_talks');
    if (cached) {
      try { applyData(JSON.parse(cached)); } catch (e) {}
    }

    if (SUPABASE_CONFIG.url) {
      fetch(SUPABASE_CONFIG.url + '/rest/v1/talks?select=*&order=session_number.asc', {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey
        }
      }).then(function (res) {
        if (res.ok) return res.json();
      }).then(function (remoteTalks) {
        if (Array.isArray(remoteTalks) && remoteTalks.length > 0) {
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
