// ============================================================
// THEME SYSTEM
// ============================================================
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('tv-theme', t);
  const lblLight = document.getElementById('lbl-light');
  const lblDark  = document.getElementById('lbl-dark');
  if (lblLight) lblLight.classList.toggle('active', t === 'light');
  if (lblDark)  lblDark.classList.toggle('active',  t === 'dark');
  render(new Map());
}

(function initTheme() {
  const saved = localStorage.getItem('tv-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  window.addEventListener('DOMContentLoaded', () => {
    const lblLight = document.getElementById('lbl-light');
    const lblDark  = document.getElementById('lbl-dark');
    if (lblLight) lblLight.classList.toggle('active', saved === 'light');
    if (lblDark)  lblDark.classList.toggle('active',  saved === 'dark');
  });
})();

// ============================================================
// AUTH SYSTEM (localStorage-based demo)
// ============================================================
let currentUser = null;
let chatHistory = {}; // { username: [ {role, text, ts} ] }
let modalMode   = 'login'; // 'login' | 'register'

function initAuth() {
  const saved = localStorage.getItem('tv-user');
  if (saved) {
    try { currentUser = JSON.parse(saved); } catch(e) {}
  }
  const savedChats = localStorage.getItem('tv-chats');
  if (savedChats) {
    try { chatHistory = JSON.parse(savedChats); } catch(e) {}
  }
  updateAuthUI();
}

function updateAuthUI() {
  const loggedIn = !!currentUser;
  document.getElementById('header-auth').style.display = loggedIn ? 'none' : 'flex';
  document.getElementById('header-user').style.display = loggedIn ? 'flex' : 'none';
  if (loggedIn) {
    document.getElementById('user-display-name').textContent = currentUser.username;
    document.getElementById('user-avatar-letter').textContent = currentUser.username[0].toUpperCase();
  }
  // Chat wall
  const wall = document.getElementById('chat-auth-wall');
  const loggedInArea = document.getElementById('chat-logged-in');
  if (wall && loggedInArea) {
    wall.style.display = loggedIn ? 'none' : 'flex';
    loggedInArea.style.display = loggedIn ? 'flex' : 'none';
    if (loggedIn) {
      loggedInArea.style.flexDirection = 'column';
      renderChatHistory();
    }
  }
}

