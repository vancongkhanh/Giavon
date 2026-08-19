/* =====================================================================
   GIÁ VỐN — CỬA HÀNG KHÁNH HÀ (trang nội bộ, tách biệt với web chính)
   Đọc/ghi chung dữ liệu products/categories với Firestore của web chính.
   Chỉ vào được sau khi nhập đúng mật khẩu (đăng nhập ngầm bằng 1 tài
   khoản Firebase Auth cố định — xem GIAVON_EMAIL) — firestore.rules xác
   thực thật qua UID tài khoản này, không chỉ ẩn giao diện.
   Giao diện thẻ danh sách nhại theo trang admin Khánh Hà (m-card...),
   chỉ hiển thị/sửa Giá vốn (costPrice, field riêng của trang này) và
   Giá bán (price). Không hiển thị mô tả, còn hàng, bán chạy, giá gốc.
   ===================================================================== */

import { db, auth, getStorageLazy } from './firebase-init.js';
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

var GIAVON_EMAIL = 'giavon@khanhha-web.internal';

var STORAGE_BUCKET = 'khanhha-web.firebasestorage.app';
var PRODUCTS_PER_PAGE = 20;
var THUMB_COLORS = ['var(--pine)', 'var(--pine-light)', '#8A4E27', 'var(--copper)'];

var CATEGORY_ICON_PATHS = {
  pot: '<path d="M4 9h16v2a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7V9Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
  socket: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 11h16"/>',
  shelf: '<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/>',
  bottle: '<path d="M6 4h12l-1 16H7L6 4Z"/><path d="M9 9h6"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  awning: '<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3Z"/>',
  box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  lightbulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3Z"/>',
  shirt: '<path d="M8 4 4 7l2 3 2-1v10h8V9l2 1 2-3-4-3-2 2h-4L8 4Z"/>',
  scissors: '<circle cx="7" cy="6" r="2.5"/><circle cx="7" cy="18" r="2.5"/><path d="M8.6 7.6 20 18"/><path d="M20 6 8.6 16.4"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9h16v4H4z"/><path d="M12 9v11"/><path d="M12 9c-1-3-5-4-5-1.5S9 9 12 9Z"/><path d="M12 9c1-3 5-4 5-1.5S15 9 12 9Z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z"/>',
  star: '<path d="m12 3 2.6 5.8 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 19.9l1.4-6.2L3 9.4l6.4-.6L12 3Z"/>',
  heart: '<path d="M12 20.5S3.5 15 3.5 8.8A4.3 4.3 0 0 1 12 6.5a4.3 4.3 0 0 1 8.5 2.3C20.5 15 12 20.5 12 20.5Z"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  truck: '<rect x="2" y="8" width="12" height="9" rx="1"/><path d="M14 11h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
  umbrella: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"/><path d="M12 12v7a2 2 0 0 1-4 0"/>',
  leaf: '<path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z"/><path d="M4 20 14 10"/>',
  fan: '<circle cx="12" cy="12" r="1.6"/><path d="M12 12c0-4 2-7 5-7s3 4-1 6"/><path d="M12 12c-4 0-7-2-7-5s4-3 6 1"/><path d="M12 12c0 4-2 7-5 7s-3-4 1-6"/><path d="M12 12c4 0 7 2 7 5s-4 3-6-1"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
  bed: '<path d="M3 19v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 15h18"/><path d="M7 12V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/>',
  basket: '<path d="M4 9h16l-2 10H6L4 9Z"/><path d="M4 9 7 4h10l3 5"/><path d="M9 13v3M12 13v3M15 13v3"/>'
};

function editIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
}
function trashIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫';
}

function parseFormattedNumber(str) {
  var raw = String(str || '').replace(/[^\d]/g, '');
  return raw ? Number(raw) : 0;
}

