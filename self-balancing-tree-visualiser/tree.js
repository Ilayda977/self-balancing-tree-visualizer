// ============================================================
// STATE
// ============================================================
let currentTree = 'avl';
let animSpeed = 800;
let stepQueue = [];
let stepIndex = 0;
let isPlaying = false;
let playTimer = null;
let metrics = { rotations: 0, ops: 0 };

// ============================================================
// AVL TREE
// ============================================================
class AVLNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
    this.height = 1;
    this.bf = 0;
    this.id = 'n' + Math.random().toString(36).substr(2, 8);
    this.state = 'normal';
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
    x.right = y;
    y.left = T2;
    this.update(y);
    this.update(x);
    metrics.rotations++;
    return x;
  }

  rotateLeft(x, steps) {
    let y = x.right, T2 = y.left;
    steps.push({ type: 'rotate', desc: `Left rotation on ${x.val}`, highlight: [x.id, y.id], kind: 'rotate' });
    y.left = x;
    x.right = T2;
    this.update(x);
    this.update(y);
    metrics.rotations++;
    return y;
  }

  balance(n, steps) {
    this.update(n);
    if (n.bf > 1) {
      if (this.bf(n.left) < 0) {
        steps.push({ type: 'rotate', desc: `LR case at ${n.val} — left rotate on ${n.left.val} first`, highlight: [n.id], kind: 'rotate' });
        n.left = this.rotateLeft(n.left, steps);
      }
      return this.rotateRight(n, steps);
    }
    if (n.bf < -1) {
      if (this.bf(n.right) > 0) {
        steps.push({ type: 'rotate', desc: `RL case at ${n.val} — right rotate on ${n.right.val} first`, highlight: [n.id], kind: 'rotate' });
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
    steps.push({ type: 'visit', desc: `Comparing ${val} with ${n.val}`, highlight: [n.id], kind: 'path' });
    if (val < n.val)      n.left  = this._insert(n.left,  val, steps);
    else if (val > n.val) n.right = this._insert(n.right, val, steps);
    else {
      steps.push({ type: 'info', desc: `${val} already exists`, highlight: [n.id], kind: 'found' });
      return n;
    }
    return this.balance(n, steps);
  }

  insert(val) {
    let steps = [];
    steps.push({ type: 'info', desc: `Inserting ${val} into AVL Tree`, highlight: [], kind: 'info' });
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
    let steps = [];
    steps.push({ type: 'info', desc: `Deleting ${val} from AVL Tree`, highlight: [], kind: 'info' });
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
    let steps = [];
    steps.push({ type: 'info', desc: `Searching for ${val}`, highlight: [], kind: 'info' });
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
    this.val = val;
    this.color = RED;
    this.left = null;
    this.right = null;
    this.parent = null;
    this.id = 'n' + Math.random().toString(36).substr(2, 8);
    this.state = 'normal';
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
    if (!n.parent)            this.root = r;
    else if (n === n.parent.left) n.parent.left  = r;
    else                          n.parent.right = r;
    r.left = n;
    n.parent = r;
    metrics.rotations++;
  }

  rotateRight(n) {
    this._steps.push({ type: 'rotate', desc: `Right rotate on ${n.val}`, highlight: [n.id, n.left?.id].filter(Boolean), kind: 'rotate' });
    let l = n.left;
    n.left = l.right;
    if (l.right) l.right.parent = n;
    l.parent = n.parent;
    if (!n.parent)             this.root = l;
    else if (n === n.parent.right) n.parent.right = l;
    else                           n.parent.left  = l;
    l.right = n;
    n.parent = l;
    metrics.rotations++;
  }

  insert(val) {
    this._steps = [];
    this._steps.push({ type: 'info', desc: `Inserting ${val} into Red-Black Tree`, highlight: [], kind: 'info' });
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
    if (!par)                  this.root = node;
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
          this._steps.push({ type: 'recolor', desc: `Uncle ${uncle.val} is RED — recolor: parent+uncle→BLACK, grandparent→RED`, highlight: [p.id, uncle.id, g.id], kind: 'recolor' });
          p.color = BLACK; uncle.color = BLACK; g.color = RED; z = g;
        } else {
          if (z === p.right) { z = p; this.rotateLeft(z); p = z.parent; g = p?.parent; if (!g) break; }
          this._steps.push({ type: 'recolor', desc: `Recolor parent+grandparent`, highlight: [p.id, g.id], kind: 'recolor' });
          p.color = BLACK; g.color = RED;
          this.rotateRight(g);
        }
      } else {
        let uncle = g.left;
        if (this.isRed(uncle)) {
          this._steps.push({ type: 'recolor', desc: `Uncle ${uncle.val} is RED — recolor`, highlight: [p.id, uncle.id, g.id], kind: 'recolor' });
          p.color = BLACK; uncle.color = BLACK; g.color = RED; z = g;
        } else {
          if (z === p.left) { z = p; this.rotateRight(z); p = z.parent; g = p?.parent; if (!g) break; }
          this._steps.push({ type: 'recolor', desc: `Recolor parent+grandparent`, highlight: [p.id, g.id], kind: 'recolor' });
          p.color = BLACK; g.color = RED;
          this.rotateLeft(g);
        }
      }
    }
    this.root.color = BLACK;
  }

  delete(val) {
    let steps = [];
    steps.push({ type: 'info', desc: `Delete in Red-Black: ${val}`, highlight: [], kind: 'info' });
    this._steps = steps;
    let node = this._find(val);
    if (!node) { steps.push({ type: 'info', desc: `${val} not found`, highlight: [], kind: 'info' }); return steps; }
    steps.push({ type: 'delete', desc: `Found ${val} — removing`, highlight: [node.id], kind: 'delete' });
    this._rbDelete(node);
    return steps;
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
    let y = z, yOrigColor = y.color, x, xParent;
    if (!z.left) {
      x = z.right; xParent = z.parent; this._transplant(z, z.right);
    } else if (!z.right) {
      x = z.left; xParent = z.parent; this._transplant(z, z.left);
    } else {
      y = this._min(z.right); yOrigColor = y.color;
      x = y.right; xParent = y;
      if (y.parent === z) { if (x) x.parent = y; }
      else {
        xParent = y.parent;
        this._transplant(y, y.right);
        y.right = z.right;
        if (y.right) y.right.parent = y;
      }
      this._transplant(z, y);
      y.left = z.left;
      if (y.left) y.left.parent = y;
      y.color = z.color;
    }
  }

  _transplant(u, v) {
    if (!u.parent)            this.root = v;
    else if (u === u.parent.left) u.parent.left  = v;
    else                          u.parent.right = v;
    if (v) v.parent = u.parent;
  }

  _min(n) { while (n.left) n = n.left; return n; }

  search(val) {
    let steps = [];
    steps.push({ type: 'info', desc: `Searching for ${val} in RB Tree`, highlight: [], kind: 'info' });
    let cur = this.root;
    while (cur) {
      steps.push({ type: 'visit', desc: `Visiting ${cur.val} (${cur.color})`, highlight: [cur.id], kind: 'path' });
      if (val === cur.val) { steps.push({ type: 'found', desc: `Found ${val}!`, highlight: [cur.id], kind: 'found' }); return steps; }
      cur = val < cur.val ? cur.left : cur.right;
    }
    steps.push({ type: 'info', desc: `${val} not found`, highlight: [], kind: 'info' });
    return steps;
  }

  size(n = this.root)  { return n ? 1 + this.size(n.left) + this.size(n.right) : 0; }
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
    this.keys     = [];
    this.children = [];
    this.leaf     = leaf;
    this.id       = 'bn' + Math.random().toString(36).substr(2, 8);
    this.state    = 'normal';
  }
}