function openAuthModal(mode) {
  mode = mode || 'login';
  modalMode = mode;
  document.getElementById('auth-modal').classList.remove('hidden');
  switchModalTab(mode);
  document.getElementById('modal-error').textContent = '';
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function switchModalTab(tab) {
  modalMode = tab;
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('modal-login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('modal-register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('modal-submit-btn').textContent = tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
  document.getElementById('modal-error').textContent = '';
}

function submitAuth() {
  const errEl = document.getElementById('modal-error');
  errEl.textContent = '';

  if (modalMode === 'login') {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    if (!username || !password) { errEl.textContent = 'Tüm alanları doldurun.'; return; }

    // Load accounts
    const accounts = JSON.parse(localStorage.getItem('tv-accounts') || '{}');
    if (!accounts[username] || accounts[username].password !== btoa(password)) {
      errEl.textContent = 'Kullanıcı adı veya şifre hatalı.'; return;
    }
    currentUser = { username, email: accounts[username].email };
    localStorage.setItem('tv-user', JSON.stringify(currentUser));
    closeAuthModal();
    updateAuthUI();
    addLog(`Hoş geldin, ${username}!`, 'insert');
    // Welcome message
    if (!chatHistory[username] || chatHistory[username].length === 0) {
      addChatMessage('ai', `Merhaba ${username}! 👋 Ağaç veri yapıları hakkında sorularınızı yanıtlamaya hazırım.`);
    }

  } else {
    const username = document.getElementById('reg-user').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    if (!username || !email || !password) { errEl.textContent = 'Tüm alanları doldurun.'; return; }
    if (username.length < 3) { errEl.textContent = 'Kullanıcı adı en az 3 karakter olmalı.'; return; }
    if (password.length < 6) { errEl.textContent = 'Şifre en az 6 karakter olmalı.'; return; }

    const accounts = JSON.parse(localStorage.getItem('tv-accounts') || '{}');
    if (accounts[username]) { errEl.textContent = 'Bu kullanıcı adı zaten alınmış.'; return; }

    accounts[username] = { password: btoa(password), email };
    localStorage.setItem('tv-accounts', JSON.stringify(accounts));

    currentUser = { username, email };
    localStorage.setItem('tv-user', JSON.stringify(currentUser));
    chatHistory[username] = [];
    saveChats();
    closeAuthModal();
    updateAuthUI();
    addLog(`Kayıt başarılı! Hoş geldin, ${username}!`, 'insert');
    addChatMessage('ai', `Hesabın oluşturuldu ${username}! 🎉 Sana yardımcı olmaktan mutluluk duyarım.`);
  }
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem('tv-user');
  updateAuthUI();
  addLog('Çıkış yapıldı.', 'info');
  // Clear chat UI
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
}

// ── Chat ──
function renderChatHistory() {
  if (!currentUser) return;
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  msgs.innerHTML = '';
  const history = chatHistory[currentUser.username] || [];
  history.forEach(m => appendChatBubble(m.role, m.text));
  msgs.scrollTop = msgs.scrollHeight;
}

function addChatMessage(role, text) {
  if (!currentUser) return;
  const username = currentUser.username;
  if (!chatHistory[username]) chatHistory[username] = [];
  chatHistory[username].push({ role, text, ts: Date.now() });
  saveChats();
  appendChatBubble(role, text);
}

function appendChatBubble(role, text) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  const wrap = document.createElement('div');
  wrap.className = `chat-msg ${role}`;
  const sender = document.createElement('div');
  sender.className = 'chat-sender';
  sender.textContent = role === 'user' ? (currentUser?.username || 'Siz') : '🌲 Asistan';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  wrap.appendChild(sender);
  wrap.appendChild(bubble);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function saveChats() {
  localStorage.setItem('tv-chats', JSON.stringify(chatHistory));
}

function chatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

// Smart assistant responses about trees
function getTreeAnswer(question) {
  const q = question.toLowerCase();
  const tree = currentTree.toUpperCase();

  if (q.includes('avl') || (currentTree === 'avl' && (q.includes('denge') || q.includes('balance')))) {
    return 'AVL ağacında her düğümün denge faktörü (BF) -1, 0 veya +1 arasında olmalıdır. Bu sağlanmak için rotasyon yapılır.';
  }
  if (q.includes('red') || q.includes('kırmızı') || q.includes('rb') || q.includes('siyah') || q.includes('black')) {
    return 'Red-Black ağacında kök daima siyah, kırmızı düğümlerin çocukları siyah olmalıdır. Yükseklik O(log n) garantilidir.';
  }
  if (q.includes('rotation') || q.includes('rotasyon') || q.includes('dönd')) {
    return `${tree} ağacında rotasyon, dengeyi korumak için kullanılır. Sol/sağ rotasyon ve LL/LR/RL/RR durumları mevcuttur.`;
  }
  if (q.includes('inorder') || q.includes('sıralı')) {
    return 'Inorder (Soldan-Kök-Sağa) gezinme, BST\'de her zaman sıralı çıktı verir.';
  }
  if (q.includes('yükseklik') || q.includes('height')) {
    return `${tree} ağacının yüksekliği O(log n)\'dir. Şu an yükseklik: ${trees[currentTree].getHeight()}.`;
  }
  if (q.includes('ekle') || q.includes('insert')) {
    return `${tree} ağacına ekleme O(log n) karmaşıklığında gerçekleşir. Sol panelde değer girip "Insert" butonuna tıklayın.`;
  }
  if (q.includes('sil') || q.includes('delete')) {
    return `${tree} ağacından silme işlemi O(log n) karmaşıklığındadır. Halef (successor) veya öncül (predecessor) kullanılabilir.`;
  }
  if (q.includes('b-tree') || q.includes('btree') || q.includes('b ağaç')) {
    return 'B-Tree, her düğümde birden fazla anahtar tutan dengeli bir arama ağacıdır. Veritabanlarında yaygın kullanılır.';
  }
  if (q.includes('karmaşıklık') || q.includes('complexity') || q.includes('big o') || q.includes('o(')) {
    return `${tree} için: Arama/Ekleme/Silme O(log n), Alan O(n). Şu an ${trees[currentTree].size()} düğüm var.`;
  }
  return `Harika soru! ${tree} ağacı hakkında daha spesifik sormak ister misiniz? Rotasyon, traversal, karmaşıklık veya diğer konularda yardımcı olabilirim.`;
}

function sendChatMessage() {
  if (!currentUser) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  addChatMessage('user', text);

  // Typing indicator
  const msgs = document.getElementById('chat-messages');
  const typing = document.createElement('div');
  typing.className = 'chat-msg ai';
  typing.id = 'typing-indicator';
  typing.innerHTML = `<div class="chat-sender">🌲 Asistan</div>
    <div class="chat-bubble"><div class="chat-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  setTimeout(() => {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
    const answer = getTreeAnswer(text);
    addChatMessage('ai', answer);
  }, 900 + Math.random() * 600);
}

// ============================================================
// RIGHT PANEL SYSTEM
// ============================================================
let activeRightPanel = null; // 'pseudo' | 'chat' | null

function toggleRightPanel(panel) {
  const content = document.getElementById('right-panel-content');
  const pseudoP = document.getElementById('pseudo-panel');
  const chatP   = document.getElementById('chat-panel');
  const tabPseudo = document.getElementById('rtab-pseudo');
  const tabChat   = document.getElementById('rtab-chat');

  if (activeRightPanel === panel) {
    // Close
    content.classList.remove('open');
    activeRightPanel = null;
    tabPseudo.classList.remove('active');
    tabChat.classList.remove('active');
  } else {
    // Open or switch
    activeRightPanel = panel;
    content.classList.add('open');
    pseudoP.classList.toggle('active', panel === 'pseudo');
    chatP.classList.toggle('active', panel === 'chat');
    tabPseudo.classList.toggle('active', panel === 'pseudo');
    tabChat.classList.toggle('active', panel === 'chat');
    if (panel === 'pseudo') renderPseudoCode(currentTree);
  }

  // After panel opens/closes, recenter the tree view
  setTimeout(() => fitTreeToView(), 350);
}

// ============================================================
// PSEUDO-CODE DATA
// ============================================================
const pseudoData = {
  avl: {
    badge: 'AVL',
    sections: [
      { title: 'Insert(value)', lines: [
        { text: 'function insert(node, value):', kw: [0] },
        { text: '  if node == null:', kw: [1] },
        { text: '    return new Node(value)   // ← leaf', cm: true },
        { text: '  if value < node.key:', kw: [1] },
        { text: '    node.left = insert(left, value)', fn: [4] },
        { text: '  else if value > node.key:', kw: [1,3] },
        { text: '    node.right = insert(right, value)', fn: [4] },
        { text: '  updateHeight(node)', fn: [0] },
        { text: '  return balance(node)', kw: [0], fn: [1] },
      ]},
      { title: 'Balance(node)', lines: [
        { text: 'function balance(node):', kw: [0] },
        { text: '  bf = height(left) - height(right)', fn: [0] },
        { text: '  if bf > 1:  // left heavy', kw: [1], cm: true },
        { text: '    if bf(left) < 0: rotateLeft(left)', fn: [2,3] },
        { text: '    return rotateRight(node)', kw: [0], fn: [1] },
        { text: '  if bf < -1: // right heavy', kw: [1], cm: true },
        { text: '    if bf(right) > 0: rotateRight(right)', fn: [2,3] },
        { text: '    return rotateLeft(node)', kw: [0], fn: [1] },
        { text: '  return node   // already balanced', kw: [0], cm: true },
      ]},
    ],
    complexity: [
      { label: 'Insert', val: 'O(log n)', cls: 'c-good' },
      { label: 'Delete', val: 'O(log n)', cls: 'c-good' },
      { label: 'Search', val: 'O(log n)', cls: 'c-good' },
      { label: 'Space',  val: 'O(n)',     cls: 'c-medium' },
    ],
  },
  rb: {
    badge: 'Red-Black',
    sections: [
      { title: 'Insert + Fix(node)', lines: [
        { text: 'function insert(value):', kw: [0] },
        { text: '  node = bstInsert(value)', fn: [2] },
        { text: '  node.color = RED', kw: [2] },
        { text: '  fixInsert(node)', fn: [0] },
        { text: '', },
        { text: 'function fixInsert(z):', kw: [0] },
        { text: '  while parent(z).color == RED:', kw: [0,3], fn: [1] },
        { text: '    uncle = getUncle(z)', fn: [2] },
        { text: '    if uncle.color == RED:', kw: [1,3] },
        { text: '      recolor(parent, uncle, gp)  ', fn: [0] },
        { text: '    else:', kw: [0] },
        { text: '      rotate + recolor', fn: [0,2] },
        { text: '  root.color = BLACK', kw: [2] },
      ]},
      { title: 'RB Properties', lines: [
        { text: '  1. Every node: RED or BLACK', },
        { text: '  2. Root is always BLACK', },
        { text: '  3. Red node → BLACK children', },
        { text: '  4. Equal black-height on all paths', },
      ]},
    ],
    complexity: [
      { label: 'Insert', val: 'O(log n)', cls: 'c-good' },
      { label: 'Delete', val: 'O(log n)', cls: 'c-good' },
      { label: 'Search', val: 'O(log n)', cls: 'c-good' },
      { label: 'Space',  val: 'O(n)',     cls: 'c-medium' },
    ],
  },
  btree: {
    badge: 'B-Tree',
    sections: [
      { title: 'Insert(value)', lines: [
        { text: 'function insert(value):', kw: [0] },
        { text: '  if root is full:', kw: [1] },
        { text: '    newRoot = Node()', fn: [2] },
        { text: '    splitChild(newRoot, root)', fn: [0] },
        { text: '    root = newRoot', kw: [2] },
        { text: '  insertNonFull(root, value)', fn: [0] },
      ]},
      { title: 'SplitChild(parent, i)', lines: [
        { text: 'function splitChild(x, i):', kw: [0] },
        { text: '  y = x.children[i]  // full child', cm: true },
        { text: '  z = new Node(y.leaf)', fn: [2] },
        { text: '  // promote median key to parent', cm: true },
        { text: '  x.keys.insert(y.keys[t-1])', fn: [1] },
        { text: '  z.keys = y.keys[t .. 2t-2]', fn: [1] },
        { text: '  y.keys = y.keys[0 .. t-2]', fn: [1] },
      ]},
      { title: 'Properties', lines: [
        { text: '  Min keys per node: t-1', },
        { text: '  Max keys per node: 2t-1', },
        { text: '  All leaves at same depth', },
      ]},
    ],
    complexity: [
      { label: 'Insert', val: 'O(t·log n)', cls: 'c-good' },
      { label: 'Delete', val: 'O(t·log n)', cls: 'c-good' },
      { label: 'Search', val: 'O(t·log n)', cls: 'c-good' },
      { label: 'Space',  val: 'O(n)',       cls: 'c-medium' },
    ],
  },
};

// Lines to highlight for each step kind
const pseudoHighlightMap = {
  avl: {
    insert: { 'new': [2], 'path': [3,4,5,6], 'rotate': [1,2,3,4,5,6,7,8], 'default': [0] },
    balance: { 'rotate': [1,2,3,4,5,6,7,8] },
  },
  rb: {
    insert: { 'new': [1,2], 'recolor': [8,9,10,11], 'rotate': [10,11,12], 'path': [6,7] },
  },
  btree: {
    insert: { 'new': [5], 'rotate': [1,2,3,4,5], 'path': [5] },
  },
};

let currentHighlightedLines = new Set();

function renderPseudoCode(treeType, stepKind) {
  const data = pseudoData[treeType];
  if (!data) return;

  // Badge
  const badge = document.getElementById('pseudo-tree-badge');
  if (badge) badge.textContent = data.badge;

  const area = document.getElementById('pseudo-code-area');
  if (!area) return;
  area.innerHTML = '';

  let lineGlobalIndex = 0;

  data.sections.forEach(section => {
    const titleEl = document.createElement('div');
    titleEl.className = 'pseudo-section-title';
    titleEl.textContent = section.title;
    area.appendChild(titleEl);

    section.lines.forEach((lineData, localIdx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'pseudo-line';
      lineEl.dataset.lineIndex = lineGlobalIndex;

      // Line number
      const numEl = document.createElement('span');
      numEl.className = 'pseudo-num';
      numEl.textContent = lineGlobalIndex + 1;
      lineEl.appendChild(numEl);

      // Text with syntax coloring
      const textEl = document.createElement('span');
      textEl.className = 'pseudo-text';
      if (!lineData.text) { textEl.innerHTML = '&nbsp;'; }
      else { textEl.innerHTML = syntaxColor(lineData.text); }
      lineEl.appendChild(textEl);

      if (currentHighlightedLines.has(lineGlobalIndex)) {
        lineEl.classList.add('highlighted');
      }

      area.appendChild(lineEl);
      lineGlobalIndex++;
    });
  });

  // Complexity
  const bar = document.getElementById('complexity-bar');
  if (bar) {
    bar.innerHTML = '';
    data.complexity.forEach(c => {
      const row = document.createElement('div');
      row.className = 'complexity-row';
      row.innerHTML = `<span class="complexity-label">${c.label}</span>
        <span class="complexity-val ${c.cls}">${c.val}</span>`;
      bar.appendChild(row);
    });
  }
}

function syntaxColor(text) {
  const keywords = ['function', 'if', 'else', 'while', 'return', 'new', 'null'];
  let result = '';
  // Simple token-based coloring
  let i = 0;
  while (i < text.length) {
    // Comment
    if (text[i] === '/' && text[i+1] === '/') {
      result += `<span class="pseudo-cm">${escHtml(text.slice(i))}</span>`;
      break;
    }
    // Try keyword
    let matched = false;
    for (const kw of keywords) {
      if (text.slice(i, i+kw.length) === kw && (i+kw.length >= text.length || !/\w/.test(text[i+kw.length])) && (i === 0 || !/\w/.test(text[i-1]))) {
        result += `<span class="pseudo-kw">${kw}</span>`;
        i += kw.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // Numbers
    if (/[0-9]/.test(text[i]) && (i === 0 || !/\w/.test(text[i-1]))) {
      let num = '';
      while (i < text.length && /[\d.tn\-+]/.test(text[i])) { num += text[i]; i++; }
      result += `<span class="pseudo-num-val">${escHtml(num)}</span>`;
      continue;
    }
    result += escHtml(text[i]);
    i++;
  }
  return result;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Highlight pseudo-code lines based on current step kind
function highlightPseudoLines(stepKind) {
  if (!activeRightPanel || activeRightPanel !== 'pseudo') return;

  const kindMap = {
    new:     [2],          // AVL: the "return new Node" line
    path:    [3,4,5,6],    // Comparisons
    rotate:  [7,8],        // balance calls
    recolor: [9,10,11,12], // RB fix
    found:   [],
    delete:  [7,8],
    info:    [],
  };

  currentHighlightedLines = new Set(kindMap[stepKind] || []);
  renderPseudoCode(currentTree);

  // Scroll to first highlighted line
  const area = document.getElementById('pseudo-code-area');
  if (!area) return;
  const hl = area.querySelector('.pseudo-line.highlighted');
  if (hl) hl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================
// STATE
// ============================================================
let currentTree = 'avl';
let animSpeed   = 800;
let stepQueue   = [];
let stepIndex   = 0;
let isPlaying   = false;
let playTimer   = null;
let metrics     = { rotations: 0, ops: 0 };

// ============================================================
// AVL TREE
// ============================================================
class AVLNode {
  constructor(val) {
    this.val = val; this.left = null; this.right = null;
    this.height = 1; this.bf = 0;
    this.id = 'n' + Math.random().toString(36).substr(2, 8);
  }
}

class AVLTree {
  constructor() { this.root = null; }

  height(n) { return n ? n.height : 0; }
  bf(n)     { return n ? this.height(n.left) - this.height(n.right) : 0; }

  update(n) {
    if (!n) return;
    n.height = 1 + Math.max(this.height(n.left), this.height(n.right));
    n.bf = this.bf(n);
  }

  rotateRight(y, steps) {
    let x = y.left, T2 = x.right;
    steps.push({ type: 'rotate', desc: `Right rotation on ${y.val}`, highlight: [y.id, x.id], kind: 'rotate' });
    x.right = y; y.left = T2;
    this.update(y); this.update(x);
    metrics.rotations++;
    return x;
  }

  rotateLeft(x, steps) {
    let y = x.right, T2 = y.left;
    steps.push({ type: 'rotate', desc: `Left rotation on ${x.val}`, highlight: [x.id, y.id], kind: 'rotate' });
    y.left = x; x.right = T2;
    this.update(x); this.update(y);
    metrics.rotations++;
    return y;
  }

  balance(n, steps) {
    this.update(n);
    if (n.bf > 1) {
      if (this.bf(n.left) < 0) {
        steps.push({ type: 'rotate', desc: `LR case at ${n.val}`, highlight: [n.id], kind: 'rotate' });
        n.left = this.rotateLeft(n.left, steps);
      }
      return this.rotateRight(n, steps);
    }
    if (n.bf < -1) {
      if (this.bf(n.right) > 0) {
        steps.push({ type: 'rotate', desc: `RL case at ${n.val}`, highlight: [n.id], kind: 'rotate' });
        n.right = this.rotateRight(n.right, steps);
      }
      return this.rotateLeft(n, steps);
    }
    return n;
  }

  _insert(n, val, steps) {
    if (!n) {
      let node = new AVLNode(val);
      steps.push({ type: 'insert', desc: `Inserted ${val}`, highlight: [node.id], kind: 'new', node });
      return node;
    }
    steps.push({ type: 'visit', desc: `Compare ${val} with ${n.val}`, highlight: [n.id], kind: 'path' });
    if (val < n.val)      n.left  = this._insert(n.left,  val, steps);
    else if (val > n.val) n.right = this._insert(n.right, val, steps);
    else { steps.push({ type: 'info', desc: `${val} already exists`, highlight: [n.id], kind: 'found' }); return n; }
    return this.balance(n, steps);
  }

  insert(val) {
    let steps = [{ type: 'info', desc: `Inserting ${val} into AVL Tree`, highlight: [], kind: 'info' }];
    this.root = this._insert(this.root, val, steps);
    return steps;
  }

  minNode(n) { while (n.left) n = n.left; return n; }

  _delete(n, val, steps) {
    if (!n) return null;
    steps.push({ type: 'visit', desc: `Checking ${n.val}`, highlight: [n.id], kind: 'path' });
    if (val < n.val)      n.left  = this._delete(n.left,  val, steps);
    else if (val > n.val) n.right = this._delete(n.right, val, steps);
    else {
      steps.push({ type: 'delete', desc: `Found ${val} — removing`, highlight: [n.id], kind: 'delete' });
      if (!n.left || !n.right) {
        n = n.left || n.right;
        if (n) steps.push({ type: 'info', desc: `Promoted child ${n.val}`, highlight: [n.id], kind: 'new' });
      } else {
        let succ = this.minNode(n.right);
        steps.push({ type: 'info', desc: `In-order successor: ${succ.val}`, highlight: [succ.id], kind: 'highlight' });
        n.val = succ.val;
        n.right = this._delete(n.right, succ.val, steps);
      }
    }
    if (!n) return null;
    return this.balance(n, steps);
  }

  delete(val) {
    let steps = [{ type: 'info', desc: `Deleting ${val} from AVL Tree`, highlight: [], kind: 'info' }];
    this.root = this._delete(this.root, val, steps);
    return steps;
  }

  _search(n, val, steps) {
    if (!n) { steps.push({ type: 'info', desc: `${val} not found`, highlight: [], kind: 'info' }); return; }
    steps.push({ type: 'visit', desc: `Visiting ${n.val}`, highlight: [n.id], kind: 'path' });
    if (val === n.val) { steps.push({ type: 'found', desc: `Found ${val}!`, highlight: [n.id], kind: 'found' }); return; }
    if (val < n.val) this._search(n.left,  val, steps);
    else             this._search(n.right, val, steps);
  }

  search(val) {
    let steps = [{ type: 'info', desc: `Searching for ${val}`, highlight: [], kind: 'info' }];
    this._search(this.root, val, steps);
    return steps;
  }

  size(n = this.root)  { return n ? 1 + this.size(n.left) + this.size(n.right) : 0; }
  getHeight()          { return this.height(this.root); }
}

// ============================================================
// RED-BLACK TREE
// ============================================================
const RED = 'red', BLACK = 'black';

class RBNode {
  constructor(val) {
    this.val = val; this.color = RED;
    this.left = null; this.right = null; this.parent = null;
    this.id = 'n' + Math.random().toString(36).substr(2, 8);
  }
}

class RBTree {
  constructor() { this.root = null; this._steps = []; }

  isRed(n) { return n && n.color === RED; }

  rotateLeft(n) {
    this._steps.push({ type: 'rotate', desc: `Left rotate on ${n.val}`, highlight: [n.id, n.right?.id].filter(Boolean), kind: 'rotate' });
    let r = n.right;
    n.right = r.left;
    if (r.left) r.left.parent = n;
    r.parent = n.parent;
    if (!n.parent)                this.root = r;
    else if (n === n.parent.left) n.parent.left  = r;
    else                          n.parent.right = r;
    r.left = n; n.parent = r;
    metrics.rotations++;
  }

  rotateRight(n) {
    this._steps.push({ type: 'rotate', desc: `Right rotate on ${n.val}`, highlight: [n.id, n.left?.id].filter(Boolean), kind: 'rotate' });
    let l = n.left;
    n.left = l.right;
    if (l.right) l.right.parent = n;
    l.parent = n.parent;
    if (!n.parent)                 this.root = l;
    else if (n === n.parent.right) n.parent.right = l;
    else                           n.parent.left  = l;
    l.right = n; n.parent = l;
    metrics.rotations++;
  }

  insert(val) {
    this._steps = [{ type: 'info', desc: `Inserting ${val} into Red-Black Tree`, highlight: [], kind: 'info' }];
    let node = new RBNode(val);
    this._bstInsert(node);
    this._steps.push({ type: 'insert', desc: `Inserted ${val} as RED node`, highlight: [node.id], kind: 'new' });
    this._fixInsert(node);
    return this._steps;
  }

  _bstInsert(node) {
    let cur = this.root, par = null;
    while (cur) {
      this._steps.push({ type: 'visit', desc: `Comparing ${node.val} with ${cur.val}`, highlight: [cur.id], kind: 'path' });
      par = cur;
      if      (node.val < cur.val) cur = cur.left;
      else if (node.val > cur.val) cur = cur.right;
      else return;
    }
    node.parent = par;
    if (!par)                    this.root = node;
    else if (node.val < par.val) par.left  = node;
    else                         par.right = node;
  }

  _fixInsert(z) {
    while (z !== this.root && this.isRed(z.parent)) {
      let p = z.parent, g = p.parent;
      if (!g) break;
      if (p === g.left) {
        let uncle = g.right;
        if (this.isRed(uncle)) {
          this._steps.push({ type: 'recolor', desc: `Uncle RED — recolor parent+uncle→BLACK, gp→RED`, highlight: [p.id, uncle.id, g.id], kind: 'recolor' });
          p.color = BLACK; uncle.color = BLACK; g.color = RED; z = g;
        } else {
          if (z === p.right) { z = p; this.rotateLeft(z); p = z.parent; g = p?.parent; if (!g) break; }
          this._steps.push({ type: 'recolor', desc: `Recolor parent→BLACK, grandparent→RED`, highlight: [p.id, g.id], kind: 'recolor' });
          p.color = BLACK; g.color = RED;
          this.rotateRight(g);
        }
      } else {
        let uncle = g.left;
        if (this.isRed(uncle)) {
          this._steps.push({ type: 'recolor', desc: `Uncle RED — recolor`, highlight: [p.id, uncle.id, g.id], kind: 'recolor' });
          p.color = BLACK; uncle.color = BLACK; g.color = RED; z = g;
        } else {
          if (z === p.left) { z = p; this.rotateRight(z); p = z.parent; g = p?.parent; if (!g) break; }
          this._steps.push({ type: 'recolor', desc: `Recolor parent→BLACK, grandparent→RED`, highlight: [p.id, g.id], kind: 'recolor' });
          p.color = BLACK; g.color = RED;
          this.rotateLeft(g);
        }
      }
    }
    this.root.color = BLACK;
  }

  delete(val) {
    this._steps = [{ type: 'info', desc: `Delete ${val} from Red-Black`, highlight: [], kind: 'info' }];
    let node = this._find(val);
    if (!node) { this._steps.push({ type: 'info', desc: `${val} not found`, highlight: [], kind: 'info' }); return this._steps; }
    this._steps.push({ type: 'delete', desc: `Found ${val} — removing`, highlight: [node.id], kind: 'delete' });
    this._rbDelete(node);
    return this._steps;
  }

  _find(val) {
    let cur = this.root;
    while (cur) {
      if (val === cur.val) return cur;
      cur = val < cur.val ? cur.left : cur.right;
    }
    return null;
  }

  _rbDelete(z) {
    let y = z, yOrigColor = y.color, x;
    if (!z.left) { x = z.right; this._transplant(z, z.right); }
    else if (!z.right) { x = z.left; this._transplant(z, z.left); }
    else {
      y = this._min(z.right); yOrigColor = y.color; x = y.right;
      if (y.parent === z) { if (x) x.parent = y; }
      else { this._transplant(y, y.right); y.right = z.right; if (y.right) y.right.parent = y; }
      this._transplant(z, y);
      y.left = z.left; if (y.left) y.left.parent = y;
      y.color = z.color;
    }
  }

  _transplant(u, v) {
    if (!u.parent)                this.root = v;
    else if (u === u.parent.left) u.parent.left  = v;
    else                          u.parent.right = v;
    if (v) v.parent = u.parent;
  }

  _min(n) { while (n.left) n = n.left; return n; }

  search(val) {
    let steps = [{ type: 'info', desc: `Searching for ${val} in RB Tree`, highlight: [], kind: 'info' }];
    let cur = this.root;
    while (cur) {
      steps.push({ type: 'visit', desc: `Visiting ${cur.val} (${cur.color})`, highlight: [cur.id], kind: 'path' });
      if (val === cur.val) { steps.push({ type: 'found', desc: `Found ${val}!`, highlight: [cur.id], kind: 'found' }); return steps; }
      cur = val < cur.val ? cur.left : cur.right;
    }
    steps.push({ type: 'info', desc: `${val} not found`, highlight: [], kind: 'info' });
    return steps;
  }

  size(n = this.root)      { return n ? 1 + this.size(n.left) + this.size(n.right) : 0; }
  getHeight(n = this.root) { return n ? 1 + Math.max(this.getHeight(n.left), this.getHeight(n.right)) : 0; }

  toD3(n = this.root) {
    if (!n) return null;
    return { id: n.id, val: n.val, rbColor: n.color, children: [this.toD3(n.left), this.toD3(n.right)].filter(Boolean) };
  }
}

// ============================================================
// B-TREE
// ============================================================
class BTreeNode {
  constructor(leaf = false) {
    this.keys = []; this.children = []; this.leaf = leaf;
    this.id = 'bn' + Math.random().toString(36).substr(2, 8);
  }
}

class BTree {
  constructor(t = 2) { this.t = t; this.root = new BTreeNode(true); this._steps = []; }

  insert(val) {
    this._steps = [{ type: 'info', desc: `Inserting ${val} into B-Tree (t=${this.t})`, highlight: [], kind: 'info' }];
    let r = this.root;
    if (r.keys.length === 2 * this.t - 1) {
      let s = new BTreeNode(false);
      this.root = s; s.children.push(r);
      this._steps.push({ type: 'split', desc: `Root full — splitting root`, highlight: [r.id], kind: 'rotate' });
      this._splitChild(s, 0);
      this._insertNonFull(s, val);
    } else {
      this._insertNonFull(r, val);
    }
    return this._steps;
  }

  _insertNonFull(n, val) {
    let i = n.keys.length - 1;
    if (n.leaf) {
      while (i >= 0 && val < n.keys[i]) i--;
      n.keys.splice(i + 1, 0, val);
      this._steps.push({ type: 'insert', desc: `Inserted ${val} into leaf`, highlight: [n.id], kind: 'new' });
    } else {
      while (i >= 0 && val < n.keys[i]) i--;
      i++;
      this._steps.push({ type: 'visit', desc: `Descending into child ${i}`, highlight: [n.id], kind: 'path' });
      if (n.children[i].keys.length === 2 * this.t - 1) {
        this._steps.push({ type: 'split', desc: `Child full — splitting`, highlight: [n.children[i].id], kind: 'rotate' });
        this._splitChild(n, i);
        if (val > n.keys[i]) i++;
      }
      this._insertNonFull(n.children[i], val);
    }
  }

  _splitChild(x, i) {
    let t = this.t, y = x.children[i];
    let z = new BTreeNode(y.leaf);
    x.children.splice(i + 1, 0, z);
    x.keys.splice(i, 0, y.keys[t - 1]);
    z.keys = y.keys.splice(t, t - 1);
    y.keys.pop();
    if (!y.leaf) z.children = y.children.splice(t, t);
  }

  delete(val) {
    this._steps = [{ type: 'info', desc: `Deleting ${val} from B-Tree`, highlight: [], kind: 'info' }];
    this._delete(this.root, val);
    if (this.root.keys.length === 0 && this.root.children.length > 0) this.root = this.root.children[0];
    return this._steps;
  }

  _delete(n, val) {
    let t = this.t;
    let i = n.keys.findIndex(k => k >= val);
    if (i === -1) i = n.keys.length;
    if (i < n.keys.length && n.keys[i] === val) {
      this._steps.push({ type: 'delete', desc: `Found ${val} in node`, highlight: [n.id], kind: 'delete' });
      if (n.leaf) {
        n.keys.splice(i, 1);
      } else {
        if (n.children[i].keys.length >= t) {
          let pred = this._getPred(n.children[i]);
          n.keys[i] = pred; this._delete(n.children[i], pred);
        } else if (n.children[i + 1].keys.length >= t) {
          let succ = this._getSucc(n.children[i + 1]);
          n.keys[i] = succ; this._delete(n.children[i + 1], succ);
        } else {
          this._merge(n, i); this._delete(n.children[i], val);
        }
      }
    } else {
      if (n.leaf) { this._steps.push({ type: 'info', desc: `${val} not found`, highlight: [], kind: 'info' }); return; }
      this._steps.push({ type: 'visit', desc: `Descending to child ${i}`, highlight: [n.id], kind: 'path' });
      if (n.children[i].keys.length < t) this._fill(n, i);
      if (i > n.keys.length) this._delete(n.children[i - 1], val);
      else                   this._delete(n.children[i],     val);
    }
  }

  _getPred(n) { while (!n.leaf) n = n.children[n.children.length - 1]; return n.keys[n.keys.length - 1]; }
  _getSucc(n) { while (!n.leaf) n = n.children[0]; return n.keys[0]; }
  _fill(n, i) {}

  _merge(n, i) {
    let child = n.children[i], sib = n.children[i + 1];
    child.keys.push(n.keys[i]);
    child.keys = child.keys.concat(sib.keys);
    child.children = child.children.concat(sib.children);
    n.keys.splice(i, 1); n.children.splice(i + 1, 1);
    this._steps.push({ type: 'merge', desc: `Merged children at index ${i}`, highlight: [child.id], kind: 'rotate' });
  }

  search(val) {
    let steps = [{ type: 'info', desc: `Searching for ${val} in B-Tree`, highlight: [], kind: 'info' }];
    this._search(this.root, val, steps);
    return steps;
  }

  _search(n, val, steps) {
    if (!n) return;
    steps.push({ type: 'visit', desc: `Checking node [${n.keys.join(', ')}]`, highlight: [n.id], kind: 'path' });
    let i = 0;
    while (i < n.keys.length && val > n.keys[i]) i++;
    if (i < n.keys.length && n.keys[i] === val) {
      steps.push({ type: 'found', desc: `Found ${val}!`, highlight: [n.id], kind: 'found' }); return;
    }
    if (n.leaf) { steps.push({ type: 'info', desc: `${val} not found`, highlight: [], kind: 'info' }); return; }
    this._search(n.children[i], val, steps);
  }

  size(n = this.root)      { if (!n) return 0; return n.keys.length + n.children.reduce((a, c) => a + this.size(c), 0); }
  getHeight(n = this.root) { if (!n || n.leaf) return 1; return 1 + this.getHeight(n.children[0]); }
}

// ============================================================
// TREE INSTANCES
// ============================================================
let trees = { avl: new AVLTree(), rb: new RBTree(), btree: new BTree(2) };

// ============================================================
// HELPERS — get CSS variable values at runtime
// ============================================================
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ============================================================
// D3 VISUALIZATION
// ============================================================
const svg = d3.select('#tree-svg');
let g = svg.append('g');

let defs = svg.append('defs');

let zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);

function treeToD3(tree) {
  if (currentTree === 'avl')   return nodeToD3_avl(tree.root);
  if (currentTree === 'rb')    return tree.toD3();
  if (currentTree === 'btree') return nodeToD3_btree(tree.root);
}

function nodeToD3_avl(n) {
  if (!n) return null;
  let obj = { id: n.id, val: n.val, bf: n.bf, children: [] };
  if (n.left)  obj.children.push(nodeToD3_avl(n.left));
  if (n.right) obj.children.push(nodeToD3_avl(n.right));
  if (!obj.children.length) delete obj.children;
  return obj;
}

function nodeToD3_btree(n) {
  if (!n) return null;
  let obj = { id: n.id, val: n.keys.join(','), keys: n.keys, children: [] };
  for (let c of n.children) { let d = nodeToD3_btree(c); if (d) obj.children.push(d); }
  if (!obj.children.length) delete obj.children;
  return obj;
}

// ── Color map for highlight kinds ──
function highlightFill(kind) {
  const map = {
    new:       cssVar('--node-new'),
    path:      cssVar('--node-path'),
    found:     cssVar('--node-found'),
    delete:    cssVar('--node-del'),
    rotate:    cssVar('--node-rot'),
    recolor:   cssVar('--node-rcol'),
    highlight: cssVar('--node-found'),
    info:      cssVar('--text-muted'),
  };
  return map[kind] || cssVar('--accent2');
}

// ── Build gradient defs ──
function buildGradients() {
  defs.selectAll('*').remove();

  let ng = defs.append('radialGradient')
    .attr('id', 'grad-node-normal')
    .attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
  ng.append('stop').attr('offset', '0%')  .attr('stop-color', cssVar('--node-fill-a')).attr('stop-opacity', 1);
  ng.append('stop').attr('offset', '100%').attr('stop-color', cssVar('--bg2'))         .attr('stop-opacity', 1);

  let hg = defs.append('radialGradient')
    .attr('id', 'grad-node-hl')
    .attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
  hg.append('stop').attr('offset', '0%')  .attr('stop-color', '#fff').attr('stop-opacity', 0.9);
  hg.append('stop').attr('offset', '100%').attr('stop-color', cssVar('--accent')).attr('stop-opacity', 1);

  let rg = defs.append('radialGradient')
    .attr('id', 'grad-rb-red')
    .attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
  rg.append('stop').attr('offset', '0%')  .attr('stop-color', '#b91c1c').attr('stop-opacity', 1);
  rg.append('stop').attr('offset', '100%').attr('stop-color', cssVar('--node-rb-red')).attr('stop-opacity', 1);

  let bg = defs.append('radialGradient')
    .attr('id', 'grad-rb-black')
    .attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
  bg.append('stop').attr('offset', '0%')  .attr('stop-color', '#374151').attr('stop-opacity', 1);
  bg.append('stop').attr('offset', '100%').attr('stop-color', cssVar('--node-rb-blk')).attr('stop-opacity', 1);

  const kinds = ['new','path','found','delete','rotate','recolor'];
  kinds.forEach(kind => {
    let c = highlightFill(kind);
    let kg = defs.append('radialGradient')
      .attr('id', `grad-hl-${kind}`)
      .attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
    kg.append('stop').attr('offset', '0%')  .attr('stop-color', '#fff').attr('stop-opacity', 0.6);
    kg.append('stop').attr('offset', '100%').attr('stop-color', c)      .attr('stop-opacity', 1);
  });

  let filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
  let feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  let linkFilter = defs.append('filter').attr('id', 'link-glow');
  linkFilter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
  let lm = linkFilter.append('feMerge');
  lm.append('feMergeNode').attr('in', 'blur');
  lm.append('feMergeNode').attr('in', 'SourceGraphic');
}

// ── Fit tree to viewport ──
// Called after first insert and after panel open/close
function fitTreeToView() {
  const tree = trees[currentTree];
  const data = treeToD3(tree);
  if (!data) return;

  const svgEl = document.getElementById('tree-svg');
  const W = svgEl.clientWidth;
  const H = svgEl.clientHeight;
  if (!W || !H) return;

  // Get current bounding box of the tree group
  const gEl = svgEl.querySelector('g');
  if (!gEl) return;

  try {
    const bbox = gEl.getBBox();
    if (!bbox.width || !bbox.height) return;

    const scale = Math.min(
      0.85 * W / bbox.width,
      0.85 * H / bbox.height,
      2.0
    );

    const tx = W / 2 - scale * (bbox.x + bbox.width / 2);
    const ty = H / 2 - scale * (bbox.y + bbox.height / 2);

    svg.transition().duration(300).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  } catch(e) {}
}

// ── Main render ──
let isFirstRender = true;

function render(highlights = new Map()) {
  buildGradients();

  let tree = trees[currentTree];
  let data = treeToD3(tree);
  g.selectAll('*').remove();

  if (!data) {
    document.getElementById('empty-state').style.display = 'block';
    isFirstRender = true;
    updateMetrics();
    return;
  }
  document.getElementById('empty-state').style.display = 'none';

  let hierarchy  = d3.hierarchy(data);
  let treeLayout = d3.tree()
    .nodeSize([currentTree === 'btree' ? 110 : 64, 90])
    .separation((a, b) => a.parent === b.parent ? 1.4 : 2.0);
  treeLayout(hierarchy);

  // ── Links ──
  g.selectAll('path.link')
    .data(hierarchy.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr('d', d => {
      let sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y;
      return `M${sx},${sy} C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`;
    })
    .attr('stroke', cssVar('--border-h'))
    .attr('stroke-width', 2)
    .attr('stroke-linecap', 'round')
    .attr('fill', 'none')
    .attr('opacity', 0.6);

  // ── Nodes ──
  let node = g.selectAll('g.node')
    .data(hierarchy.descendants())
    .enter().append('g')
    .attr('class', 'node node-group')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('mouseover', function(e, d) {
      let tip = document.getElementById('node-tooltip');
      tip.style.display = 'block';
      tip.style.left = (e.pageX + 14) + 'px';
      tip.style.top  = (e.pageY - 14) + 'px';
      if      (currentTree === 'avl')   tip.innerHTML = `<b>${d.data.val}</b> &nbsp;·&nbsp; BF: <span style="color:${Math.abs(d.data.bf)>1?cssVar('--node-del'):cssVar('--accent2')}">${d.data.bf}</span>`;
      else if (currentTree === 'rb')    tip.innerHTML = `<b>${d.data.val}</b> &nbsp;·&nbsp; <span style="color:${d.data.rbColor==='red'?cssVar('--node-del'):cssVar('--text-muted')}">${d.data.rbColor}</span>`;
      else                              tip.innerHTML = `Keys: <b>[${d.data.keys?.join(', ')}]</b>`;
    })
    .on('mousemove', function(e) {
      let tip = document.getElementById('node-tooltip');
      tip.style.left = (e.pageX + 14) + 'px';
      tip.style.top  = (e.pageY - 14) + 'px';
    })
    .on('mouseout', () => { document.getElementById('node-tooltip').style.display = 'none'; });

  node.each(function(d) {
    let el          = d3.select(this);
    let id          = d.data.id;
    let isHL        = highlights.has(id);
    let hlKind      = isHL ? highlights.get(id) : null;
    let hlColor     = isHL ? highlightFill(hlKind) : null;

    if (currentTree === 'btree') {
      let keys = d.data.keys || [d.data.val];
      let w = Math.max(keys.length * 34 + 10, 44), h = 32;

      el.append('rect')
        .attr('x', -w/2).attr('y', -h/2)
        .attr('width', w).attr('height', h)
        .attr('rx', 8)
        .attr('fill',   isHL ? `url(#grad-hl-${hlKind})` : `url(#grad-node-normal)`)
        .attr('stroke', isHL ? hlColor : cssVar('--border-h'))
        .attr('stroke-width', isHL ? 2 : 1)
        .attr('filter',  isHL ? 'url(#glow)' : null);

      keys.forEach((k, i) => {
        let x = -w/2 + i * 34 + 17;
        el.append('text')
          .attr('x', x).attr('y', 5)
          .attr('text-anchor', 'middle')
          .attr('fill', isHL ? '#111' : cssVar('--text'))
          .attr('font-size', 13).attr('font-weight', 600)
          .attr('font-family', 'JetBrains Mono, monospace')
          .text(k);
        if (i < keys.length - 1)
          el.append('line')
            .attr('x1', x+17).attr('y1', -h/2)
            .attr('x2', x+17).attr('y2', h/2)
            .attr('stroke', cssVar('--border')).attr('stroke-width', 1);
      });

    } else {
      let R = 22;
      let fillId, strokeColor;

      if (isHL) {
        fillId      = `url(#grad-hl-${hlKind})`;
        strokeColor = hlColor;
      } else if (currentTree === 'rb') {
        fillId      = d.data.rbColor === RED ? 'url(#grad-rb-red)' : 'url(#grad-rb-black)';
        strokeColor = d.data.rbColor === RED ? '#ef4444' : '#374151';
      } else {
        fillId      = 'url(#grad-node-normal)';
        strokeColor = cssVar('--border-h');
      }

      if (isHL) {
        el.append('circle')
          .attr('r', R + 6)
          .attr('fill', 'none')
          .attr('stroke', hlColor)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.35);
      }

      el.append('circle')
        .attr('r', R)
        .attr('fill', fillId)
        .attr('stroke', strokeColor)
        .attr('stroke-width', isHL ? 2 : 1.5)
        .attr('filter', isHL ? 'url(#glow)' : null);

      el.append('circle')
        .attr('r', 6)
        .attr('cx', -7).attr('cy', -8)
        .attr('fill', '#fff')
        .attr('opacity', 0.12);

      el.append('text')
        .attr('dy', 5)
        .attr('text-anchor', 'middle')
        .attr('fill', isHL ? '#111' : cssVar('--text'))
        .attr('font-size', 13)
        .attr('font-weight', 700)
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(d.data.val);

      if (currentTree === 'avl') {
        let bf   = d.data.bf;
        let bfColor = bf === 0
          ? cssVar('--text-muted')
          : (Math.abs(bf) > 1 ? cssVar('--node-del') : cssVar('--accent4'));

        el.append('rect')
          .attr('x', R - 5).attr('y', -R - 6)
          .attr('width', 20).attr('height', 14)
          .attr('rx', 4)
          .attr('fill', cssVar('--bg'))
          .attr('stroke', bfColor)
          .attr('stroke-width', 1)
          .attr('opacity', 0.9);

        el.append('text')
          .attr('x', R + 5).attr('y', -R + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', bfColor)
          .attr('font-size', 9)
          .attr('font-weight', 700)
          .attr('font-family', 'JetBrains Mono, monospace')
          .text(bf);
      }

      if (currentTree === 'rb') {
        el.append('circle')
          .attr('r', 4)
          .attr('cy', R + 8)
          .attr('fill', d.data.rbColor === RED ? '#ef4444' : '#6b7280')
          .attr('opacity', 0.8);
      }
    }
  });

  // Auto-fit on first render of a new node
  if (isFirstRender) {
    isFirstRender = false;
    setTimeout(() => fitTreeToView(), 50);
  }

  updateMetrics();
}

