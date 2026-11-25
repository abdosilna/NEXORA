const state = {
  loading: true,
  needsSetup: false,
  authenticated: false,
  admin: null,
  token: null,
  activeTab: 'overview',
  mobileNavOpen: false,
  notice: null,
  error: null,
  overview: null,
  users: [],
  userSearch: '',
  selectedUserDetail: null,
  courses: [],
  lessons: [],
  resources: [],
  resourceKindFilter: 'all',
  resourceSearch: '',
  settingsData: null,
  adminsList: [],
  logsData: null,
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users & Progress' },
  { id: 'curriculum', label: 'Courses & Lessons' },
  { id: 'library', label: 'Knowledge & Anime' },
  { id: 'settings', label: 'Settings & Providers' },
  { id: 'logs', label: 'Audit & Error Logs' },
];

const root = document.getElementById('app');

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'NexoraAdmin',
    ...(options.headers || {}),
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatStatusLabel(status) {
  const s = String(status || 'unknown').toLowerCase();
  if (['healthy', 'open', 'enabled', 'true'].includes(s)) {
    return `<span class="status-text status-ok">${escapeHtml(status)}</span>`;
  }
  if (['degraded', 'reconnecting', 'pairing_pending', 'unconfigured'].includes(s)) {
    return `<span class="status-text status-warn">${escapeHtml(status)}</span>`;
  }
  if (['error', 'logged_out'].includes(s)) {
    return `<span class="status-text status-err">${escapeHtml(status)}</span>`;
  }
  return `<span class="status-text">${escapeHtml(status)}</span>`;
}

async function init() {
  try {
    const authStatus = await api('/api/admin/auth/status');
    state.needsSetup = authStatus.needsSetup;
    state.authenticated = authStatus.authenticated;
    state.admin = authStatus.admin;
    if (state.authenticated) {
      await loadTabData(state.activeTab);
    }
  } catch (err) {
    state.error = err.message;
  } finally {
    state.loading = false;
    render();
  }
}

async function loadTabData(tab) {
  state.error = null;
  if (tab === 'overview') {
    state.overview = await api('/api/admin/overview');
  } else if (tab === 'users') {
    const res = await api(`/api/admin/users?search=${encodeURIComponent(state.userSearch)}`);
    state.users = res.users || [];
  } else if (tab === 'curriculum') {
    const res = await api('/api/admin/courses');
    state.courses = res.courses || [];
    state.lessons = res.lessons || [];
  } else if (tab === 'library') {
    const kindParam = state.resourceKindFilter === 'all' ? '' : `&kind=${encodeURIComponent(state.resourceKindFilter)}`;
    const res = await api(`/api/admin/resources?query=${encodeURIComponent(state.resourceSearch)}${kindParam}`);
    state.resources = res.resources || [];
  } else if (tab === 'settings') {
    state.settingsData = await api('/api/admin/settings');
    if (state.admin?.role === 'super_admin') {
      const adminsRes = await api('/api/admin/auth/admins');
      state.adminsList = adminsRes.admins || [];
    }
  } else if (tab === 'logs') {
    state.logsData = await api('/api/admin/logs');
  }
}

function render() {
  if (state.loading) {
    root.innerHTML = `<div class="loading-shell"><p>Loading NEXORA BOT Console...</p></div>`;
    return;
  }

  if (!state.authenticated) {
    renderAuthScreen();
    return;
  }

  renderDashboardShell();
}