class BTree {
  constructor(t = 2) { this.t = t; this.root = new BTreeNode(true); this._steps = []; }

  insert(val) {
    this._steps = [];
    this._steps.push({ type: 'info', desc: `Inserting ${val} into B-Tree (t=${this.t})`, highlight: [], kind: 'info' });
    let r = this.root;
    if (r.keys.length === 2 * this.t - 1) {
      let s = new BTreeNode(false);
      this.root = s;
      s.children.push(r);
      this._steps.push({ type: 'split', desc: `Root is full — splitting root`, highlight: [r.id], kind: 'rotate' });
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
      this._steps.push({ type: 'insert', desc: `Inserted ${val} into leaf node`, highlight: [n.id], kind: 'new' });
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
    let steps = [{ type: 'info', desc: `Delete ${val} from B-Tree`, highlight: [], kind: 'info' }];
    this._steps = steps;
    this._delete(this.root, val);
    if (this.root.keys.length === 0 && this.root.children.length > 0) {
      this.root = this.root.children[0];
    }
    return steps;
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
          this._steps.push({ type: 'info', desc: `Replace with predecessor ${pred}`, highlight: [n.id], kind: 'info' });
          n.keys[i] = pred;
          this._delete(n.children[i], pred);
        } else if (n.children[i + 1].keys.length >= t) {
          let succ = this._getSucc(n.children[i + 1]);
          this._steps.push({ type: 'info', desc: `Replace with successor ${succ}`, highlight: [n.id], kind: 'info' });
          n.keys[i] = succ;
          this._delete(n.children[i + 1], succ);
        } else {
          this._merge(n, i);
          this._delete(n.children[i], val);
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
    child.keys     = child.keys.concat(sib.keys);
    child.children = child.children.concat(sib.children);
    n.keys.splice(i, 1);
    n.children.splice(i + 1, 1);
    this._steps.push({ type: 'merge', desc: `Merged children at index ${i}`, highlight: [child.id], kind: 'rotate' });
  }

  search(val) {
    let steps = [];
    steps.push({ type: 'info', desc: `Searching for ${val} in B-Tree`, highlight: [], kind: 'info' });
    this._search(this.root, val, steps);
    return steps;
  }

  _search(n, val, steps) {
    if (!n) return;
    steps.push({ type: 'visit', desc: `Checking node [${n.keys.join(', ')}]`, highlight: [n.id], kind: 'path' });
    let i = 0;
    while (i < n.keys.length && val > n.keys[i]) i++;
    if (i < n.keys.length && n.keys[i] === val) {
      steps.push({ type: 'found', desc: `Found ${val}!`, highlight: [n.id], kind: 'found' });
      return;
    }
    if (n.leaf) { steps.push({ type: 'info', desc: `${val} not found`, highlight: [], kind: 'info' }); return; }
    this._search(n.children[i], val, steps);
  }

  size(n = this.root)  { if (!n) return 0; return n.keys.length + n.children.reduce((a, c) => a + this.size(c), 0); }
  getHeight(n = this.root) { if (!n || n.leaf) return 1; return 1 + this.getHeight(n.children[0]); }
}

// ============================================================
// TREE INSTANCES
// ============================================================
let trees = { avl: new AVLTree(), rb: new RBTree(), btree: new BTree(2) };

// ============================================================
// D3 VISUALIZATION
// ============================================================
const svg = d3.select('#tree-svg');
let g = svg.append('g');

let zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);