// ============================================================
// OPERATIONS
// ============================================================
function doInsert() {
  let v = parseInt(document.getElementById('val-input').value);
  if (isNaN(v)) return;
  metrics.ops++;
  let steps = trees[currentTree].insert(v);
  addLog(`Insert ${v}`, 'insert');
  document.getElementById('val-input').value = '';
  queueSteps(steps);
}

function doDelete() {
  let v = parseInt(document.getElementById('val-input').value);
  if (isNaN(v)) return;
  metrics.ops++;
  let steps = trees[currentTree].delete(v);
  addLog(`Delete ${v}`, 'delete');
  document.getElementById('val-input').value = '';
  queueSteps(steps);
}

function doSearch() {
  let v = parseInt(document.getElementById('val-input').value);
  if (isNaN(v)) return;
  metrics.ops++;
  let steps = trees[currentTree].search(v);
  addLog(`Search ${v}`, 'search');
  document.getElementById('val-input').value = '';
  queueSteps(steps);
}

function clearTree() {
  trees[currentTree] = currentTree === 'avl' ? new AVLTree() : currentTree === 'rb' ? new RBTree() : new BTree(2);
  stepQueue = []; stepIndex = 0; isPlaying = false;
  clearInterval(playTimer);
  metrics = { rotations: 0, ops: 0 };
  isFirstRender = true;
  render(new Map());
  updateStepIndicator();
  hideStepOverlay();
  document.getElementById('traversal-result').style.display = 'none';
  addLog('Tree cleared', 'info');
}