function renderAuthScreen() {
  const isBootstrap = state.needsSetup;
  root.innerHTML = `
    <main class="auth-screen">
      <section class="auth-panel" aria-labelledby="auth-heading">
        <div class="auth-brand">NEXORA BOT</div>
        <h1 id="auth-heading" class="section-title" style="font-size:20px;">
          ${isBootstrap ? 'Create Primary Administrator' : 'Administrator Sign In'}
        </h1>
        <p class="auth-subtitle">
          ${
            isBootstrap
              ? 'First-run setup: claim the primary administrator account. Public registration remains disabled.'
              : 'Sign in with your administrator credentials to manage the bot, curriculum, and security settings.'
          }
        </p>
        ${state.error ? `<div class="alert alert-err" role="alert" style="margin-bottom:16px;">${escapeHtml(state.error)}</div>` : ''}
        <form id="auth-form" class="form-grid" style="grid-template-columns:1fr;">
          <div class="field">
            <label for="auth-username">Username</label>
            <input id="auth-username" name="username" type="text" autocomplete="username" required minlength="3" placeholder="admin" />
          </div>
          <div class="field">
            <label for="auth-password">Password</label>
            <input id="auth-password" name="password" type="password" autocomplete="${isBootstrap ? 'new-password' : 'current-password'}" required minlength="8" placeholder="Minimum 8 characters" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:4px;">
            ${isBootstrap ? 'Claim Administrator Access' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  `;

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    state.error = null;
    const form = e.currentTarget;
    const username = form.username.value.trim();
    const password = form.password.value;
    const endpoint = isBootstrap ? '/api/admin/auth/bootstrap' : '/api/admin/auth/login';
    try {
      const data = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      state.token = data.token || null;
      state.admin = data.admin;
      state.authenticated = true;
      state.needsSetup = false;
      await loadTabData(state.activeTab);
      render();
    } catch (err) {
      state.error = err.message;
      render();
    }
  });
}

function renderDashboardShell() {
  const currentNav = NAV_ITEMS.find((n) => n.id === state.activeTab) || NAV_ITEMS[0];
  root.innerHTML = `
    <div class="shell">
      <div id="sidebar-backdrop" class="sidebar-backdrop ${state.mobileNavOpen ? 'is-open' : ''}"></div>
      <aside id="sidebar" class="sidebar ${state.mobileNavOpen ? 'is-open' : ''}" aria-label="Admin Navigation">
        <div class="sidebar-brand">NEXORA BOT</div>
        <nav class="nav-list">
          ${NAV_ITEMS.map(
            (item) => `
            <button
              type="button"
              class="nav-btn ${state.activeTab === item.id ? 'is-active' : ''}"
              data-nav="${item.id}"
            >${escapeHtml(item.label)}</button>
          `
          ).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="account-meta">
            <strong>${escapeHtml(state.admin?.username || '')}</strong> · ${escapeHtml(state.admin?.role || '')}
          </div>
          <button type="button" id="logout-btn" class="btn btn-sm">Sign Out</button>
        </div>
      </aside>

      <div class="main-area">
        <header class="topbar">
          <div class="topbar-left">
            <button type="button" id="mobile-nav-toggle" class="mobile-menu-btn" aria-label="Toggle navigation">Menu</button>
            <div class="breadcrumb"><span class="breadcrumb-prefix">Administration / </span><strong>${escapeHtml(currentNav.label)}</strong></div>
          </div>
          <button type="button" id="refresh-btn" class="btn btn-sm">Refresh Data</button>
        </header>

        <main class="content">
          ${state.notice ? `<div class="alert alert-ok" role="status">${escapeHtml(state.notice)}</div>` : ''}
          ${state.error ? `<div class="alert alert-err" role="alert">${escapeHtml(state.error)}</div>` : ''}
          <div id="tab-viewport">${renderActiveTabHtml()}</div>
        </main>
      </div>
    </div>
  `;

  bindShellEvents();
  bindTabEvents();
}

function renderActiveTabHtml() {
  switch (state.activeTab) {
    case 'overview':
      return renderOverviewHtml();
    case 'users':
      return renderUsersHtml();
    case 'curriculum':
      return renderCurriculumHtml();
    case 'library':
      return renderLibraryHtml();
    case 'settings':
      return renderSettingsHtml();
    case 'logs':
      return renderLogsHtml();
    default:
      return '';
  }
}