function treeToD3(tree) {
  if (currentTree === 'avl')    return nodeToD3_avl(tree.root);
  if (currentTree === 'rb')     return tree.toD3();
  if (currentTree === 'btree')  return nodeToD3_btree(tree.root);
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

function render(highlights = new Map()) {
  let tree = trees[currentTree];
  let data = treeToD3(tree);
  g.selectAll('*').remove();

  if (!data) { document.getElementById('empty-state').style.display = 'block'; return; }
  document.getElementById('empty-state').style.display = 'none';

  let hierarchy  = d3.hierarchy(data);
  let treeLayout = d3.tree()
    .nodeSize([currentTree === 'btree' ? 100 : 60, 80])
    .separation((a, b) => a.parent === b.parent ? 1.4 : 2);
  treeLayout(hierarchy);

  // Links
  g.selectAll('path.link')
    .data(hierarchy.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr('d', d => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`)
    .attr('stroke', '#2a2a3a')
    .attr('stroke-width', 1.5)
    .attr('fill', 'none');

  // Nodes
  let node = g.selectAll('g.node')
    .data(hierarchy.descendants())
    .enter().append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.data.x || d.x},${d.data.y || d.y})`)
    .style('cursor', 'pointer')
    .on('mouseover', function(e, d) {
      let tip = document.getElementById('node-tooltip');
      tip.style.display = 'block';
      tip.style.left = (e.pageX + 12) + 'px';
      tip.style.top  = (e.pageY - 12) + 'px';
      if      (currentTree === 'avl')    tip.innerHTML = `Value: <b>${d.data.val}</b><br>BF: <b>${d.data.bf}</b>`;
      else if (currentTree === 'rb')     tip.innerHTML = `Value: <b>${d.data.val}</b><br>Color: <b>${d.data.rbColor}</b>`;
      else                               tip.innerHTML = `Keys: <b>[${d.data.keys?.join(', ')}]</b>`;
    })
    .on('mouseout', () => { document.getElementById('node-tooltip').style.display = 'none'; });

  node.each(function(d) {
    let el          = d3.select(this);
    let id          = d.data.id;
    let isHighlight = highlights.has(id);

    if (currentTree === 'btree') {
      let keys = d.data.keys || [d.data.val];
      let w = Math.max(keys.length * 32, 40), h = 30;
      el.append('rect')
        .attr('x', -w / 2).attr('y', -h / 2).attr('width', w).attr('height', h).attr('rx', 6)
        .attr('fill',   isHighlight ? getHighlightColor(highlights, id) : '#1a1a2e')
        .attr('stroke', isHighlight ? '#fff' : '#3a3a5c')
        .attr('stroke-width', isHighlight ? 2 : 1);
      keys.forEach((k, i) => {
        let x = -w / 2 + i * 32 + 16;
        el.append('text').attr('x', x).attr('y', 5).attr('text-anchor', 'middle')
          .attr('fill', isHighlight ? '#111' : '#e8e8f0').attr('font-size', 13).attr('font-weight', 600).text(k);
        if (i < keys.length - 1)
          el.append('line').attr('x1', x + 16).attr('y1', -h / 2).attr('x2', x + 16).attr('y2', h / 2).attr('stroke', '#3a3a5c');
      });
    } else {
      let fill = '#1a1a2e', stroke = '#3a3a5c';
      if (currentTree === 'rb') {
        fill   = d.data.rbColor === RED ? '#c0392b' : '#2f3542';
        stroke = d.data.rbColor === RED ? '#e74c3c' : '#57606f';
      }
      if (isHighlight) { fill = getHighlightColor(highlights, id); stroke = '#fff'; }

      el.append('circle').attr('r', 22).attr('fill', fill).attr('stroke', stroke).attr('stroke-width', isHighlight ? 2.5 : 1.5);
      el.append('text').attr('dy', 5).attr('text-anchor', 'middle')
        .attr('fill', isHighlight ? '#111' : '#e8e8f0').attr('font-size', 13).attr('font-weight', 600).text(d.data.val);

      if (currentTree === 'avl') {
        el.append('text').attr('dy', -28).attr('text-anchor', 'middle')
          .attr('fill', d.data.bf === 0 ? '#888899' : (Math.abs(d.data.bf) > 1 ? '#ff4757' : '#ffd166'))
          .attr('font-size', 10).text(`bf:${d.data.bf}`);
      }
      if (currentTree === 'rb') {
        el.append('text').attr('dy', 34).attr('text-anchor', 'middle')
          .attr('fill', d.data.rbColor === RED ? '#e74c3c' : '#888899')
          .attr('font-size', 10).text(d.data.rbColor.toUpperCase()[0]);
      }
    }
  });

  updateMetrics();
}

function getHighlightColor(hl, id) {
  if (!hl.has(id)) return '#1a1a2e';
  let t = hl.get(id);
  const map = {
    new:       '#26de81',
    path:      '#ff9f43',
    found:     '#ffd166',
    delete:    '#ff4757',
    rotate:    '#fd79a8',
    recolor:   '#6c63ff',
    highlight: '#ffd166',
    info:      '#888899'
  };
  return map[t] || '#00d4aa';
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
  render(new Map());
  updateStepIndicator();
  hideStepOverlay();
  document.getElementById('traversal-result').style.display = 'none';
  addLog('Tree cleared', 'info');
}

function insertSequence(vals) {
  clearTree();
  for (let v of vals) { trees[currentTree].insert(v); metrics.ops++; }
  render(new Map());
  addLog(`Inserted: [${vals.join(', ')}]`, 'insert');
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
  render(new Map());
  addLog(`Random insert: [${vals.join(', ')}]`, 'insert');
}

// ============================================================
// TRAVERSALS
// ============================================================
function traversalSteps(order) {
  let tree = trees[currentTree];
  let steps = [];
  let sequence = [];
  steps.push({ type: 'info', desc: `${order.charAt(0).toUpperCase() + order.slice(1)} traversal starting...`, highlight: [], kind: 'info' });

  if (currentTree === 'btree') {
    function btInorder(n) {
      if (!n) return;
      n.keys.forEach((k, i) => {
        if (n.children[i]) btInorder(n.children[i]);
        sequence.push({ id: n.id, val: k });
        steps.push({ type: 'visit', desc: `Visit key ${k} in node [${n.keys.join(',')}]`, highlight: [n.id], kind: 'path' });
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
        let n = q.shift();
        if (!n) continue;
        steps.push({ type: 'visit', desc: `Visit node [${n.keys.join(',')}]`, highlight: [n.id], kind: 'path' });
        n.keys.forEach(k => sequence.push({ id: n.id, val: k }));
        n.children.forEach(c => q.push(c));
      }
    }
    if      (order === 'inorder')    btInorder(tree.root);
    else if (order === 'preorder')   btPreorder(tree.root);
    else if (order === 'postorder')  btPostorder(tree.root);
    else                             btLevel(tree.root);

  } else {
    let root = tree.root;

    function inorder(n) {
      if (!n) return;
      inorder(n.left);
      sequence.push({ id: n.id, val: n.val });
      steps.push({ type: 'visit', desc: `Visit ${n.val}`, highlight: [n.id], kind: 'path' });
      inorder(n.right);
    }
    function preorder(n) {
      if (!n) return;
      sequence.push({ id: n.id, val: n.val });
      steps.push({ type: 'visit', desc: `Visit ${n.val}`, highlight: [n.id], kind: 'path' });
      preorder(n.left);
      preorder(n.right);
    }
    function postorder(n) {
      if (!n) return;
      postorder(n.left);
      postorder(n.right);
      sequence.push({ id: n.id, val: n.val });
      steps.push({ type: 'visit', desc: `Visit ${n.val}`, highlight: [n.id], kind: 'path' });
    }
    function levelorder(root) {
      if (!root) return;
      let q = [root];
      while (q.length) {
        let n = q.shift();
        sequence.push({ id: n.id, val: n.val });
        steps.push({ type: 'visit', desc: `Visit ${n.val} (level-order)`, highlight: [n.id], kind: 'path' });
        if (n.left)  q.push(n.left);
        if (n.right) q.push(n.right);
      }
    }

    if      (order === 'inorder')    inorder(root);
    else if (order === 'preorder')   preorder(root);
    else if (order === 'postorder')  postorder(root);
    else                             levelorder(root);
  }

  let vals = sequence.map(s => s.val);
  steps.push({ type: 'found', desc: `${order}: [${vals.join(' → ')}]`, highlight: sequence.map(s => s.id), kind: 'found' });
  return { steps, vals, sequence };
}

function doTraversal(order) {
  let tree = trees[currentTree];
  if (!tree.root) { addLog('Tree is empty', 'info'); return; }
  metrics.ops++;
  let { steps, vals } = traversalSteps(order);

  let box    = document.getElementById('traversal-result');
  let label  = document.getElementById('traversal-label');
  let valsEl = document.getElementById('traversal-vals');
  box.style.display = 'block';
  const names = {
    inorder:    'Inorder (L→N→R)',
    preorder:   'Preorder (N→L→R)',
    postorder:  'Postorder (L→R→N)',
    levelorder: 'Level-order (BFS)'
  };
  label.textContent = names[order] || order;
  valsEl.textContent = vals.join(' → ');

  addLog(`${order}: [${vals.join(', ')}]`, 'search');
  queueSteps(steps);
}

// ============================================================
// STEP SYSTEM
// ============================================================
function queueSteps(steps) {
  stopPlay();
  stepQueue  = steps;
  stepIndex  = -1;
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
  if (isPlaying) stopPlay();
  else           startPlay();
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
  while (log.children.length > 30) log.removeChild(log.lastChild);
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
  updateStepIndicator();
  hideStepOverlay();
  render(new Map());
  updateLegend();
  document.getElementById('traversal-result').style.display = 'none';
  addLog(`Switched to ${type === 'avl' ? 'AVL' : type === 'rb' ? 'Red-Black' : 'B-Tree'}`, 'info');
}

function updateLegend() {
  let leg = document.getElementById('legend');
  if (currentTree === 'rb') {
    leg.innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:#c0392b"></div>Red node</div>
      <div class="legend-item"><div class="legend-dot" style="background:#2f3542"></div>Black node</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-rotating)"></div>Recolor</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-path)"></div>Path</div>`;
  } else {
    leg.innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-new)"></div>New node</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-rotating)"></div>Rotating</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-path)"></div>Search path</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-highlight)"></div>Found</div>`;
  }
}
// ============================================================
// KEYBOARD
// ============================================================
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') stepForward();
  if (e.key === 'ArrowLeft')  stepBack();
  if (e.key === ' ')          { e.preventDefault(); togglePlay(); }
});

document.getElementById('val-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doInsert();
});

// Init
render(new Map());