function attachNumberFormatting(el) {
  el.addEventListener('input', function () {
    var raw = this.value.replace(/[^\d]/g, '');
    this.value = raw ? Number(raw).toLocaleString('vi-VN') : '';
  });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function removeDiacritics(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function slugify(str) {
  return removeDiacritics(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function storagePathToUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  return 'https://firebasestorage.googleapis.com/v0/b/' + STORAGE_BUCKET + '/o/' + encodeURIComponent(path) + '?alt=media';
}

function categoryIconSvg(iconName, strokeWidth) {
  var inner = CATEGORY_ICON_PATHS[iconName] || CATEGORY_ICON_PATHS.pot;
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="' + (strokeWidth || 1.5) +
    '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}

function showToast(text) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
}

/* =======================================================================
   ĐĂNG NHẬP BẰNG MẬT KHẨU (ngầm dùng 1 tài khoản Firebase Auth cố định)
   ======================================================================= */

var loginGate = document.getElementById('loginGate');
var appRoot = document.getElementById('appRoot');
var loginForm = document.getElementById('loginForm');
var loginPassword = document.getElementById('loginPassword');
var loginError = document.getElementById('loginError');
var loginSubmitBtn = document.getElementById('loginSubmitBtn');
var logoutBtn = document.getElementById('logoutBtn');
var reloadBtn = document.getElementById('reloadBtn');

var dataLoaded = false;

if (loginForm) {
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var pwd = loginPassword.value;
    if (!pwd) return;
    loginError.textContent = '';
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Đang kiểm tra...';
    signInWithEmailAndPassword(auth, GIAVON_EMAIL, pwd)
      .catch(function () {
        loginError.textContent = 'Sai mật khẩu, thử lại.';
      })
      .finally(function () {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = 'Vào trang';
      });
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', function () {
    signOut(auth);
    dataLoaded = false;
  });
}

if (reloadBtn) {
  reloadBtn.addEventListener('click', function () {
    if (reloadBtn.disabled) return;
    reloadBtn.disabled = true;
    reloadBtn.classList.add('spinning');
    reloadAndRender()
      .then(function () { showToast('Đã tải lại dữ liệu'); })
      .catch(function (err) {
        console.error('Không tải lại được dữ liệu:', err);
        showToast('Tải lại thất bại, thử lại');
      })
      .finally(function () {
        reloadBtn.disabled = false;
        reloadBtn.classList.remove('spinning');
      });
  });
}

onAuthStateChanged(auth, function (user) {
  if (user) {
    loginGate.hidden = true;
    appRoot.hidden = false;
    loginPassword.value = '';
    if (!dataLoaded) {
      dataLoaded = true;
      init();
    }
  } else {
    loginGate.hidden = false;
    appRoot.hidden = true;
  }
});

/* =======================================================================
   DỮ LIỆU SẢN PHẨM / DANH MỤC
   ======================================================================= */

var categoriesCache = [];
var productsCache = [];

async function fetchCategories() {
  var snap = await getDocs(query(collection(db, 'categories'), orderBy('order')));
  return snap.docs.map(function (d) { return d.data(); });
}

async function fetchProducts() {
  var snap = await getDocs(collection(db, 'products'));
  return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
}

function renderCategoryFilterSelect(categories) {
  var select = document.getElementById('categoryFilterSelect');
  if (!select) return;
  var current = select.value || 'all';
  select.innerHTML = '<option value="all">Tất cả danh mục</option>' +
    categories.map(function (c) {
      return '<option value="' + escapeHtml(c.slug) + '">' + escapeHtml(c.name) + '</option>';
    }).join('');
  select.value = current;
}

function renderCategorySelect(categories, selectedSlug) {
  var select = document.getElementById('pf-category');
  if (!select) return;
  select.innerHTML = categories.map(function (c) {
    return '<option value="' + escapeHtml(c.slug) + '"' + (c.slug === selectedSlug ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
  }).join('');
}

/**
 * Thẻ sản phẩm (giống thẻ mobile trang admin) — dòng dưới cùng: Giá vốn
 * (trái, bấm để sửa nhanh) và Giá bán (phải). Có nút Sửa (mở form đầy
 * đủ) và Xoá. Không hiển thị mô tả, còn hàng, bán chạy, giá gốc.
 */
function renderProductGrid(container, products, categories) {
  if (!container) return;

  if (!products.length) {
    container.innerHTML = '<p class="empty-state">Chưa có sản phẩm nào.</p>';
    return;
  }

  var catMap = {};
  categories.forEach(function (c) { catMap[c.slug] = c; });

  container.innerHTML = products.map(function (p, i) {
    var cat = catMap[p.category] || {};
    var hasImage = p.images && p.images.length > 0;
    var thumbStyle = hasImage ? '' : 'background:' + THUMB_COLORS[i % THUMB_COLORS.length] + ';';
    var thumbInner = hasImage
      ? '<img src="' + storagePathToUrl(p.images[0]) + '" alt="" loading="lazy" decoding="async">'
      : categoryIconSvg(cat.icon, 1.5);
    var hasCost = p.costPrice !== undefined && p.costPrice !== null && p.costPrice !== '';
    var costDisplay = hasCost ? formatPrice(p.costPrice) : '—';

    return '<div class="m-card" data-category="' + escapeHtml(p.category) + '">' +
      '<div class="m-top">' +
        '<div class="m-thumb" style="' + thumbStyle + '">' + thumbInner + '</div>' +
        '<div class="m-info"><div class="m-name">' + escapeHtml(p.name) + '</div><span class="m-tag">' + escapeHtml(cat.name || '') + '</span></div>' +
        '<div class="m-acts">' +
          '<button type="button" class="m-edit" data-action="edit" data-id="' + escapeHtml(p.id) + '" aria-label="Sửa">' + editIcon() + '</button>' +
          '<button type="button" class="m-del" data-action="delete" data-id="' + escapeHtml(p.id) + '" aria-label="Xoá">' + trashIcon() + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="m-div"></div>' +
      '<div class="m-bottom">' +
        '<span class="m-cost" data-id="' + escapeHtml(p.id) + '" data-value="' + (hasCost ? p.costPrice : '') + '">' +
          '<label>Giá vốn</label><b class="m-cost-value">' + costDisplay + '</b>' +
        '</span>' +
        '<span class="m-sell">' +
          '<label>Giá bán</label><b>' + formatPrice(p.price) + '</b>' +
        '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

/**
 * Bấm vào ô "Giá vốn" của 1 thẻ để sửa nhanh tại chỗ, không cần mở form.
 */
function initCostPriceEditing(container) {
  if (!container) return;

  container.addEventListener('click', function (e) {
    var span = e.target.closest('.m-cost');
    if (!span || span.querySelector('input')) return;

    var id = span.dataset.id;
    var current = span.dataset.value;

    function renderValue(val) {
      var display = (val !== null && val !== undefined && val !== '') ? formatPrice(val) : '—';
      span.innerHTML = '<label>Giá vốn</label><b class="m-cost-value">' + display + '</b>';
    }

    span.innerHTML = '<label>Giá vốn</label><input type="number" min="0" step="1000" class="m-cost-input" value="' + (current || '') + '" placeholder="Nhập giá vốn">';
    var input = span.querySelector('input');
    input.focus();
    input.select();

    var settled = false;

    function save() {
      if (settled) return;
      settled = true;
      var raw = input.value.trim();
      var num = raw === '' ? null : Number(raw);

      if (raw !== '' && (isNaN(num) || num < 0)) {
        alert('Giá vốn không hợp lệ.');
        renderValue(current);
        return;
      }

      span.innerHTML = '<label>Giá vốn</label><b class="m-cost-value">Đang lưu…</b>';
      updateDoc(doc(db, 'products', id), { costPrice: num })
        .then(function () {
          span.dataset.value = num === null ? '' : num;
          var prod = productsCache.find(function (p) { return p.id === id; });
          if (prod) prod.costPrice = num;
          renderValue(num);
        })
        .catch(function (err) {
          console.error('Không lưu được giá vốn:', err);
          alert('Không lưu được giá vốn, thử lại.');
          renderValue(current);
        });
    }

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); settled = true; renderValue(current); }
    });
    input.addEventListener('blur', save);
    input.addEventListener('click', function (ev) { ev.stopPropagation(); });
  });
}

/* =======================================================================
   FORM THÊM / SỬA SẢN PHẨM (modal)
   ======================================================================= */

var modalOverlay = document.getElementById('productModal');
var modalTitle = document.getElementById('modalTitle');
var modalImages = [];
var editingId = null;

function renderProductImageSlots() {
  var row = document.getElementById('pf-image-row');
  if (!row) return;
  row.innerHTML = modalImages.map(function (url, idx) {
    return '<div class="image-slot" style="background-image:url(\'' + storagePathToUrl(url) + '\');background-size:cover;background-position:center;">' +
      '<button type="button" class="image-remove" data-idx="' + idx + '" aria-label="Xoá ảnh">&times;</button></div>';
  }).join('');

  var dropzone = document.getElementById('pf-image-drop');
  if (dropzone) {
    var reachedMax = modalImages.length >= 4;
    dropzone.classList.toggle('disabled', reachedMax);
    var label = dropzone.querySelector('span');
    if (label) label.textContent = reachedMax ? 'Đã đạt tối đa 4 ảnh — xoá bớt để thêm ảnh khác' : 'Kéo ảnh vào đây hoặc bấm để chọn';
  }
}

function compressImageFile(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var maxW = 1000;
      var scale = Math.min(1, maxW / img.width);
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error('Không nén được ảnh'));
      }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