function insertSequence(vals) {
  clearTree();
  for (let v of vals) { trees[currentTree].insert(v); metrics.ops++; }
  isFirstRender = true;
  render(new Map());
  addLog(`Inserted: [${vals.join(', ')}]`, 'insert');
  setTimeout(() => fitTreeToView(), 80);
}

function insertRandom(n) {
  clearTree();
  let vals = [];
  for (let i = 0; i < n; i++) {
    let v = Math.floor(Math.random() * 99) + 1;
    vals.push(v);
    trees[currentTree].insert(v);
    metrics.ops++;
  }
  isFirstRender = true;
  render(new Map());
  addLog(`Random: [${vals.join(', ')}]`, 'insert');
  setTimeout(() => fitTreeToView(), 80);
}

// ============================================================
// TRAVERSALS
// ============================================================
function traversalSteps(order) {
  let tree = trees[currentTree];
  let steps = [], sequence = [];
  steps.push({ type: 'info', desc: `${order} traversal starting…`, highlight: [], kind: 'info' });

  if (currentTree === 'btree') {
    function btInorder(n)  {
      if (!n) return;
      n.keys.forEach((k, i) => {
        if (n.children[i]) btInorder(n.children[i]);
        sequence.push({ id: n.id, val: k });
        steps.push({ type: 'visit', desc: `Visit key ${k}`, highlight: [n.id], kind: 'path' });
      });
      if (n.children[n.keys.length]) btInorder(n.children[n.keys.length]);
    }
    function btPreorder(n) {
      if (!n) return;
      steps.push({ type: 'visit', desc: `Visit node [${n.keys.join(',')}]`, highlight: [n.id], kind: 'path' });
      n.keys.forEach(k => sequence.push({ id: n.id, val: k }));
      n.children.forEach(btPreorder);
    }
    function btPostorder(n) {
      if (!n) return;
      n.children.forEach(btPostorder);
      steps.push({ type: 'visit', desc: `Visit node [${n.keys.join(',')}]`, highlight: [n.id], kind: 'path' });
      n.keys.forEach(k => sequence.push({ id: n.id, val: k }));
    }
    function btLevel(root) {
      let q = [root];
      while (q.length) {
        let n = q.shift(); if (!n) continue;
        steps.push({ type: 'visit', desc: `Visit node [${n.keys.join(',')}]`, highlight: [n.id], kind: 'path' });
        n.keys.forEach(k => sequence.push({ id: n.id, val: k }));
        n.children.forEach(c => q.push(c));
      }
    }
    if      (order === 'inorder')   btInorder(tree.root);
    else if (order === 'preorder')  btPreorder(tree.root);
    else if (order === 'postorder') btPostorder(tree.root);
    else                            btLevel(tree.root);
  } else {
    let root = tree.root;
    function inorder(n)  { if (!n) return; inorder(n.left); sequence.push({id:n.id,val:n.val}); steps.push({type:'visit',desc:`Visit ${n.val}`,highlight:[n.id],kind:'path'}); inorder(n.right); }
    function preorder(n) { if (!n) return; sequence.push({id:n.id,val:n.val}); steps.push({type:'visit',desc:`Visit ${n.val}`,highlight:[n.id],kind:'path'}); preorder(n.left); preorder(n.right); }
    function postorder(n){ if (!n) return; postorder(n.left); postorder(n.right); sequence.push({id:n.id,val:n.val}); steps.push({type:'visit',desc:`Visit ${n.val}`,highlight:[n.id],kind:'path'}); }
    function levelorder(root) {
      if (!root) return;
      let q = [root];
      while (q.length) {
        let n = q.shift();
        sequence.push({id:n.id,val:n.val});
        steps.push({type:'visit',desc:`Visit ${n.val} (BFS)`,highlight:[n.id],kind:'path'});
        if (n.left)  q.push(n.left);
        if (n.right) q.push(n.right);
      }
    }
    if      (order === 'inorder')   inorder(root);
    else if (order === 'preorder')  preorder(root);
    else if (order === 'postorder') postorder(root);
    else                            levelorder(root);
  }

  let vals = sequence.map(s => s.val);
  steps.push({ type: 'found', desc: `${order}: [${vals.join(' → ')}]`, highlight: sequence.map(s => s.id), kind: 'found' });
  return { steps, vals };
}

