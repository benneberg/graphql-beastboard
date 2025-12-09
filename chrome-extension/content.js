// ===== content.js =====
(function() {
  'use strict';

  let dashboard = null;
  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX = 0;
  let initialY = 0;
  let isResizing = false;
  let queryEditor = null;
  let variablesEditor = null;
  let ws = null;
  let queryTimingData = {};
  let lastSchemaData = null;

  const STORAGE_KEY = 'graphql-dashboard-state';

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
      toggleDashboard();
    }
  });

  function toggleDashboard() {
    if (dashboard && dashboard.parentNode) {
      if (dashboard.classList.contains('gql-minimized')) {
        expandDashboard();
      } else if (dashboard.style.display === 'none') {
        dashboard.style.display = 'flex';
        saveState();
      } else {
        dashboard.style.display = 'none';
        saveState();
      }
    } else {
      createDashboard();
    }
  }

  function createDashboard() {
    if (dashboard) return;

    // Inject CodeMirror CSS
    injectCodeMirrorStyles();

    dashboard = document.createElement('div');
    dashboard.id = 'graphql-dashboard-overlay';
    dashboard.className = 'gql-dashboard';
    
    dashboard.innerHTML = `
      <div class="gql-header">
        <div class="gql-drag-handle">
          <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
          </svg>
          <span class="gql-title">GraphQL Dashboard Ultimate</span>
        </div>
        <div class="gql-header-actions">
          <button class="gql-btn-icon" id="gql-theme-btn" title="Toggle Theme">
            <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
          </button>
          <button class="gql-btn-icon" id="gql-export-btn" title="Export Config">
            <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
          </button>
          <button class="gql-btn-icon" id="gql-edu-btn" title="Learning Center">
            <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </button>
          <button class="gql-btn-icon" id="gql-settings-btn" title="Settings">
            <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
          <button class="gql-btn-icon" id="gql-minimize-btn" title="Minimize">
            <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
          </button>
          <button class="gql-btn-icon" id="gql-close-btn" title="Close">
            <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="gql-content">
        <!-- Settings Modal -->
        <div id="gql-settings-modal" class="gql-modal hidden">
          <div class="gql-modal-content">
            <div class="gql-modal-header">
              <h2>Settings</h2>
              <button class="gql-btn-icon" id="gql-close-settings">
                <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div class="gql-tabs-container">
              <div class="gql-tabs-header">
                <button class="gql-settings-tab gql-tab-active" data-tab="graphql">GraphQL</button>
                <button class="gql-settings-tab" data-tab="ai">AI Assistant</button>
              </div>

              <div id="gql-graphql-settings" class="gql-settings-content">
                <div class="gql-form-group">
                  <label>GraphQL Endpoint</label>
                  <input id="gql-endpoint-input" type="url" placeholder="https://api.example.com/graphql">
                </div>
                <div class="gql-form-group">
                  <label>API Key (Optional)</label>
                  <input id="gql-apikey-input" type="password" placeholder="Your API key">
                </div>
                <div class="gql-form-group">
                  <label>WebSocket Endpoint (Optional)</label>
                  <input id="gql-ws-input" type="url" placeholder="wss://api.example.com/graphql">
                </div>
              </div>

              <div id="gql-ai-settings" class="gql-settings-content hidden">
                <div class="gql-form-group">
                  <label>AI Provider</label>
                  <select id="gql-ai-provider">
                    <option value="azure">Azure OpenAI</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </div>
                <div class="gql-form-group">
                  <label>API Key</label>
                  <input id="gql-ai-key" type="password" placeholder="Your AI API key">
                </div>
                <div id="gql-azure-fields">
                  <div class="gql-form-group">
                    <label>Deployment URL</label>
                    <input id="gql-deployment-url" type="url" placeholder="Azure deployment URL">
                  </div>
                </div>
                <div class="gql-form-group">
                  <label>Max Tokens</label>
                  <div class="gql-slider-group">
                    <input id="gql-max-tokens" type="range" min="100" max="2000" step="100" value="800">
                    <span id="gql-max-tokens-label">800</span>
                  </div>
                </div>
              </div>
            </div>

            <button id="gql-save-settings" class="gql-btn-primary">Save Configuration</button>
          </div>
        </div>

        <!-- Education Panel -->
        <div id="gql-edu-panel" class="gql-edu-panel hidden">
          <div class="gql-edu-header">
            <h3>Learning Center</h3>
            <button class="gql-btn-icon" id="gql-close-edu">
              <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="gql-edu-content">
            <div class="gql-edu-section">
              <h4>GraphQL Basics</h4>
              <div class="gql-edu-item">
                <strong>Queries</strong>
                <p>Read data from your API with precise field selection.</p>
                <code>query { user(id: "1") { name email } }</code>
              </div>
              <div class="gql-edu-item">
                <strong>Mutations</strong>
                <p>Modify server data (POST, PUT, DELETE operations).</p>
                <code>mutation { createUser(name: "John") { id } }</code>
              </div>
              <div class="gql-edu-item">
                <strong>Subscriptions</strong>
                <p>Real-time updates via WebSocket connections.</p>
                <code>subscription { messageAdded { id text } }</code>
              </div>
            </div>
            <div class="gql-edu-section">
              <h4>Best Practices</h4>
              <ul>
                <li>Request only needed fields</li>
                <li>Use fragments for reusability</li>
                <li>Implement proper error handling</li>
                <li>Use variables for dynamic values</li>
                <li>Leverage introspection</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Status -->
        <div id="gql-status" class="gql-status hidden"></div>

        <!-- AI Assistant -->
        <div class="gql-ai-panel">
          <div class="gql-ai-header">
            <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
            <span>AI Query Generator</span>
          </div>
          <textarea id="gql-ai-prompt" placeholder="Describe the query you want in natural language..." rows="2"></textarea>
          <div class="gql-ai-actions">
            <button id="gql-ai-generate" class="gql-btn-primary gql-btn-sm">Generate Query</button>
            <button id="gql-ai-optimize" class="gql-btn-secondary gql-btn-sm">Optimize Current</button>
          </div>
          <div id="gql-ai-metrics" class="gql-ai-metrics hidden"></div>
        </div>

        <!-- Main Tabs -->
        <div class="gql-main-tabs">
          <button class="gql-main-tab gql-tab-active" data-tab="query">Query Builder</button>
          <button class="gql-main-tab" data-tab="schema">Schema</button>
          <button class="gql-main-tab" data-tab="history">History</button>
          <button class="gql-main-tab" data-tab="favorites">Favorites</button>
        </div>

        <!-- Query Builder -->
        <div id="gql-query-tab" class="gql-tab-content gql-tab-active">
          <div class="gql-query-actions">
            <select id="gql-operation-type" class="gql-select">
              <option value="query">Query</option>
              <option value="mutation">Mutation</option>
              <option value="subscription">Subscription</option>
            </select>
            <button id="gql-execute" class="gql-btn-success gql-btn-sm">▶ Execute</button>
            <button id="gql-subscribe" class="gql-btn-warning gql-btn-sm">Subscribe</button>
            <button id="gql-validate" class="gql-btn-secondary gql-btn-sm">Validate</button>
            <button id="gql-format" class="gql-btn-secondary gql-btn-sm">Format</button>
            <button id="gql-save-query" class="gql-btn-secondary gql-btn-sm">⭐ Save</button>
          </div>
          <div class="gql-editor-container">
            <label class="gql-label">Query Editor</label>
            <textarea id="gql-query-editor"></textarea>
          </div>
          <div class="gql-editor-container">
            <label class="gql-label">Variables (JSON)</label>
            <textarea id="gql-variables-editor"></textarea>
          </div>
          <div id="gql-query-result" class="gql-result-container hidden">
            <div class="gql-result-tabs">
              <button class="gql-result-tab gql-tab-active" data-tab="response">Response</button>
              <button class="gql-result-tab" data-tab="headers">Headers</button>
              <button class="gql-result-tab" data-tab="timing">Timing</button>
            </div>
            <div id="gql-response-content" class="gql-result-content">
              <div class="gql-result-header">
                <span>Response</span>
                <button id="gql-copy-response" class="gql-btn-secondary gql-btn-sm">Copy</button>
              </div>
              <div id="gql-response-display" class="gql-code-display"></div>
            </div>
            <div id="gql-headers-content" class="gql-result-content hidden">
              <div class="gql-result-header">
                <span>Headers</span>
              </div>
              <div id="gql-headers-display" class="gql-code-display"></div>
            </div>
            <div id="gql-timing-content" class="gql-result-content hidden">
              <div class="gql-result-header">
                <span>Timing</span>
              </div>
              <div id="gql-timing-display" class="gql-timing-display"></div>
            </div>
          </div>
        </div>

        <!-- Schema Explorer -->
        <div id="gql-schema-tab" class="gql-tab-content">
          <div class="gql-schema-actions">
            <button id="gql-introspect" class="gql-btn-primary gql-btn-sm">
              <svg class="gql-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              Introspect Schema
            </button>
          </div>
          <div id="gql-schema-result" class="hidden">
            <div class="gql-schema-download">
              <button id="gql-copy-schema" class="gql-btn-secondary gql-btn-sm">Copy</button>
              <button id="gql-download-sdl" class="gql-btn-secondary gql-btn-sm">Download SDL</button>
              <button id="gql-download-json" class="gql-btn-secondary gql-btn-sm">Download JSON</button>
            </div>
            <div id="gql-schema-display" class="gql-code-display"></div>
          </div>
        </div>

        <!-- History -->
        <div id="gql-history-tab" class="gql-tab-content">
          <div class="gql-history-header">
            <span>Query History</span>
            <button id="gql-clear-history" class="gql-btn-danger gql-btn-sm">Clear All</button>
          </div>
          <div id="gql-history-list" class="gql-list"></div>
        </div>

        <!-- Favorites -->
        <div id="gql-favorites-tab" class="gql-tab-content">
          <div class="gql-favorites-header">
            <span>Favorite Queries</span>
          </div>
          <div id="gql-favorites-list" class="gql-list"></div>
        </div>
      </div>

      <div class="gql-resize-handle"></div>
    `;

    document.body.appendChild(dashboard);
    loadState();
    initEventListeners();
    initEditors();
    loadConfig();
    renderHistory();
    renderFavorites();
  }

  function injectCodeMirrorStyles() {
    if (document.getElementById('gql-codemirror-styles')) return;
    
    const link = document.createElement('link');
    link.id = 'gql-codemirror-styles';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css';
    document.head.appendChild(link);

    const theme = document.createElement('link');
    theme.rel = 'stylesheet';
    theme.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/dracula.min.css';
    document.head.appendChild(theme);
  }

  function initEditors() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js';
    script.onload = () => {
      const modeScript = document.createElement('script');
      modeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/javascript/javascript.min.js';
      modeScript.onload = () => {
        try {
          const queryTextarea = dashboard.querySelector('#gql-query-editor');
          const variablesTextarea = dashboard.querySelector('#gql-variables-editor');

          if (window.CodeMirror && queryTextarea && variablesTextarea) {
            queryEditor = window.CodeMirror.fromTextArea(queryTextarea, {
              lineNumbers: true,
              mode: 'javascript',
              theme: 'dracula',
              lineWrapping: true
            });
            queryEditor.setSize(null, 150);

            variablesEditor = window.CodeMirror.fromTextArea(variablesTextarea, {
              lineNumbers: true,
              mode: { name: 'javascript', json: true },
              theme: 'dracula',
              lineWrapping: true
            });
            variablesEditor.setSize(null, 80);
          }
        } catch (e) {
          console.error('CodeMirror init failed:', e);
        }
      };
      document.head.appendChild(modeScript);
    };
    document.head.appendChild(script);
  }

  function initEventListeners() {
    // Dragging
    const header = dashboard.querySelector('.gql-drag-handle');
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Resizing
    const resizeHandle = dashboard.querySelector('.gql-resize-handle');
    resizeHandle.addEventListener('mousedown', resizeStart);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', resizeEnd);

    // Header buttons
    dashboard.querySelector('#gql-minimize-btn').addEventListener('click', minimizeDashboard);
    dashboard.querySelector('#gql-close-btn').addEventListener('click', () => {
      dashboard.style.display = 'none';
      saveState();
    });
    dashboard.querySelector('#gql-theme-btn').addEventListener('click', toggleTheme);
    dashboard.querySelector('#gql-export-btn').addEventListener('click', exportConfig);
    dashboard.querySelector('#gql-settings-btn').addEventListener('click', () => {
      dashboard.querySelector('#gql-settings-modal').classList.remove('hidden');
    });
    dashboard.querySelector('#gql-edu-btn').addEventListener('click', () => {
      dashboard.querySelector('#gql-edu-panel').classList.toggle('hidden');
    });

    // Modal controls
    dashboard.querySelector('#gql-close-settings').addEventListener('click', () => {
      dashboard.querySelector('#gql-settings-modal').classList.add('hidden');
    });
    dashboard.querySelector('#gql-close-edu').addEventListener('click', () => {
      dashboard.querySelector('#gql-edu-panel').classList.add('hidden');
    });

    // Settings tabs
    dashboard.querySelectorAll('.gql-settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        dashboard.querySelectorAll('.gql-settings-tab').forEach(t => {
          t.classList.remove('gql-tab-active');
        });
        tab.classList.add('gql-tab-active');
        dashboard.querySelectorAll('.gql-settings-content').forEach(c => c.classList.add('hidden'));
        dashboard.querySelector(`#gql-${tabName}-settings`).classList.remove('hidden');
      });
    });

    // Main tabs
    dashboard.querySelectorAll('.gql-main-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        dashboard.querySelectorAll('.gql-main-tab').forEach(t => t.classList.remove('gql-tab-active'));
        tab.classList.add('gql-tab-active');
        dashboard.querySelectorAll('.gql-tab-content').forEach(c => c.classList.remove('gql-tab-active'));
        dashboard.querySelector(`#gql-${tabName}-tab`).classList.add('gql-tab-active');
      });
    });

    // Result tabs
    dashboard.querySelectorAll('.gql-result-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        dashboard.querySelectorAll('.gql-result-tab').forEach(t => t.classList.remove('gql-tab-active'));
        tab.classList.add('gql-tab-active');
        dashboard.querySelectorAll('.gql-result-content').forEach(c => c.classList.add('hidden'));
        dashboard.querySelector(`#gql-${tabName}-content`).classList.remove('hidden');
      });
    });

    // Settings
    dashboard.querySelector('#gql-ai-provider').addEventListener('change', updateAIProviderFields);
    dashboard.querySelector('#gql-max-tokens').addEventListener('input', (e) => {
      dashboard.querySelector('#gql-max-tokens-label').textContent = e.target.value;
    });
    dashboard.querySelector('#gql-save-settings').addEventListener('click', saveSettings);

    // Query actions
    dashboard.querySelector('#gql-execute').addEventListener('click', executeQuery);
    dashboard.querySelector('#gql-subscribe').addEventListener('click', subscribeToUpdates);
    dashboard.querySelector('#gql-validate').addEventListener('click', validateQuery);
    dashboard.querySelector('#gql-format').addEventListener('click', formatQuery);
    dashboard.querySelector('#gql-save-query').addEventListener('click', saveQuery);
    dashboard.querySelector('#gql-copy-response').addEventListener('click', copyResponse);

    // Schema actions
    dashboard.querySelector('#gql-introspect').addEventListener('click', introspectSchema);
    dashboard.querySelector('#gql-copy-schema').addEventListener('click', copySchema);
    dashboard.querySelector('#gql-download-sdl').addEventListener('click', downloadSDL);
    dashboard.querySelector('#gql-download-json').addEventListener('click', downloadJSON);

    // History
    dashboard.querySelector('#gql-clear-history').addEventListener('click', clearHistory);

    // AI actions
    dashboard.querySelector('#gql-ai-generate').addEventListener('click', generateQuery);
    dashboard.querySelector('#gql-ai-optimize').addEventListener('click', optimizeQuery);
  }

  // Drag and resize functions
  function dragStart(e) {
    if (dashboard.classList.contains('gql-minimized')) return;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    if (e.target.closest('.gql-drag-handle')) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      dashboard.style.left = currentX + 'px';
      dashboard.style.top = currentY + 'px';
    }
  }

  function dragEnd() {
    if (isDragging) {
      isDragging = false;
      saveState();
    }
  }

  function resizeStart(e) {
    if (dashboard.classList.contains('gql-minimized')) return;
    isResizing = true;
    e.preventDefault();
  }

  function resize(e) {
    if (isResizing) {
      const rect = dashboard.getBoundingClientRect();
      const width = e.clientX - rect.left;
      const height = e.clientY - rect.top;
      
      if (width > 400) dashboard.style.width = width + 'px';
      if (height > 500) dashboard.style.height = height + 'px';
    }
  }

  function resizeEnd() {
    if (isResizing) {
      isResizing = false;
      saveState();
    }
  }

  function minimizeDashboard() {
    dashboard.classList.add('gql-minimized');
    dashboard.innerHTML = `
      <button class="gql-floating-btn" id="gql-expand-btn">
        <svg class="gql-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
    `;
    dashboard.querySelector('#gql-expand-btn').addEventListener('click', expandDashboard);
    saveState();
  }

  function expandDashboard() {
    dashboard.classList.remove('gql-minimized');
    createDashboard();
    saveState();
  }

  function toggleTheme() {
    dashboard.classList.toggle('gql-light-theme');
    showStatus('Theme toggled', 'info');
  }

  async function loadConfig() {
    const result = await chrome.storage.local.get('gql-config');
    if (result['gql-config']) {
      const config = result['gql-config'];
      dashboard.querySelector('#gql-endpoint-input').value = config.endpoint || '';
      dashboard.querySelector('#gql-apikey-input').value = config.apiKey || '';
      dashboard.querySelector('#gql-ws-input').value = config.wsEndpoint || '';
      dashboard.querySelector('#gql-ai-provider').value = config.aiProvider || 'azure';
      dashboard.querySelector('#gql-ai-key').value = config.aiKey || '';
      dashboard.querySelector('#gql-deployment-url').value = config.deploymentUrl || '';
      dashboard.querySelector('#gql-max-tokens').value = config.maxTokens || 800;
      dashboard.querySelector('#gql-max-tokens-label').textContent = config.maxTokens || 800;
      updateAIProviderFields();
    }
  }

  async function saveSettings() {
    const config = {
      endpoint: dashboard.querySelector('#gql-endpoint-input').value,
      apiKey: dashboard.querySelector('#gql-apikey-input').value,
      wsEndpoint: dashboard.querySelector('#gql-ws-input').value,
      aiProvider: dashboard.querySelector('#gql-ai-provider').value,
      aiKey: dashboard.querySelector('#gql-ai-key').value,
      deploymentUrl: dashboard.querySelector('#gql-deployment-url').value,
      maxTokens: parseInt(dashboard.querySelector('#gql-max-tokens').value)
    };
    
    await chrome.storage.local.set({ 'gql-config': config });
    dashboard.querySelector('#gql-settings-modal').classList.add('hidden');
    showStatus('Configuration saved', 'success');
  }

  function updateAIProviderFields() {
    const provider = dashboard.querySelector('#gql-ai-provider').value;
    const azureFields = dashboard.querySelector('#gql-azure-fields');
    azureFields.style.display = provider === 'azure' ? 'block' : 'none';
  }

  async function executeQuery() {
    if (!queryEditor) return;
    
    const query = queryEditor.getValue();
    const variablesText = variablesEditor.getValue();
    
    if (!query.trim()) {
      showStatus('Please enter a query', 'error');
      return;
    }

    let variables = null;
    if (variablesText.trim()) {
      try {
        variables = JSON.parse(variablesText);
      } catch (e) {
        showStatus('Invalid JSON in variables', 'error');
        return;
      }
    }

    try {
      const result = await graphqlRequest(query, variables);
      displayResponse(result.data);
      displayHeaders(result.headers);
      displayTiming();
      dashboard.querySelector('#gql-query-result').classList.remove('hidden');
      showStatus('Query executed successfully', 'success');
      addToHistory(query, variables);
    } catch (error) {
      displayResponse({ error: error.message }, true);
      dashboard.querySelector('#gql-query-result').classList.remove('hidden');
      showStatus('Error: ' + error.message, 'error');
    }
  }

  async function graphqlRequest(query, variables = null) {
    const result = await chrome.storage.local.get('gql-config');
    const config = result['gql-config'] || {};
    
    if (!config.endpoint) {
      throw new Error('Please configure your GraphQL endpoint');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const startTime = performance.now();
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables })
    });
    const endTime = performance.now();

    queryTimingData = {
      duration: Math.round(endTime - startTime),
      timestamp: new Date().toISOString(),
      status: response.status,
      statusText: response.statusText
    };

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const data = await response.json();
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return { data, headers: responseHeaders };
  }

  function subscribeToUpdates() {
    chrome.storage.local.get('gql-config', (result) => {
      const config = result['gql-config'] || {};
      const endpoint = config.wsEndpoint || config.endpoint?.replace(/^http/, 'ws');
      
      if (ws) {
        ws.close();
        showStatus('WebSocket closed', 'info');
        return;
      }

      try {
        ws = new WebSocket(endpoint);
        
        ws.onopen = () => {
          showStatus('WebSocket connected', 'success');
          const query = queryEditor.getValue();
          const variablesText = variablesEditor.getValue();
          let variables = null;
          
          if (variablesText.trim()) {
            try {
              variables = JSON.parse(variablesText);
            } catch (e) {
              showStatus('Invalid JSON in variables', 'error');
              return;
            }
          }

          ws.send(JSON.stringify({
            type: 'start',
            payload: { query, variables }
          }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          displayResponse(data);
          dashboard.querySelector('#gql-query-result').classList.remove('hidden');
        };

        ws.onerror = () => showStatus('WebSocket error', 'error');
        ws.onclose = () => {
          showStatus('WebSocket disconnected', 'info');
          ws = null;
        };
      } catch (error) {
        showStatus('WebSocket failed: ' + error.message, 'error');
      }
    });
  }

  function validateQuery() {
    const query = queryEditor.getValue();
    if (!query.trim()) {
      showStatus('No query to validate', 'error');
      return;
    }
    if (query.includes('query') || query.includes('mutation') || query.includes('subscription')) {
      showStatus('Query syntax looks valid', 'success');
    } else {
      showStatus('Query might be missing operation type', 'error');
    }
  }

  function formatQuery() {
    try {
      const query = queryEditor.getValue();
      const formatted = query
        .replace(/\s+/g, ' ')
        .replace(/{\s*/g, ' {\n  ')
        .replace(/\s*}/g, '\n}')
        .replace(/,\s*/g, ',\n  ');
      queryEditor.setValue(formatted.trim());
      showStatus('Query formatted', 'success');
    } catch (e) {
      showStatus('Error formatting query', 'error');
    }
  }

  function saveQuery() {
    const query = queryEditor.getValue();
    const variables = variablesEditor.getValue();
    
    if (!query.trim()) {
      showStatus('No query to save', 'error');
      return;
    }

    const name = prompt('Enter a name for this query:');
    if (!name) return;

    chrome.storage.local.get('gql-favorites', (result) => {
      let favorites = result['gql-favorites'] || [];
      favorites.push({
        name,
        query,
        variables,
        timestamp: new Date().toISOString(),
        id: Date.now()
      });
      chrome.storage.local.set({ 'gql-favorites': favorites });
      renderFavorites();
      showStatus('Query saved to favorites', 'success');
    });
  }

  async function introspectSchema() {
    const btn = dashboard.querySelector('#gql-introspect');
    btn.disabled = true;
    btn.textContent = 'Loading...';

    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            kind name description
            fields(includeDeprecated: true) {
              name description
              args {
                name description
                type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
                defaultValue
              }
              type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
            }
          }
        }
      }
    `;

    try {
      const result = await graphqlRequest(introspectionQuery);
      const schema = result.data.data.__schema;
      lastSchemaData = result.data;
      
      displaySchema(schema);
      dashboard.querySelector('#gql-schema-result').classList.remove('hidden');
      showStatus('Schema introspected successfully', 'success');
    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="gql-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        Introspect Schema
      `;
    }
  }

  function displaySchema(schema) {
    const display = dashboard.querySelector('#gql-schema-display');
    const types = schema.types.filter(t => !t.name.startsWith('__'));
    
    let html = '<div class="gql-schema-types">';
    types.forEach(type => {
      if (type.kind === 'OBJECT') {
        html += `<div class="gql-type-block">`;
        html += `<div class="gql-type-name">type ${type.name} {</div>`;
        if (type.fields) {
          type.fields.forEach(field => {
            html += `<div class="gql-field">${field.name}: ${getTypeName(field.type)}</div>`;
          });
        }
        html += `<div class="gql-type-name">}</div></div>`;
      }
    });
    html += '</div>';
    display.innerHTML = html;
  }

  function getTypeName(type) {
    if (type.kind === 'NON_NULL') {
      return getTypeName(type.ofType) + '!';
    }
    if (type.kind === 'LIST') {
      return '[' + getTypeName(type.ofType) + ']';
    }
    return type.name;
  }

  function copySchema() {
    const text = dashboard.querySelector('#gql-schema-display').innerText;
    navigator.clipboard.writeText(text);
    showStatus('Schema copied to clipboard', 'success');
  }

  function downloadSDL() {
    const text = dashboard.querySelector('#gql-schema-display').innerText;
    downloadFile(text, 'schema.graphql', 'text/plain');
    showStatus('Schema SDL downloaded', 'success');
  }

  function downloadJSON() {
    if (lastSchemaData) {
      const json = JSON.stringify(lastSchemaData, null, 2);
      downloadFile(json, 'schema.json', 'application/json');
      showStatus('Schema JSON downloaded', 'success');
    }
  }

  function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function displayResponse(data, isError = false) {
    const display = dashboard.querySelector('#gql-response-display');
    display.innerHTML = formatJSON(JSON.stringify(data, null, 2), isError);
  }

  function displayHeaders(headers) {
    const display = dashboard.querySelector('#gql-headers-display');
    display.innerHTML = formatJSON(JSON.stringify(headers, null, 2));
  }

  function displayTiming() {
    const display = dashboard.querySelector('#gql-timing-display');
    display.innerHTML = `
      <div class="gql-timing-item">
        <span>Duration:</span>
        <span class="gql-timing-value">${queryTimingData.duration}ms</span>
      </div>
      <div class="gql-timing-item">
        <span>Status:</span>
        <span class="gql-timing-value">${queryTimingData.status} ${queryTimingData.statusText}</span>
      </div>
      <div class="gql-timing-item">
        <span>Timestamp:</span>
        <span class="gql-timing-value">${new Date(queryTimingData.timestamp).toLocaleString()}</span>
      </div>
    `;
  }

  function formatJSON(json, isError = false) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
      let cls = 'gql-json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'gql-json-key';
        } else {
          cls = isError ? 'gql-json-error' : 'gql-json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'gql-json-boolean';
      } else if (/null/.test(match)) {
        cls = 'gql-json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  }

  function copyResponse() {
    const text = dashboard.querySelector('#gql-response-display').innerText;
    navigator.clipboard.writeText(text);
    showStatus('Response copied to clipboard', 'success');
  }

  function addToHistory(query, variables = null) {
    chrome.storage.local.get('gql-history', (result) => {
      let history = result['gql-history'] || [];
      history.unshift({
        query,
        variables,
        timestamp: new Date().toISOString(),
        id: Date.now()
      });
      chrome.storage.local.set({ 'gql-history': history.slice(0, 50) });
      renderHistory();
    });
  }

  function renderHistory() {
    chrome.storage.local.get('gql-history', (result) => {
      const history = result['gql-history'] || [];
      const container = dashboard.querySelector('#gql-history-list');
      
      if (history.length === 0) {
        container.innerHTML = '<div class="gql-empty">No query history yet</div>';
        return;
      }

      container.innerHTML = history.map(item => `
        <div class="gql-list-item" data-id="${item.id}">
          <div class="gql-list-item-content">
            <code class="gql-list-item-query">${item.query.split('\n')[0]}</code>
            <small class="gql-list-item-time">${new Date(item.timestamp).toLocaleString()}</small>
          </div>
          <button class="gql-list-item-delete" data-id="${item.id}">
            <svg class="gql-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      `).join('');

      container.querySelectorAll('.gql-list-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.closest('.gql-list-item-delete')) {
            const id = parseInt(item.dataset.id);
            const historyItem = history.find(h => h.id === id);
            if (historyItem && queryEditor) {
              queryEditor.setValue(historyItem.query);
              if (historyItem.variables) {
                variablesEditor.setValue(JSON.stringify(historyItem.variables, null, 2));
              }
              showStatus('Query loaded from history', 'success');
            }
          }
        });
      });

      container.querySelectorAll('.gql-list-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          deleteFromHistory(id);
        });
      });
    });
  }

  function deleteFromHistory(id) {
    chrome.storage.local.get('gql-history', (result) => {
      let history = result['gql-history'] || [];
      history = history.filter(h => h.id !== id);
      chrome.storage.local.set({ 'gql-history': history });
      renderHistory();
      showStatus('Deleted from history', 'info');
    });
  }

  function clearHistory() {
    if (confirm('Clear all history?')) {
      chrome.storage.local.remove('gql-history');
      renderHistory();
      showStatus('History cleared', 'info');
    }
  }

  function renderFavorites() {
    chrome.storage.local.get('gql-favorites', (result) => {
      const favorites = result['gql-favorites'] || [];
      const container = dashboard.querySelector('#gql-favorites-list');
      
      if (favorites.length === 0) {
        container.innerHTML = '<div class="gql-empty">No favorite queries yet</div>';
        return;
      }

      container.innerHTML = favorites.map(item => `
        <div class="gql-favorite-item">
          <div class="gql-favorite-header">
            <span class="gql-favorite-name">${item.name}</span>
            <div class="gql-favorite-actions">
              <button class="gql-favorite-load" data-id="${item.id}" title="Load">
                <svg class="gql-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                </svg>
              </button>
              <button class="gql-favorite-delete" data-id="${item.id}" title="Delete">
                <svg class="gql-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
          <code class="gql-favorite-query">${item.query.split('\n')[0]}</code>
          <small class="gql-favorite-time">${new Date(item.timestamp).toLocaleString()}</small>
        </div>
      `).join('');

      container.querySelectorAll('.gql-favorite-load').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id);
          const favorite = favorites.find(f => f.id === id);
          if (favorite && queryEditor) {
            queryEditor.setValue(favorite.query);
            if (favorite.variables) {
              variablesEditor.setValue(favorite.variables);
            }
            showStatus('Loaded: ' + favorite.name, 'success');
          }
        });
      });

      container.querySelectorAll('.gql-favorite-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id);
          deleteFromFavorites(id);
        });
      });
    });
  }

  function deleteFromFavorites(id) {
    chrome.storage.local.get('gql-favorites', (result) => {
      let favorites = result['gql-favorites'] || [];
      favorites = favorites.filter(f => f.id !== id);
      chrome.storage.local.set({ 'gql-favorites': favorites });
      renderFavorites();
      showStatus('Deleted from favorites', 'info');
    });
  }

  async function generateQuery() {
    const prompt = dashboard.querySelector('#gql-ai-prompt').value.trim();
    if (!prompt) {
      showStatus('Please enter a prompt', 'error');
      return;
    }

    const result = await chrome.storage.local.get('gql-config');
    const config = result['gql-config'] || {};
    
    if (!config.aiKey) {
      showStatus('Please configure AI settings', 'error');
      return;
    }

    const startTime = performance.now();

    try {
      let generatedQuery = '';
      if (config.aiProvider === 'azure') {
        generatedQuery = await generateWithAzure(prompt, config);
      } else if (config.aiProvider === 'openai') {
        generatedQuery = await generateWithOpenAI(prompt, config);
      } else if (config.aiProvider === 'anthropic') {
        generatedQuery = await generateWithAnthropic(prompt, config);
      }

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (queryEditor) {
        queryEditor.setValue(generatedQuery);
        showStatus('Query generated successfully!', 'success');

        const metricsDiv = dashboard.querySelector('#gql-ai-metrics');
        metricsDiv.innerHTML = `
          <div><strong>Provider:</strong> ${config.aiProvider}</div>
          <div><strong>Latency:</strong> ${latency}ms</div>
          <div><strong>Max Tokens:</strong> ${config.maxTokens}</div>
        `;
        metricsDiv.classList.remove('hidden');

        addToHistory(generatedQuery);
      }
    } catch (error) {
      showStatus('AI Error: ' + error.message, 'error');
    }
  }

  async function optimizeQuery() {
    if (!queryEditor) return;
    const currentQuery = queryEditor.getValue();
    
    if (!currentQuery.trim()) {
      showStatus('No query to optimize', 'error');
      return;
    }

    const result = await chrome.storage.local.get('gql-config');
    const config = result['gql-config'] || {};
    
    if (!config.aiKey) {
      showStatus('Please configure AI settings', 'error');
      return;
    }

    const prompt = `Optimize this GraphQL query:\n\n${currentQuery}`;

    try {
      let optimizedQuery = '';
      if (config.aiProvider === 'azure') {
        optimizedQuery = await generateWithAzure(prompt, config);
      } else if (config.aiProvider === 'openai') {
        optimizedQuery = await generateWithOpenAI(prompt, config);
      } else if (config.aiProvider === 'anthropic') {
        optimizedQuery = await generateWithAnthropic(prompt, config);
      }

      queryEditor.setValue(optimizedQuery);
      showStatus('Query optimized!', 'success');
    } catch (error) {
      showStatus('AI Error: ' + error.message, 'error');
    }
  }

  async function generateWithAzure(prompt, config) {
    const apiVersion = '2023-07-01-preview';
    const url = `${config.deploymentUrl}/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.aiKey
      },
      body: JSON.stringify({
        prompt: `Convert this to a GraphQL query:\n${prompt}\n\nGraphQL Query:`,
        temperature: 0,
        max_tokens: config.maxTokens
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.text?.trim() || 'No query generated';
  }

  async function generateWithOpenAI(prompt, config) {
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.aiKey}`
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt: `Convert this to a GraphQL query:\n${prompt}\n\nGraphQL Query:`,
        temperature: 0,
        max_tokens: config.maxTokens
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.text?.trim() || 'No query generated';
  }

  async function generateWithAnthropic(prompt, config) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.aiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: config.maxTokens,
        messages: [{
          role: 'user',
          content: `Convert this to a GraphQL query:\n${prompt}`
        }]
      })
    });

    const data = await response.json();
    return data.content?.[0]?.text || 'No query generated';
  }

  function exportConfig() {
    chrome.storage.local.get(['gql-config', 'gql-favorites', 'gql-history'], (result) => {
      const exportData = {
        config: result['gql-config'] || {},
        favorites: result['gql-favorites'] || [],
        history: result['gql-history'] || []
      };
      
      const json = JSON.stringify(exportData, null, 2);
      downloadFile(json, 'graphql-dashboard-export.json', 'application/json');
      showStatus('Configuration exported', 'success');
    });
  }

  function showStatus(message, type = 'info') {
    const status = dashboard.querySelector('#gql-status');
    const colors = {
      success: 'gql-status-success',
      error: 'gql-status-error',
      info: 'gql-status-info'
    };
    status.className = `gql-status ${colors[type]}`;
    status.textContent = message;
    status.classList.remove('hidden');
    setTimeout(() => status.classList.add('hidden'), 4000);
  }

  async function saveState() {
    const state = {
      display: dashboard.style.display,
      left: dashboard.style.left,
      top: dashboard.style.top,
      width: dashboard.style.width,
      height: dashboard.style.height,
      minimized: dashboard.classList.contains('gql-minimized'),
      domain: window.location.hostname
    };

    const key = `${STORAGE_KEY}-${window.location.hostname}`;
    await chrome.storage.local.set({ [key]: state });
  }

  async function loadState() {
    const key = `${STORAGE_KEY}-${window.location.hostname}`;
    const result = await chrome.storage.local.get(key);
    
    if (result[key]) {
      const state = result[key];
      if (state.display) dashboard.style.display = state.display;
      if (state.left) {
        dashboard.style.left = state.left;
        currentX = parseInt(state.left);
      }
      if (state.top) {
        dashboard.style.top = state.top;
        currentY = parseInt(state.top);
      }
      if (state.width) dashboard.style.width = state.width;
      if (state.height) dashboard.style.height = state.height;
      
      if (state.minimized) {
        minimizeDashboard();
      }
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(createDashboard, 100);
    });
  } else {
    setTimeout(createDashboard, 100);
  }

  // Cleanup
  window.addEventListener('beforeunload', () => {
    if (ws) ws.close();
  });
})();