function uploadToStorage(pathPrefix, file) {
  return Promise.all([compressImageFile(file), getStorageLazy()]).then(function (results) {
    var blob = results[0];
    var s = results[1];
    var path = pathPrefix + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    var storageRef = s.ref(s.storage, path);
    return s.uploadBytes(storageRef, blob).then(function () { return s.getDownloadURL(storageRef); });
  });
}

function uploadProductImageFile(file, silent) {
  if (modalImages.length >= 4) { showToast('Tối đa 4 ảnh mỗi sản phẩm'); return Promise.resolve(); }
  if (!file || file.type.indexOf('image/') !== 0) { showToast('Vui lòng chọn file ảnh'); return Promise.resolve(); }
  if (!silent) showToast('Đang tải ảnh lên...');
  return uploadToStorage('products', file).then(function (url) {
    modalImages.push(url);
    renderProductImageSlots();
    if (!silent) showToast('Đã tải ảnh lên');
  }).catch(function (err) {
    console.error(err);
    showToast('Tải ảnh thất bại, thử lại');
  });
}

function uploadProductImageFiles(fileList) {
  var files = Array.prototype.slice.call(fileList || []);
  if (!files.length) return;
  var multi = files.length > 1;
  if (multi) showToast('Đang tải ' + files.length + ' ảnh lên...');
  files.reduce(function (chain, file) {
    return chain.then(function () { return uploadProductImageFile(file, multi); });
  }, Promise.resolve()).then(function () {
    if (multi) showToast('Đã tải ảnh lên');
  });
}