function doTraversal(order) {
  let tree = trees[currentTree];
  if (!tree.root) { addLog('Tree is empty', 'info'); return; }
  metrics.ops++;
  let { steps, vals } = traversalSteps(order);

  let box = document.getElementById('traversal-result');
  const names = { inorder:'Inorder (L→N→R)', preorder:'Preorder (N→L→R)', postorder:'Postorder (L→R→N)', levelorder:'Level-order (BFS)' };
  document.getElementById('traversal-label').textContent = names[order] || order;
  document.getElementById('traversal-vals').textContent  = vals.join(' → ');
  box.style.display = 'block';

  addLog(`${order}: [${vals.join(', ')}]`, 'search');
  queueSteps(steps);
}

// ============================================================
// STEP SYSTEM
// ============================================================
function queueSteps(steps) {
  stopPlay();
  stepQueue = steps; stepIndex = -1;
  updateStepIndicator();
  if (steps.length > 1) togglePlay();
  else stepForward();
}

function stepForward() {
  if (stepIndex >= stepQueue.length - 1) { stopPlay(); hideStepOverlay(); render(new Map()); return; }
  stepIndex++;
  applyStep(stepQueue[stepIndex]);
  updateStepIndicator();
}

function stepBack() {
  if (stepIndex <= 0) return;
  stepIndex--;
  applyStep(stepQueue[stepIndex]);
  updateStepIndicator();
}