function renderOverviewHtml() {
  const ov = state.overview;
  if (!ov) return `<div class="panel"><p>Loading overview...</p></div>`;
  const { stats, messagesByModule, health } = ov;

  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">System Overview</h1>
        <p class="section-desc">Live operational metrics, WhatsApp Baileys pairing state, and integration health.</p>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-label">Registered Learners</div>
        <div class="kpi-value">${stats.totalUsers}</div>
        <div class="kpi-meta">SQLite persisted profiles</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Messages Processed</div>
        <div class="kpi-value">${stats.totalMessages}</div>
        <div class="kpi-meta">${stats.todayMessages} today · ${stats.inboundMessages} inbound</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Active Curriculum</div>
        <div class="kpi-value">${stats.lessonsCount}</div>
        <div class="kpi-meta">Across ${stats.coursesCount} structured courses</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Library Directory</div>
        <div class="kpi-value">${stats.resourcesCount}</div>
        <div class="kpi-meta">Authorized legal resources</div>
      </div>
    </div>

    <div class="grid-2">
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Integration Health</h2>
          <span class="tabular" style="font-size:12px;color:var(--ink-muted);">Uptime ${health.uptimeSeconds}s · ${escapeHtml(health.nodeVersion)}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Database</td>
                <td>${escapeHtml(health.database?.dialect || 'sqlite')}</td>
                <td>${formatStatusLabel(health.database?.status)}</td>
              </tr>
              <tr>
                <td>WhatsApp (Baileys MD)</td>
                <td>${health.whatsapp?.phoneConfigured ? 'Phone configured' : 'Set WHATSAPP_NUMBER to pair'}</td>
                <td>${formatStatusLabel(health.whatsapp?.state)}</td>
              </tr>
              <tr>
                <td>AI Tutor Provider</td>
                <td>${escapeHtml(health.ai?.activeProvider || 'fallback')} · ${escapeHtml(health.ai?.model || '')}</td>
                <td>${formatStatusLabel(health.ai?.status)}</td>
              </tr>
              <tr>
                <td>Research Search</td>
                <td>${escapeHtml(health.research?.provider || 'wikipedia')} · SSRF Guarded</td>
                <td>${formatStatusLabel(health.research?.enabled ? 'healthy' : 'disabled')}</td>
              </tr>
              <tr>
                <td>Voice / TTS</td>
                <td>${escapeHtml(health.tts?.provider || 'disabled')}</td>
                <td>${formatStatusLabel(health.tts?.enabled ? 'enabled' : 'disabled')}</td>
              </tr>
              <tr>
                <td>Creative Studio</td>
                <td>${escapeHtml(health.creative?.provider || 'disabled')} · ${escapeHtml(health.creative?.model || '')}</td>
                <td>${formatStatusLabel(health.creative?.enabled ? 'enabled' : 'disabled')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Inbound Activity by Module</h2>
        </div>
        ${
          messagesByModule?.length
            ? `<div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th class="num-col">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${messagesByModule
                      .map(
                        (m) => `
                        <tr>
                          <td>${escapeHtml(m.module)}</td>
                          <td class="num-col">${m.count}</td>
                        </tr>
                      `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
            : `<div class="empty-state">No WhatsApp messages recorded yet. Messages appear automatically as learners interact with the bot.</div>`
        }
      </section>
    </div>
  `;
}

function renderUsersHtml() {
  const canDelete = state.admin?.role === 'super_admin';
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Users & Learning Progress</h1>
        <p class="section-desc">Registered WhatsApp learners. Private support conversations are isolated by design.</p>
      </div>
      <form id="user-search-form" class="inline-actions">
        <label for="user-search-input" style="position:absolute;left:-9999px;">Search users</label>
        <input id="user-search-input" type="search" value="${escapeHtml(state.userSearch)}" placeholder="Search phone or name..." style="width:240px;" />
        <button type="submit" class="btn">Search</button>
      </form>
    </div>

    <section class="panel">
      ${
        state.users.length
          ? `<div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Phone</th>
                    <th>Display Name</th>
                    <th>Level</th>
                    <th class="num-col">Points</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.users
                    .map(
                      (u) => `
                    <tr>
                      <td class="tabular">${u.id}</td>
                      <td class="tabular">${escapeHtml(u.phone_number)}</td>
                      <td>${escapeHtml(u.display_name || '—')}</td>
                      <td>${escapeHtml(u.learning_level)}</td>
                      <td class="num-col">${u.total_points}</td>
                      <td class="tabular">${escapeHtml(u.last_active_at)}</td>
                      <td>
                        <div class="inline-actions">
                          <button type="button" class="btn btn-sm" data-view-user="${u.id}">Progress</button>
                          ${
                            canDelete
                              ? `<button type="button" class="btn btn-sm btn-danger" data-delete-user="${u.id}">Delete</button>`
                              : ''
                          }
                        </div>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : `<div class="empty-state">No registered learners found matching the current filter.</div>`
      }
    </section>

    ${
      state.selectedUserDetail
        ? `<section class="panel" aria-label="Selected Learner Progress">
            <div class="panel-header">
              <h2 class="panel-title">Learner Summary · ${escapeHtml(state.selectedUserDetail.user.display_name || state.selectedUserDetail.user.phone_number)}</h2>
              <button type="button" id="close-user-detail" class="btn btn-sm">Close</button>
            </div>
            <div class="kpi-meta">
              Completed lessons: <strong class="tabular">${state.selectedUserDetail.summary.completedLessons}</strong> ·
              Quiz accuracy: <strong class="tabular">${state.selectedUserDetail.summary.quizAccuracy}%</strong> ·
              Due spaced reviews: <strong class="tabular">${state.selectedUserDetail.summary.dueReviews}</strong>
            </div>
          </section>`
        : ''
    }
  `;
}

function renderCurriculumHtml() {
  const canEdit = state.admin?.role === 'super_admin' || state.admin?.role === 'editor';
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Courses & Lessons Management</h1>
        <p class="section-desc">Manage Language Academy and Programming Academy curriculum stored in SQLite.</p>
      </div>
    </div>

    ${
      canEdit
        ? `<div class="grid-2">
            <section class="panel">
              <h2 class="panel-title">Add New Course</h2>
              <form id="create-course-form" class="form-grid">
                <div class="field">
                  <label for="course-category">Category</label>
                  <select id="course-category" name="category">
                    <option value="language">Language Academy</option>
                    <option value="programming">Programming Academy</option>
                  </select>
                </div>
                <div class="field">
                  <label for="course-subject">Subject Key</label>
                  <input id="course-subject" name="subject" type="text" required placeholder="japanese / python / spanish" />
                </div>
                <div class="field">
                  <label for="course-title">Arabic Title</label>
                  <input id="course-title" name="title_ar" type="text" required placeholder="مثال: اللغة الإسبانية — مبتدئ" />
                </div>
                <div class="field">
                  <label for="course-level">Level</label>
                  <select id="course-level" name="level">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div class="field full">
                  <label for="course-desc">Arabic Description</label>
                  <input id="course-desc" name="description_ar" type="text" required placeholder="وصف مختصر للمسار التعليمي" />
                </div>
                <div class="field full">
                  <button type="submit" class="btn btn-primary">Create Course</button>
                </div>
              </form>
            </section>

            <section class="panel">
              <h2 class="panel-title">Add New Lesson</h2>
              <form id="create-lesson-form" class="form-grid">
                <div class="field">
                  <label for="lesson-course">Parent Course</label>
                  <select id="lesson-course" name="course_id" required>
                    ${state.courses.map((c) => `<option value="${c.id}">${escapeHtml(c.title_ar)}</option>`).join('')}
                  </select>
                </div>
                <div class="field">
                  <label for="lesson-type">Lesson Type</label>
                  <select id="lesson-type" name="lesson_type">
                    <option value="lesson">General Lesson</option>
                    <option value="vocabulary">Vocabulary</option>
                    <option value="grammar">Grammar</option>
                    <option value="reading">Reading</option>
                    <option value="writing">Writing</option>
                    <option value="listening">Listening</option>
                    <option value="pronunciation">Pronunciation</option>
                    <option value="project">Project</option>
                  </select>
                </div>
                <div class="field full">
                  <label for="lesson-title">Lesson Title (Arabic)</label>
                  <input id="lesson-title" name="title_ar" type="text" required placeholder="عنوان الدرس" />
                </div>
                <div class="field full">
                  <label for="lesson-content">Lesson Content</label>
                  <textarea id="lesson-content" name="content_ar" required placeholder="محتوى الدرس والأمثلة..."></textarea>
                </div>
                <div class="field full">
                  <button type="submit" class="btn btn-primary">Add Lesson</button>
                </div>
              </form>
            </section>
          </div>`
        : ''
    }

    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">Published Lessons (${state.lessons.length})</h2>
      </div>
      ${
        state.lessons.length
          ? `<div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Course</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Level</th>
                    ${canEdit ? '<th>Actions</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${state.lessons
                    .map(
                      (l) => `
                    <tr>
                      <td class="tabular">${l.id}</td>
                      <td>${escapeHtml(l.course_title)}</td>
                      <td>${escapeHtml(l.lesson_type)}</td>
                      <td>${escapeHtml(l.title_ar)}</td>
                      <td>${escapeHtml(l.level)}</td>
                      ${
                        canEdit
                          ? `<td><button type="button" class="btn btn-sm btn-danger" data-delete-lesson="${l.id}">Delete</button></td>`
                          : ''
                      }
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : `<div class="empty-state">No lessons available yet.</div>`
      }
    </section>
  `;
}

function renderLibraryHtml() {
  const canEdit = state.admin?.role === 'super_admin' || state.admin?.role === 'editor';
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Knowledge & Anime Directory</h1>
        <p class="section-desc">Curated public-domain educational resources and legally licensed anime listings only.</p>
      </div>
      <div class="inline-actions">
        <div class="segmented" role="group" aria-label="Filter library type">
          <button type="button" class="seg-btn ${state.resourceKindFilter === 'all' ? 'is-active' : ''}" data-res-kind="all">All</button>
          <button type="button" class="seg-btn ${state.resourceKindFilter === 'knowledge' ? 'is-active' : ''}" data-res-kind="knowledge">Knowledge</button>
          <button type="button" class="seg-btn ${state.resourceKindFilter === 'anime' ? 'is-active' : ''}" data-res-kind="anime">Anime</button>
        </div>
      </div>
    </div>

    ${
      canEdit
        ? `<section class="panel">
            <h2 class="panel-title">Submit Authorized Resource</h2>
            <form id="create-resource-form" class="form-grid">
              <div class="field">
                <label for="res-kind">Directory</label>
                <select id="res-kind" name="kind">
                  <option value="knowledge">Knowledge Library</option>
                  <option value="anime">Licensed Anime Directory</option>
                </select>
              </div>
              <div class="field">
                <label for="res-title">Original Title</label>
                <input id="res-title" name="title" type="text" required placeholder="e.g. Khan Academy" />
              </div>
              <div class="field">
                <label for="res-title-ar">Arabic Title</label>
                <input id="res-title-ar" name="title_ar" type="text" placeholder="أكاديمية خان" />
              </div>
              <div class="field">
                <label for="res-category">Category</label>
                <input id="res-category" name="category" type="text" required placeholder="علوم / برمجة / لغات" />
              </div>
              <div class="field">
                <label for="res-genre">Genre / Format</label>
                <input id="res-genre" name="genre" type="text" placeholder="مفتوح المصدر / مرخص" />
              </div>
              <div class="field">
                <label for="res-url">Legal Viewing / Access URL</label>
                <input id="res-url" name="legal_url" type="url" required placeholder="https://..." />
              </div>
              <div class="field full">
                <label for="res-desc">Arabic Description</label>
                <input id="res-desc" name="description_ar" type="text" required placeholder="وصف مختصر للمصدر التعليمي" />
              </div>
              <div class="field full">
                <button type="submit" class="btn btn-primary">Add Resource</button>
              </div>
            </form>
          </section>`
        : ''
    }

    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">Catalog Entries (${state.resources.length})</h2>
      </div>
      ${
        state.resources.length
          ? `<div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Directory</th>
                    <th>Title</th>
                    <th>Category · Genre</th>
                    <th>Legal URL</th>
                    ${canEdit ? '<th>Actions</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${state.resources
                    .map(
                      (r) => `
                    <tr>
                      <td>${escapeHtml(r.kind)}</td>
                      <td><strong>${escapeHtml(r.title_ar || r.title)}</strong><div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(r.title)}</div></td>
                      <td>${escapeHtml(r.category)}${r.genre ? ` · ${escapeHtml(r.genre)}` : ''}</td>
                      <td><a href="${escapeHtml(r.legal_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.source_label || r.legal_url)}</a></td>
                      ${
                        canEdit
                          ? `<td><button type="button" class="btn btn-sm btn-danger" data-delete-resource="${r.id}">Delete</button></td>`
                          : ''
                      }
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : `<div class="empty-state">No resources match the current filter.</div>`
      }
    </section>
  `;
}

function renderSettingsHtml() {
  const s = state.settingsData?.settings || {};
  const env = state.settingsData?.environment || {};
  const isSuper = state.admin?.role === 'super_admin';

  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Bot Settings & AI Providers</h1>
        <p class="section-desc">API keys remain strictly inside server environment variables and are never shown or editable in browser responses.</p>
      </div>
    </div>

    <div class="grid-2">
      <section class="panel">
        <h2 class="panel-title">Runtime Bot Controls</h2>
        <form id="settings-form" class="form-grid" style="grid-template-columns:1fr;">
          <div class="checkbox-row">
            <input id="set-maintenance" name="maintenance_mode" type="checkbox" ${s.maintenance_mode ? 'checked' : ''} ${!isSuper ? 'disabled' : ''} />
            <label for="set-maintenance">Enable Maintenance Mode (temporarily pauses learner replies)</label>
          </div>
          <div class="field">
            <label for="set-banner">Welcome Banner (Arabic)</label>
            <input id="set-banner" name="welcome_banner_ar" type="text" value="${escapeHtml(s.welcome_banner_ar || '')}" ${!isSuper ? 'disabled' : ''} />
          </div>
          <div class="field">
            <label for="set-budget">Max Daily AI Requests per Learner</label>
            <input id="set-budget" name="max_daily_ai_requests" type="number" min="1" max="500" value="${Number(s.max_daily_ai_requests || 40)}" ${!isSuper ? 'disabled' : ''} />
          </div>
          <div class="field">
            <label for="set-ai-provider">Active AI Provider Override</label>
            <select id="set-ai-provider" name="ai_provider_override" ${!isSuper ? 'disabled' : ''}>
              <option value="" ${!s.ai_provider_override ? 'selected' : ''}>Use Environment Default (${escapeHtml(env.aiProvider)})</option>
              <option value="gemini" ${s.ai_provider_override === 'gemini' ? 'selected' : ''}>Google Gemini</option>
              <option value="openai" ${s.ai_provider_override === 'openai' ? 'selected' : ''}>OpenAI Compatible</option>
              <option value="anthropic" ${s.ai_provider_override === 'anthropic' ? 'selected' : ''}>Anthropic</option>
              <option value="disabled" ${s.ai_provider_override === 'disabled' ? 'selected' : ''}>Disabled (Deterministic Curriculum Only)</option>
            </select>
          </div>
          <div class="field">
            <label for="set-ai-model">AI Model Override (optional)</label>
            <input id="set-ai-model" name="ai_model_override" type="text" value="${escapeHtml(s.ai_model_override || '')}" placeholder="Env default: ${escapeHtml(env.aiModel || '')}" ${!isSuper ? 'disabled' : ''} />
          </div>
          ${isSuper ? `<button type="submit" class="btn btn-primary">Save Settings</button>` : '<p class="kpi-meta">Only super_admin can modify settings.</p>'}
        </form>
      </section>

      <section class="panel">
        <h2 class="panel-title">Environment Summary (Read-Only)</h2>
        <div class="table-wrap">
          <table>
            <tbody>
              <tr><th>Bot Name</th><td>${escapeHtml(env.botName)}</td></tr>
              <tr><th>Environment</th><td>${escapeHtml(env.nodeEnv)}</td></tr>
              <tr><th>AI Key Status</th><td>${env.aiConfigured ? 'Configured in env' : 'Not set (Fallback active)'}</td></tr>
              <tr><th>Search Provider</th><td>${escapeHtml(env.searchProvider)}</td></tr>
              <tr><th>TTS Provider</th><td>${escapeHtml(env.ttsProvider)} (${env.ttsConfigured ? 'Ready' : 'Disabled'})</td></tr>
              <tr><th>Image Provider</th><td>${escapeHtml(env.imageProvider || 'disabled')} (${env.imageConfigured ? 'Ready' : 'Disabled'})</td></tr>
              <tr><th>WhatsApp Phone</th><td>${env.whatsappConfigured ? 'Configured in WHATSAPP_NUMBER' : 'Unconfigured'}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    ${
      isSuper
        ? `<section class="panel">
            <div class="panel-header">
              <h2 class="panel-title">Staff Administrators (RBAC)</h2>
            </div>
            <form id="create-admin-form" class="form-grid">
              <div class="field">
                <label for="new-admin-user">Username</label>
                <input id="new-admin-user" name="username" type="text" required minlength="3" placeholder="editor_ali" />
              </div>
              <div class="field">
                <label for="new-admin-pass">Password</label>
                <input id="new-admin-pass" name="password" type="password" required minlength="8" placeholder="Min 8 chars" />
              </div>
              <div class="field">
                <label for="new-admin-role">Role</label>
                <select id="new-admin-role" name="role">
                  <option value="editor">Editor (Courses & Resources)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="super_admin">Super Admin (Full Control)</option>
                </select>
              </div>
              <div class="field" style="justify-content:flex-end;">
                <button type="submit" class="btn btn-primary">Create Staff Account</button>
              </div>
            </form>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Username</th><th>Role</th><th>Created</th><th>Last Login</th></tr>
                </thead>
                <tbody>
                  ${state.adminsList
                    .map(
                      (a) => `
                    <tr>
                      <td>${escapeHtml(a.username)}</td>
                      <td>${escapeHtml(a.role)}</td>
                      <td class="tabular">${escapeHtml(a.created_at)}</td>
                      <td class="tabular">${escapeHtml(a.last_login_at || 'Never')}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </section>`
        : ''
    }
  `;
}

function renderLogsHtml() {
  const logs = state.logsData || { errorLogs: [], auditLogs: [] };
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Audit Trail & Redacted Error Logs</h1>
        <p class="section-desc">All API keys, tokens, cookies, and WhatsApp session credentials are automatically redacted.</p>
      </div>
    </div>

    <div class="grid-2">
      <section class="panel">
        <h2 class="panel-title">Admin Activity Log (${logs.auditLogs.length})</h2>
        ${
          logs.auditLogs.length
            ? `<div class="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead>
                  <tbody>
                    ${logs.auditLogs
                      .slice(0, 30)
                      .map(
                        (a) => `
                      <tr>
                        <td class="tabular">${escapeHtml(a.created_at)}</td>
                        <td>${escapeHtml(a.admin_username)}</td>
                        <td>${escapeHtml(a.action)}</td>
                        <td class="tabular">${escapeHtml(a.target_type)} ${escapeHtml(a.target_id)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
            : `<div class="empty-state">No audit actions recorded yet.</div>`
        }
      </section>

      <section class="panel">
        <h2 class="panel-title">System Warnings & Errors (${logs.errorLogs.length})</h2>
        ${
          logs.errorLogs.length
            ? `<div class="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Level</th><th>Scope</th><th>Message</th></tr></thead>
                  <tbody>
                    ${logs.errorLogs
                      .slice(0, 30)
                      .map(
                        (e) => `
                      <tr>
                        <td class="tabular">${escapeHtml(e.timestamp.slice(0, 19).replace('T', ' '))}</td>
                        <td>${formatStatusLabel(e.level)}</td>
                        <td>${escapeHtml(e.scope)}</td>
                        <td>${escapeHtml(e.message)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
            : `<div class="empty-state">No warnings or errors recorded in the current runtime buffer.</div>`
        }
      </section>
    </div>
  `;
}

function bindShellEvents() {
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.activeTab = btn.getAttribute('data-nav');
      state.mobileNavOpen = false;
      state.notice = null;
      await loadTabData(state.activeTab);
      render();
    });
  });

  document.getElementById('mobile-nav-toggle')?.addEventListener('click', () => {
    state.mobileNavOpen = !state.mobileNavOpen;
    render();
  });

  document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
    state.mobileNavOpen = false;
    render();
  });

  document.getElementById('refresh-btn')?.addEventListener('click', async () => {
    state.notice = null;
    await loadTabData(state.activeTab);
    render();
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await api('/api/admin/auth/logout', { method: 'POST' }).catch(() => {});
    state.authenticated = false;
    state.admin = null;
    state.token = null;
    render();
  });
}

function bindTabEvents() {
  if (state.activeTab === 'users') {
    document.getElementById('user-search-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      state.userSearch = document.getElementById('user-search-input').value.trim();
      await loadTabData('users');
      render();
    });

    document.querySelectorAll('[data-view-user]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-view-user');
        state.selectedUserDetail = await api(`/api/admin/users/${id}/summary`);
        render();
      });
    });

    document.getElementById('close-user-detail')?.addEventListener('click', () => {
      state.selectedUserDetail = null;
      render();
    });

    document.querySelectorAll('[data-delete-user]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-user');
        await api(`/api/admin/users/${id}`, { method: 'DELETE' });
        state.notice = `User #${id} deleted.`;
        state.selectedUserDetail = null;
        await loadTabData('users');
        render();
      });
    });
  }

  if (state.activeTab === 'curriculum') {
    document.getElementById('create-course-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      await api('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          category: form.category.value,
          subject: form.subject.value.trim().toLowerCase(),
          title_ar: form.title_ar.value.trim(),
          level: form.level.value,
          description_ar: form.description_ar.value.trim(),
          is_published: true,
        }),
      });
      state.notice = 'Course created and saved to SQLite.';
      await loadTabData('curriculum');
      render();
    });

    document.getElementById('create-lesson-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      await api('/api/admin/lessons', {
        method: 'POST',
        body: JSON.stringify({
          course_id: Number(form.course_id.value),
          lesson_type: form.lesson_type.value,
          title_ar: form.title_ar.value.trim(),
          content_ar: form.content_ar.value.trim(),
          is_published: true,
        }),
      });
      state.notice = 'Lesson created and published.';
      await loadTabData('curriculum');
      render();
    });

    document.querySelectorAll('[data-delete-lesson]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-lesson');
        await api(`/api/admin/lessons/${id}`, { method: 'DELETE' });
        state.notice = `Lesson #${id} removed.`;
        await loadTabData('curriculum');
        render();
      });
    });
  }

  if (state.activeTab === 'library') {
    document.querySelectorAll('[data-res-kind]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        state.resourceKindFilter = btn.getAttribute('data-res-kind');
        await loadTabData('library');
        render();
      });
    });

    document.getElementById('create-resource-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      try {
        await api('/api/admin/resources', {
          method: 'POST',
          body: JSON.stringify({
            kind: form.kind.value,
            title: form.title.value.trim(),
            title_ar: form.title_ar.value.trim(),
            category: form.category.value.trim(),
            genre: form.genre.value.trim(),
            legal_url: form.legal_url.value.trim(),
            description_ar: form.description_ar.value.trim(),
            is_authorized: true,
            is_published: true,
          }),
        });
        state.notice = 'Authorized resource added to catalog.';
        await loadTabData('library');
        render();
      } catch (err) {
        state.error = err.message;
        render();
      }
    });

    document.querySelectorAll('[data-delete-resource]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-resource');
        await api(`/api/admin/resources/${id}`, { method: 'DELETE' });
        state.notice = `Resource #${id} deleted.`;
        await loadTabData('library');
        render();
      });
    });
  }

  if (state.activeTab === 'settings') {
    document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      await api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          maintenance_mode: form.maintenance_mode.checked,
          welcome_banner_ar: form.welcome_banner_ar.value.trim(),
          max_daily_ai_requests: Number(form.max_daily_ai_requests.value),
          ai_provider_override: form.ai_provider_override.value || null,
          ai_model_override: form.ai_model_override.value.trim() || null,
        }),
      });
      state.notice = 'Bot settings updated.';
      await loadTabData('settings');
      render();
    });

    document.getElementById('create-admin-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      try {
        await api('/api/admin/auth/admins', {
          method: 'POST',
          body: JSON.stringify({
            username: form.username.value.trim(),
            password: form.password.value,
            role: form.role.value,
          }),
        });
        state.notice = 'Staff administrator account created.';
        await loadTabData('settings');
        render();
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
  }
}

init();