function openProductModal(product) {
  editingId = product ? product.id : null;
  modalTitle.textContent = editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
  modalImages = product && product.images ? product.images.slice() : [];

  renderCategorySelect(categoriesCache, product ? product.category : (categoriesCache[0] && categoriesCache[0].slug));
  document.getElementById('pf-name').value = product ? product.name : '';
  document.getElementById('pf-price').value = product && product.price ? Number(product.price).toLocaleString('vi-VN') : '';
  document.getElementById('pf-cost').value = product && product.costPrice ? Number(product.costPrice).toLocaleString('vi-VN') : '';
  renderProductImageSlots();

  modalOverlay.hidden = false;
}

function closeProductModal() {
  modalOverlay.hidden = true;
  editingId = null;
  modalImages = [];
}

function saveProductFromModal(btn) {
  var name = document.getElementById('pf-name').value.trim();
  if (!name) { showToast('Vui lòng nhập tên sản phẩm'); return; }

  var data = {
    name: name,
    category: document.getElementById('pf-category').value,
    price: parseFormattedNumber(document.getElementById('pf-price').value),
    costPrice: document.getElementById('pf-cost').value ? parseFormattedNumber(document.getElementById('pf-cost').value) : null,
    images: modalImages,
    updatedAt: serverTimestamp()
  };

  var promise;
  if (editingId) {
    promise = updateDoc(doc(db, 'products', editingId), data);
  } else {
    data.slug = slugify(name);
    data.isActive = true;
    data.stock = true;
    data.isFeatured = false;
    data.createdAt = serverTimestamp();
    promise = addDoc(collection(db, 'products'), data);
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  promise.then(function () {
    showToast(editingId ? 'Đã lưu thay đổi sản phẩm' : 'Đã thêm sản phẩm mới');
    closeProductModal();
    return reloadAndRender();
  }).catch(function (err) {
    console.error(err);
    showToast('Lưu sản phẩm thất bại');
  }).finally(function () {
    if (btn) { btn.disabled = false; btn.textContent = 'Lưu sản phẩm'; }
  });
}

function deleteProduct(id) {
  return deleteDoc(doc(db, 'products', id)).then(function () {
    showToast('Đã xoá sản phẩm');
    return reloadAndRender();
  }).catch(function (err) {
    console.error(err);
    showToast('Xoá thất bại, thử lại');
  });
}

function initModalEvents() {
  document.getElementById('addProductBtn').addEventListener('click', function () { openProductModal(null); });
  document.getElementById('modalCloseBtn').addEventListener('click', closeProductModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeProductModal);

  document.getElementById('modalSaveBtn').addEventListener('click', function (e) { saveProductFromModal(e.currentTarget); });

  attachNumberFormatting(document.getElementById('pf-price'));
  attachNumberFormatting(document.getElementById('pf-cost'));

  var dropzone = document.getElementById('pf-image-drop');
  var fileInput = document.getElementById('pf-image-file');
  dropzone.addEventListener('click', function () { if (!dropzone.classList.contains('disabled')) fileInput.click(); });
  dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('drag-over'); });
  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    uploadProductImageFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', function (e) {
    uploadProductImageFiles(e.target.files);
    e.target.value = '';
  });

  document.getElementById('pf-image-row').addEventListener('click', function (e) {
    var btn = e.target.closest('.image-remove');
    if (!btn) return;
    modalImages.splice(Number(btn.dataset.idx), 1);
    renderProductImageSlots();
  });
}