function applyStep(step) {
  if (!step) return;
  let hlMap = new Map();
  (step.highlight || []).forEach(id => { if (id) hlMap.set(id, step.kind || 'path'); });
  render(hlMap);
  showStepOverlay(step);
  logStep(step);
  // Sync pseudo-code
  if (activeRightPanel === 'pseudo') {
    highlightPseudoLines(step.kind || 'info');
  }
}

function showStepOverlay(step) {
  let overlay = document.getElementById('step-overlay');
  let typeEl  = document.getElementById('step-type');
  let descEl  = document.getElementById('step-desc');
  const labels = { insert:'Insert', delete:'Delete', rotate:'Rotation', search:'Search', visit:'Traversal', found:'Found!', recolor:'Recolor', split:'Split', merge:'Merge', info:'Info' };
  typeEl.textContent = labels[step.type] || step.type;
  descEl.textContent = step.desc || '';
  overlay.className  = 'step-overlay show';
}

function hideStepOverlay() {
  document.getElementById('step-overlay').className = 'step-overlay';
}

function togglePlay() {
  if (isPlaying) stopPlay(); else startPlay();
}

function startPlay() {
  if (stepIndex >= stepQueue.length - 1) stepIndex = -1;
  isPlaying = true;
  document.getElementById('play-btn').textContent = '⏸';
  playTimer = setInterval(() => {
    if (stepIndex >= stepQueue.length - 1) { stopPlay(); hideStepOverlay(); render(new Map()); return; }
    stepForward();
  }, animSpeed);
}