function initCardActions(container) {
  container.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var id = btn.dataset.id;
    var product = productsCache.find(function (p) { return p.id === id; });

    if (btn.dataset.action === 'edit') {
      openProductModal(product);
    } else if (btn.dataset.action === 'delete') {
      if (confirm('Xoá sản phẩm "' + (product ? product.name : '') + '"? Không thể hoàn tác.')) {
        deleteProduct(id);
      }
    }
  });
}

/* =======================================================================
   BỘ LỌC DANH MỤC + TÌM KIẾM + PHÂN TRANG
   ======================================================================= */

var currentPage = 1;

/**
 * Lọc trên dữ liệu (productsCache), không phải trên DOM — để chỉ cần
 * render đúng danh sách của trang hiện tại (xem renderCurrentPage).
 */
function getFilteredProducts() {
  var categorySelect = document.getElementById('categoryFilterSelect');
  var searchInput = document.getElementById('productSearch');
  var cat = categorySelect ? categorySelect.value : 'all';
  var q = searchInput ? removeDiacritics(searchInput.value.trim()) : '';

  return productsCache.filter(function (p) {
    var matchesCategory = cat === 'all' || p.category === cat;
    var matchesQuery = !q || removeDiacritics(p.name).indexOf(q) !== -1;
    return matchesCategory && matchesQuery;
  });
}

/**
 * Chỉ render đúng PRODUCTS_PER_PAGE sản phẩm của trang hiện tại (thay vì
 * render hết rồi ẩn bớt bằng CSS) — tránh trình duyệt tải ảnh của toàn
 * bộ sản phẩm cùng lúc, vốn là nguyên nhân chính khiến trang tải chậm.
 */
function renderCurrentPage() {
  var grid = document.getElementById('productGrid');
  var subtitleEl = document.getElementById('productSubtitle');
  var matches = getFilteredProducts();

  if (subtitleEl) subtitleEl.textContent = matches.length + ' / ' + productsCache.length + ' sản phẩm';

  var totalPages = Math.max(1, Math.ceil(matches.length / PRODUCTS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  var startIdx = (currentPage - 1) * PRODUCTS_PER_PAGE;
  var pageItems = matches.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

  renderProductGrid(grid, pageItems, categoriesCache);
  renderPagination(matches.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
  var paginationEl = document.getElementById('productPagination');
  if (!paginationEl) return;
  if (totalItems <= PRODUCTS_PER_PAGE) {
    paginationEl.innerHTML = '';
    return;
  }
  paginationEl.innerHTML =
    '<button type="button" class="page-btn" id="pagePrevBtn">‹ Trước</button>' +
    '<span class="page-info">Trang ' + currentPage + ' / ' + totalPages + '</span>' +
    '<button type="button" class="page-btn" id="pageNextBtn">Sau ›</button>';

  var prevBtn = document.getElementById('pagePrevBtn');
  var nextBtn = document.getElementById('pageNextBtn');
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  prevBtn.addEventListener('click', function () { goToPage(currentPage - 1); });
  nextBtn.addEventListener('click', function () { goToPage(currentPage + 1); });
}

function goToPage(page) {
  currentPage = page;
  renderCurrentPage();
  var grid = document.getElementById('productGrid');
  if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Gắn sự kiện lọc 1 lần duy nhất (không gọi lại mỗi lần reload dữ liệu,
 * tránh cộng dồn nhiều listener trùng nhau trên cùng 1 ô tìm kiếm/select).
 */
function initProductFilter() {
  var categorySelect = document.getElementById('categoryFilterSelect');
  var searchInput = document.getElementById('productSearch');

  if (categorySelect) {
    categorySelect.addEventListener('change', function () {
      currentPage = 1;
      renderCurrentPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      currentPage = 1;
      renderCurrentPage();
    });
  }
}

/* =======================================================================
   KHỞI TẠO
   ======================================================================= */

async function reloadAndRender() {
  var results = await Promise.all([fetchCategories(), fetchProducts()]);
  categoriesCache = results[0];
  productsCache = results[1];
  renderCategoryFilterSelect(categoriesCache);
  currentPage = 1;
  renderCurrentPage();
}

async function init() {
  var grid = document.getElementById('productGrid');
  if (!grid) return;

  initModalEvents();
  initCardActions(grid);
  initCostPriceEditing(grid);
  initProductFilter();

  try {
    await reloadAndRender();
  } catch (err) {
    console.error('Không tải được danh sách sản phẩm:', err);
    grid.innerHTML = '<p class="empty-state">Không tải được sản phẩm, vui lòng tải lại trang.</p>';
  }
}