function stopPlay() {
  isPlaying = false;
  document.getElementById('play-btn').textContent = '▶';
  clearInterval(playTimer);
}

function updateStepIndicator() {
  let el = document.getElementById('step-indicator');
  if (!stepQueue.length) { el.textContent = 'No steps queued'; return; }
  el.textContent = `Step ${Math.max(0, stepIndex + 1)} / ${stepQueue.length}`;
}

function updateSpeed(v) {
  animSpeed = parseInt(v);
  document.getElementById('speed-val').textContent = (animSpeed / 1000).toFixed(1) + 's';
  if (isPlaying) { stopPlay(); startPlay(); }
}

// ============================================================
// METRICS & LOG
// ============================================================
function updateMetrics() {
  let tree = trees[currentTree];
  document.getElementById('m-size').textContent      = tree.size();
  document.getElementById('m-height').textContent    = tree.getHeight();
  document.getElementById('m-rotations').textContent = metrics.rotations;
  document.getElementById('m-ops').textContent       = metrics.ops;
}

function addLog(msg, type) {
  let log = document.getElementById('log');
  let el  = document.createElement('div');
  el.className  = `log-entry ${type}`;
  el.textContent = `› ${msg}`;
  log.insertBefore(el, log.firstChild);
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

function logStep(step) {
  const typeMap = { rotate:'rotate', recolor:'recolor', insert:'insert', delete:'delete', found:'search', search:'search' };
  let type = typeMap[step.type] || 'info';
  if (step.type === 'visit') return;
  addLog(step.desc, type);
}

// ============================================================
// SWITCH TREE
// ============================================================
function switchTree(type) {
  currentTree = type;
  document.querySelectorAll('.tree-tab').forEach((t, i) => {
    t.classList.toggle('active', ['avl', 'rb', 'btree'][i] === type);
  });
  stopPlay(); stepQueue = []; stepIndex = 0;
  metrics = { rotations: 0, ops: 0 };
  isFirstRender = true;
  updateStepIndicator();
  hideStepOverlay();
  render(new Map());
  updateLegend();
  document.getElementById('traversal-result').style.display = 'none';
  addLog(`Switched to ${type === 'avl' ? 'AVL Tree' : type === 'rb' ? 'Red-Black Tree' : 'B-Tree'}`, 'info');
  if (activeRightPanel === 'pseudo') {
    currentHighlightedLines = new Set();
    renderPseudoCode(type);
  }
}

function updateLegend() {
  let leg = document.getElementById('legend');
  if (currentTree === 'rb') {
    leg.innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:#ef4444;color:#ef4444"></div>Red node</div>
      <div class="legend-item"><div class="legend-dot" style="background:#6b7280;color:#6b7280"></div>Black node</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-rot);color:var(--node-rot)"></div>Rotation</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-rcol);color:var(--node-rcol)"></div>Recolor</div>`;
  } else {
    leg.innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-new);color:var(--node-new)"></div>New node</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-rot);color:var(--node-rot)"></div>Rotating</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-path);color:var(--node-path)"></div>Search path</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-found);color:var(--node-found)"></div>Found</div>`;
  }
}

// ============================================================
// KEYBOARD
// ============================================================
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight') stepForward();
  if (e.key === 'ArrowLeft')  stepBack();
  if (e.key === ' ')          { e.preventDefault(); togglePlay(); }
  if (e.key === 'Escape')     closeAuthModal();
});

document.getElementById('val-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doInsert();
});

// Close modal on overlay click
document.getElementById('auth-modal').addEventListener('click', function(e) {
  if (e.target === this) closeAuthModal();
});

// ── Init ──
initAuth();
render(new Map());
renderPseudoCode('avl');