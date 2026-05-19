import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyBVeJ7TQeQPEkqNuSx5Wo2yo3TecVxLSGk",
    authDomain: "mazza-food.firebaseapp.com",
    projectId: "mazza-food",
    storageBucket: "mazza-food.firebasestorage.app",
    messagingSenderId: "146730977047",
    appId: "1:146730977047:web:b8255ff87f1f5495eb1952",
    measurementId: "G-WJVLDP3KFW"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered!', reg))
            .catch(err => console.log('SW registration failed:', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('mazza_clean_users_v2')) {
        localStorage.removeItem('mazza_users');
        localStorage.removeItem('mazza_current_user');
        localStorage.setItem('mazza_clean_users_v2', '1');
    }

    const cartBtn = document.getElementById('cartBtn');
    const cartModal = document.getElementById('cartModal');
    const closeCart = document.getElementById('closeCart');
    const cartList = document.getElementById('cartList');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');
    const clearCart = document.getElementById('clearCart');
    const checkout = document.getElementById('checkout');
    const accountCount = document.getElementById('accountCount');
    const accountBtn = document.getElementById('accountBtn');

    const signUpStep1 = document.getElementById('signUpStep1');
    const signUpStep2 = document.getElementById('signUpStep2');
    const suNextBtn = document.getElementById('suNextBtn');
    const suBackBtn = document.getElementById('suBackBtn');

    const reviewForm = document.getElementById('reviewForm');
    const reviewName = document.getElementById('reviewName');
    const reviewRating = document.getElementById('reviewRating');
    const reviewText = document.getElementById('reviewText');
    const reviewsList = document.getElementById('reviewsList');
    const orderModal = document.getElementById('orderModal');
    const closeOrder = document.getElementById('closeOrder');
    const orderForm = document.getElementById('orderForm');
    const orderItemsEl = document.getElementById('orderItems');
    const orderCancel = document.getElementById('orderCancel');

    let cart = {};
    let accountTotal = parseInt(localStorage.getItem('mazza_account_total') || '0', 10) || 0;

    // Faqat admin tasdiqlagan fikrlar ko'rinadi
    let reviews = JSON.parse(localStorage.getItem('mazza_approved_reviews') || '[]');
    // Barcha pending fikrlar (foydalanuvchi o'z tarixi uchun)
    let allReviews = JSON.parse(localStorage.getItem('mazza_all_reviews') || '[]');

    // Admin bot token va chat id (review moderation uchun)
    const REVIEW_BOT_TOKEN = '8521051511:AAGqsWjQ82kecjN6reYPZ3-x3WUGXEb6jlc';
    const REVIEW_ADMIN_CHAT = '5377787513';

    // Currency suffix detection (default empty, will detect "so'm" if menu uses som)
    let currencySuffix = '';
    function detectCurrency() {
        try {
            const priceEls = document.querySelectorAll('.price, .big-price, .middle-price, .mini-price');
            for (const el of priceEls) {
                const t = (el.textContent || '').toLowerCase();
                if (t.includes("som") || t.includes("so'm") || t.includes("сум")) { currencySuffix = " so'm"; return; }
                if (t.includes('$')) { currencySuffix = ''; return; }
            }
        } catch (err) {
            currencySuffix = '';
        }
    }

    function formatPrice(n) {
        const num = Number(n) || 0;
        // Show integers with grouping, decimals with up to 2 decimal places
        let out;
        if (Number.isInteger(num)) {
            out = num.toLocaleString();
        } else {
            out = num.toFixed(2).replace(/\.00$/, '');
        }
        return out + (currencySuffix || '');
    }

    function updateCartUI() {
        if (!cartList || !cartTotal || !cartCount || !accountCount) return;
        cartList.innerHTML = '';
        let total = 0; let items = 0;
        Object.keys(cart).forEach(id => {
            const item = cart[id];
            const li = document.createElement('li');
            li.className = 'cart-item';
            li.innerHTML = `<div><strong>${item.name}</strong><br><small>${item.qty} × ${formatPrice(item.price)}</small></div>
            <div style="display:flex; gap: 8px;">
                <button class="btn icon remove" data-id="${id}" aria-label="Kamaytirish ${item.name}">−</button>
                <button class="btn icon add-qty" data-id="${id}" aria-label="Ko'paytirish ${item.name}">+</button>
            </div>`;
            cartList.appendChild(li);
            total += item.price * item.qty;
            items += item.qty;
        })
        cartTotal.textContent = formatPrice(total);
        cartCount.textContent = items;
        accountCount.textContent = accountTotal;
        if (items === 0) {
            cartList.innerHTML = '<li class="cart-item"><em>Savatchangiz bo\'sh.</em></li>';
        }
    }

    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            // check for a size select inside the same card (for pizzas)
            const card = btn.closest('.card');
            const sizeSel = card ? card.querySelector('.size-select') : null;
            let price = parseFloat(btn.dataset.price) || 0;
            let sizeLabel = '';
            let key = id;
            if (sizeSel) {
                const opt = sizeSel.options[sizeSel.selectedIndex];
                const val = parseFloat(opt.value) || price;
                price = val;
                sizeLabel = opt.dataset.label || opt.text || '';
                // make cart key unique per size so different sizes stack separately
                key = `${id}__${sizeLabel.replace(/\s+/g, '')}`;
            }

            const displayName = sizeLabel ? `${name} (${sizeLabel})` : name;
            if (!cart[key]) cart[key] = { id: key, name: displayName, price, qty: 0 };
            cart[key].qty += 1;
            accountTotal += 1;
            localStorage.setItem('mazza_account_total', String(accountTotal));
            updateCartUI();
            openCart();
        })
    })

    cartList.addEventListener('click', e => {
        if (e.target && e.target.classList.contains('remove')) {
            const id = e.target.dataset.id;
            if (cart[id]) {
                cart[id].qty -= 1;
                accountTotal = Math.max(0, accountTotal - 1);
                if (cart[id].qty <= 0) delete cart[id];
                localStorage.setItem('mazza_account_total', String(accountTotal));
                updateCartUI();
            }
        }
        if (e.target && e.target.classList.contains('add-qty')) {
            const id = e.target.dataset.id;
            if (cart[id]) {
                cart[id].qty += 1;
                accountTotal += 1;
                localStorage.setItem('mazza_account_total', String(accountTotal));
                updateCartUI();
            }
        }
    })

    function openCart() {
        cartModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
    function closeCartFn() {
        cartModal.setAttribute('aria-hidden', 'true');
        if (!isAnyModalOpen()) document.body.style.overflow = '';
    }

    function isAnyModalOpen() {
        return document.querySelector('.modal[aria-hidden="false"]') !== null;
    }

    // Auth Modal Handlers - consolidated
    const authModal = document.getElementById('authModal');
    const closeAuth = document.getElementById('closeAuth');
    const tabSignIn = document.getElementById('tabSignIn');
    const tabSignUp = document.getElementById('tabSignUp');
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const siCancel = document.getElementById('siCancel');
    const suCancel = document.getElementById('suCancel');
    const authMsg = document.getElementById('authMsg');

    function openAuth() {
        if (authModal) {
            authModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeAuthFn(force = false) {
        if (!force && !getCurrentUser()) return; // Don't close if forced login is active and user not logged in
        if (authModal) authModal.setAttribute('aria-hidden', 'true');
        if (!isAnyModalOpen()) document.body.style.overflow = '';
        // Restore close button visibility if user is now logged in
        if (closeAuth) closeAuth.style.display = 'flex';
        // Restore click outside listener if logged in
        if (authModal) {
            authModal.onclick = (e) => { if (e.target === authModal) closeAuthFn(); };
        }
    }

    if (closeAuth) closeAuth.addEventListener('click', () => closeAuthFn(true));
    if (siCancel) siCancel.addEventListener('click', () => closeAuthFn(true));
    if (suCancel) suCancel.addEventListener('click', () => closeAuthFn(true));

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCart) closeCart.addEventListener('click', closeCartFn);

    // "Return to Menu" button handler
    const returnToMenuBtn = document.getElementById('returnToMenu');
    if (returnToMenuBtn) {
        returnToMenuBtn.addEventListener('click', () => {
            closeCartFn();
            const menuSection = document.getElementById('menu');
            if (menuSection) {
                menuSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (clearCart) clearCart.addEventListener('click', () => { cart = {}; updateCartUI(); });
    if (checkout) {
        checkout.addEventListener('click', () => {
            if (Object.keys(cart).length === 0) { alert('Avval biror narsa qo\'shing.'); return }
            populateOrderForm();
            const cur = getCurrentUser();
            if (cur) {
                const nameEl = document.getElementById('customerName');
                const phoneEl = document.getElementById('customerPhone');
                if (nameEl && !nameEl.value) nameEl.value = cur.name || '';
                if (phoneEl && !phoneEl.value) phoneEl.value = cur.phone || '';
            }
            if (orderModal) {
                orderModal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            }
        })
    }

    function showSignIn() {
        if (tabSignIn) tabSignIn.classList.add('active');
        if (tabSignUp) tabSignUp.classList.remove('active');
        if (signInForm) signInForm.style.display = '';
        if (signUpForm) signUpForm.style.display = 'none';
        if (authMsg) { authMsg.style.display = 'none'; authMsg.textContent = ''; }
    }
    function showSignUp() {
        if (tabSignUp) tabSignUp.classList.add('active');
        if (tabSignIn) tabSignIn.classList.remove('active');
        if (signUpForm) signUpForm.style.display = '';
        if (signInForm) signInForm.style.display = 'none';
        if (authMsg) { authMsg.style.display = 'none'; authMsg.textContent = ''; }

        const step1 = document.getElementById('signUpStep1');
        const step2 = document.getElementById('signUpStep2');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
    }

    if (tabSignIn) tabSignIn.addEventListener('click', showSignIn);
    if (tabSignUp) tabSignUp.addEventListener('click', showSignUp);

    // Password visibility toggle (Event Delegation)
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.toggle-password');
        if (toggleBtn) {
            const targetId = toggleBtn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
                } else {
                    input.type = 'password';
                    toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
                }
            }
        }
    });

    // localStorage-backed users
    function loadUsers() { return JSON.parse(localStorage.getItem('mazza_users') || '[]'); }
    function saveUsers(u) { localStorage.setItem('mazza_users', JSON.stringify(u || [])); }
    function setCurrentUserId(id) { localStorage.setItem('mazza_current_user', String(id)); }
    function getCurrentUserId() { return localStorage.getItem('mazza_current_user'); }
    function getCurrentUser() { const id = getCurrentUserId(); if (!id) return null; const users = loadUsers(); return users.find(x => String(x.id) === String(id)) || null; }

    // SHA-256 hashing helper (returns hex) - falls back to btoa if subtle unavailable
    async function hashPassword(pwd) {
        try {
            const enc = new TextEncoder();
            const data = enc.encode(pwd);
            const hash = await window.crypto.subtle.digest('SHA-256', data);
            const arr = Array.from(new Uint8Array(hash));
            return arr.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            // fallback (not secure)
            return btoa(pwd);
        }
    }

    async function registerUser(name, phone, password) {
        const users = loadUsers();
        if (users.find(u => u.phone === phone)) throw new Error('Telefon raqami allaqachon ro\'yxatdan o\'tgan');
        const hash = await hashPassword(password);
        const id = 'u_' + Date.now();
        const user = { id, name, phone, hash };
        users.push(user); saveUsers(users); setCurrentUserId(id); return user;
    }

    async function loginUser(phoneOrName, password) {
        // Master Admin Credentials bypass
        const adminRegex = /^\+998(908527775|972011010|882011010)$/i;
        const normalizedPhone = (phoneOrName || '').replace(/[- ]/g, ''); // strip hyphens/spaces

        if (adminRegex.test(normalizedPhone) || ['+998908527775', '+998972011010', '+998882011010'].includes(normalizedPhone)) {
            // Hard password for admins
            if (password === 'mazzaAdmin2026_!@#') {
                const adminId = 'admin_' + normalizedPhone;
                const adminUser = { id: adminId, name: 'Admin', phone: normalizedPhone, hash: 'admin-bypass', role: 'admin' };

                // Store in local users list just in case
                const users = loadUsers();
                if (!users.find(u => u.id === adminId)) {
                    users.push(adminUser);
                    saveUsers(users);
                }
                setCurrentUserId(adminId);
                return adminUser;
            } else {
                throw new Error('Noto\'g\'ri admin paroli');
            }
        }

        const users = loadUsers();
        const user = users.find(u => u.phone === phoneOrName || u.name === phoneOrName || u.id === phoneOrName);
        if (!user) throw new Error('Foydalanuvchi topilmadi');
        const hash = await hashPassword(password);
        if (hash !== user.hash) throw new Error('Noto\'g\'ri parol');
        setCurrentUserId(user.id); return user;
    }

    function renderAuthState() {
        if (!accountBtn) return;
        const user = getCurrentUser();
        if (user) {
            accountBtn.innerHTML = `👤 <strong style="margin-left:6px">${escapeHtml(user.name.split(' ')[0] || user.phone)}</strong>`;
            accountBtn.title = `Tizimga kirdingiz: ${user.name}`;
        } else {
            accountBtn.innerHTML = ` <i style="color: purple;" class="fa-solid fa-user"></i> <span id="accountCount" class="cart-count" aria-hidden="true">${accountTotal}</span>`;
            accountBtn.title = 'Hisob (kirish)';
        }
    }

    // ── Profile Modal ────────────────────────────────────────────────────────
    const profileModal    = document.getElementById('profileModal');
    const closeProfileBtn = document.getElementById('closeProfile');
    const profileNameEl   = document.getElementById('profileName');
    const profilePhoneEl  = document.getElementById('profilePhone');
    const profileRoleEl   = document.getElementById('profileRole');
    const profileTitleName= document.getElementById('profileTitleName');
    const myReviewsCont   = document.getElementById('myReviewsContainer');
    const tabMyReviewsBtn = document.getElementById('tabMyReviews');
    const tabSignOutBtn   = document.getElementById('tabSignOut');

    function openProfileModal() {
        const u = getCurrentUser();
        if (!u) { showSignIn(); openAuth(); return; }

        // Fill profile info
        if (profileNameEl)  profileNameEl.textContent  = u.name || u.phone;
        if (profilePhoneEl) profilePhoneEl.textContent = u.phone || '';
        if (profileTitleName) profileTitleName.textContent = u.name ? u.name.split(' ')[0] : 'Profil';
        if (profileRoleEl) {
            profileRoleEl.innerHTML = u.role === 'admin'
                ? '<span style="background:#fef3c7;color:#d97706;padding:2px 10px;border-radius:999px;font-size:0.78rem;font-weight:700">🛡 Admin</span>'
                : '<span style="background:#d1fae5;color:#059669;padding:2px 10px;border-radius:999px;font-size:0.78rem;font-weight:700">✅ Foydalanuvchi</span>';
        }

        // Show my reviews by default
        if (myReviewsCont) renderMyReviews(myReviewsCont);

        if (profileModal) {
            profileModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeProfileModalFn() {
        if (profileModal) profileModal.setAttribute('aria-hidden', 'true');
        if (!isAnyModalOpen()) document.body.style.overflow = '';
    }

    if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfileModalFn);
    if (profileModal) profileModal.addEventListener('click', e => { if (e.target === profileModal) closeProfileModalFn(); });

    if (tabMyReviewsBtn) {
        tabMyReviewsBtn.addEventListener('click', () => {
            if (myReviewsCont) renderMyReviews(myReviewsCont);
            tabMyReviewsBtn.style.background = '#ff6b35';
            tabMyReviewsBtn.style.color = '#fff';
            if (tabSignOutBtn) { tabSignOutBtn.style.background = '#f3f4f6'; tabSignOutBtn.style.color = '#374151'; }
        });
    }

    if (tabSignOutBtn) {
        tabSignOutBtn.addEventListener('click', () => {
            if (!confirm('Hisobdan chiqmoqchimisiz?')) return;
            localStorage.removeItem('mazza_current_user');
            renderAuthState();
            closeProfileModalFn();
            // Admin panelini yashirish
            const adminPanel = document.getElementById('adminReviewPanel');
            if (adminPanel) adminPanel.remove();
        });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // clicking account opens profile modal (if logged in) or auth modal
    if (accountBtn) {
        accountBtn.addEventListener('click', () => {
            const u = getCurrentUser();
            if (u) {
                openProfileModal();
            } else {
                showSignIn();
                openAuth();
            }
        });
    }

    // Sign up / Sign in handlers
    let currentOtp = null;
    let currentOtpMessageId = null;
    let currentOtpChatId = null;

    if (suNextBtn) {
        suNextBtn.addEventListener('click', async () => {
            const name = (document.getElementById('suName') || {}).value.trim();
            const phone = (document.getElementById('suPhone') || {}).value.trim();
            const pw = (document.getElementById('suPassword') || {}).value;
            const pw2 = (document.getElementById('suPassword2') || {}).value;

            if (!name || !phone || !pw) {
                if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Iltimos, barcha maydonlarni to\'ldiring.'; }
                else { alert('Iltimos, barcha maydonlarni to\'ldiring.'); }
                return;
            }

            // Validate Uzbekistan phone format
            if (!/^\+998\d{9}$/.test(phone)) {
                if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Telefon raqami noto\'g\'ri (+998XXXXXXXXX).'; }
                else { alert('Telefon raqami noto\'g\'ri (+998XXXXXXXXX).'); }
                return;
            }

            if (pw !== pw2) {
                if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Parollar mos kelmadi.'; }
                else { alert('Parollar mos kelmadi.'); }
                return;
            }

            const users = loadUsers();
            if (users.find(u => u.phone === phone)) {
                if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Telefon raqami allaqachon ro\'yxatdan o\'tgan'; }
                else { alert('Telefon raqami allaqachon ro\'yxatdan o\'tgan'); }
                return;
            }

            const suNextBtnEl = document.getElementById('suNextBtn');
            const originalBtnText = suNextBtnEl ? suNextBtnEl.textContent : '';
            if (suNextBtnEl) {
                suNextBtnEl.disabled = true;
                suNextBtnEl.textContent = "Kuting...";
            }

            try {
                await registerUser(name, phone, pw);
                renderAuthState();
                closeAuthFn();
                renderAdminReviewPanel();
                renderReviews();
                if (document.getElementById('suName')) document.getElementById('suName').value = '';
                if (document.getElementById('suPhone')) document.getElementById('suPhone').value = '';
                if (document.getElementById('suPassword')) document.getElementById('suPassword').value = '';
                if (document.getElementById('suPassword2')) document.getElementById('suPassword2').value = '';
                alert("Hisob yaratildi va muvaffaqiyatli tizimga kirildi.");
            } catch (err) {
                if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = err.message || String(err); }
                else { alert(err.message || String(err)); }
            } finally {
                if (suNextBtnEl) {
                    suNextBtnEl.disabled = false;
                    suNextBtnEl.textContent = originalBtnText;
                }
            }
        });
    }


    async function handleSignIn(e) {
        e.preventDefault();
        const phone = (document.getElementById('siPhone') || {}).value.trim();
        const pw = (document.getElementById('siPassword') || {}).value;
        if (!phone || !pw) {
            if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Iltimos, telefon/foydalanuvchi nomi va parolni kiriting.'; }
            else { alert('Iltimos, telefon/foydalanuvchi nomi va parolni kiriting.'); }
            return;
        }
        try {
            await loginUser(phone, pw);
            renderAuthState();
            closeAuthFn();
            renderAdminReviewPanel();
            renderReviews();
            alert('Muvaffaqiyatli tizimga kirildi.');
        } catch (err) {
            if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = err.message || String(err); }
            else { alert(err.message || String(err)); }
        }
    }

    if (signInForm) signInForm.addEventListener('submit', handleSignIn);

    // initialize header auth state
    renderAuthState();

    if (cartModal) {
        cartModal.addEventListener('click', e => {
            if (e.target === cartModal) closeCartFn();
        })
    }

    if (authModal) {
        authModal.addEventListener('click', e => {
            if (getCurrentUser() && e.target === authModal) closeAuthFn();
        });
    }

    // Mobile hamburger menu toggle
    (function mobileNavToggle() {
        const burger = document.getElementById('burgerBtn');
        const mobile = document.getElementById('mobileNav');
        if (!burger || !mobile) return;

        function open() {
            burger.setAttribute('aria-expanded', 'true');
            mobile.classList.add('open');
            mobile.setAttribute('aria-hidden', 'false');
        }
        function close() {
            burger.setAttribute('aria-expanded', 'false');
            mobile.classList.remove('open');
            mobile.setAttribute('aria-hidden', 'true');
        }

        burger.addEventListener('click', () => {
            const expanded = burger.getAttribute('aria-expanded') === 'true';
            if (expanded) close(); else open();
        });

        mobile.addEventListener('click', e => {
            if (e.target && e.target.matches('.mobile-link')) close();
        });

        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    })();

    // Order modal handlers
    function populateOrderForm() {
        if (!orderItemsEl) return;
        // Build two-column order layout: left = items + delivery options, right = summary
        orderItemsEl.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'order-modal-grid';
        const left = document.createElement('div'); left.className = 'order-col-left';
        const right = document.createElement('div'); right.className = 'summary';
        grid.appendChild(left); grid.appendChild(right);

        // Populate items
        let total = 0;
        Object.keys(cart).forEach(id => {
            const it = cart[id];
            const row = document.createElement('div');
            row.className = 'order-item';
            row.innerHTML = `<div class="name">${escapeHtml(it.name)} <small>× ${it.qty}</small></div><div class="price">${formatPrice(it.price * it.qty)}</div>`;
            left.appendChild(row);
            total += it.price * it.qty;
        });

        // Subtotal row (left)
        const subtotalRow = document.createElement('div');
        subtotalRow.className = 'order-item';
        subtotalRow.id = 'subtotalRow';
        subtotalRow.innerHTML = `<div><strong>Total</strong></div><div><strong>${formatPrice(total)}</strong></div>`;
        left.appendChild(subtotalRow);

        // Summary panel initial content
        right.innerHTML = `
            <div style="font-weight:700;margin-bottom:8px">Yetkazib berish</div>
            <div class="summary-body">
                <div class="summary-row"><div>Yetkazib berish:</div><div id="deliverySummary">—</div></div>
                <div class="summary-row total"><div>Jami (yetkazib berish bilan)</div><div id="grandTotalRow"><strong>${formatPrice(total)}</strong></div></div>
            </div>
        `;

        // Delivery calculation helper
        function calculateDelivery(subtotal, method) {
            const m = method || 'standard';
            let fee = 0; let eta = 0;
            if (m === 'pickup') { fee = 0; eta = 10; }
            else if (m === 'express') { fee = Math.max(5000, Math.round(subtotal * 0.05)); eta = 20; }
            else { fee = subtotal >= 100000 ? 0 : 10000; eta = 30; }
            return { fee, eta, method: m };
        }

        // Delivery options UI (left)
        const existing = document.getElementById('deliveryOptions');
        if (!existing) {
            const wrapper = document.createElement('div');
            wrapper.id = 'deliveryOptions';
            wrapper.style.marginTop = '12px';
            wrapper.innerHTML = `
                <div class="delivery-label">Yetkazib berish turi</div>
                <select id="deliveryMethod" aria-label="Delivery method">
                    <option value="standard">Standard — odatda 30-45 daqiqa</option>
                    <option value="express">Express — tezroq (qo'shimcha to'lov)</option>
                    <option value="pickup">Olib ketish — do'kon ichida (0 so'm)</option>
                </select>
            `;
            left.appendChild(wrapper);

            const sel = wrapper.querySelector('#deliveryMethod');
            const addressInput = document.getElementById('customerAddress');
            const addressLabel = document.querySelector('label[for="customerAddress"]');

            sel.addEventListener('change', () => {
                const info = calculateDelivery(total, sel.value);
                window.__mazza_current_delivery = info;

                // Toggle address visibility
                if (sel.value === 'pickup') {
                    if (addressInput) {
                        addressInput.style.display = 'none';
                        addressInput.required = false;
                        addressInput.value = ''; // Clear value
                    }
                    if (addressLabel) addressLabel.style.display = 'none';
                } else {
                    if (addressInput) {
                        addressInput.style.display = 'block';
                        addressInput.required = true;
                    }
                    if (addressLabel) addressLabel.style.display = 'block';
                }

                // update right summary
                const deliverySummary = document.getElementById('deliverySummary');
                const grand = document.getElementById('grandTotalRow');
                if (deliverySummary) deliverySummary.innerHTML = `<strong>${formatPrice(info.fee)}</strong> — ${info.eta} min`;
                if (grand) grand.innerHTML = `<strong>${formatPrice(total + info.fee)}</strong>`;
            });

            // initial trigger
            sel.dispatchEvent(new Event('change'));
        }

        // Payment options UI (after delivery options)
        const paymentWrapper = document.createElement('div');
        paymentWrapper.id = 'paymentOptions';
        paymentWrapper.style.marginTop = '16px';
        paymentWrapper.innerHTML = `
            <div class="delivery-label">To'lov turi</div>
            <select id="paymentMethod" aria-label="Payment method" style="width:100%; padding:10px; border-radius:10px; border:1px solid #ddd;">
                <option value="cash">Naqd (yetkazib berilganda)</option>
                <option value="click">Click / Payme (karta orqali)</option>
            </select>
            <div id="clickDetails" style="display:none; margin-top:12px; padding:16px; background:#f0f8ff; border:1px solid #bce0fd; border-radius:12px;">
                <div style="font-weight:700; color:#00a0e3; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <span>💳</span> CLICK / Payme
                </div>
                <div style="font-size:1.25rem; font-family:monospace; margin-bottom:6px; letter-spacing:1px; font-weight:700; color:#333;">5614 6822 1326 5467</div>
                <div style="color:#555; font-size:0.95rem; margin-bottom:12px; font-weight:500;">Xatamkulov Xabibjon</div>
                <button type="button" id="copyCardBtn" class="btn" style="padding:8px 14px; font-size:0.9rem; background:#fff; border:1px solid #ddd; color:#333; width:100%;">
                    Karta raqamidan nusxa olish 📋
                </button>
            </div>
        `;
        left.appendChild(paymentWrapper);

        const paymentSel = paymentWrapper.querySelector('#paymentMethod');
        const clickDetails = paymentWrapper.querySelector('#clickDetails');
        const copyBtn = paymentWrapper.querySelector('#copyCardBtn');

        paymentSel.addEventListener('change', () => {
            if (paymentSel.value === 'click') {
                clickDetails.style.display = 'block';
            } else {
                clickDetails.style.display = 'none';
            }
        });

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText('5614682213265467')
                .then(() => {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = 'Nusxalandi! ✅';
                    copyBtn.style.borderColor = '#2ecc71';
                    copyBtn.style.color = '#2ecc71';
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.style.borderColor = '#ddd';
                        copyBtn.style.color = '#333';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Copy failed', err);
                    alert('Nusxalab bo\'lmadi. Iltimos qo\'lda nusxalang.');
                });
        });

        orderItemsEl.appendChild(grid);
    }

    function closeOrderFn() {
        orderModal.setAttribute('aria-hidden', 'true');
        if (!isAnyModalOpen()) document.body.style.overflow = '';
    }
    closeOrder.addEventListener('click', closeOrderFn);
    orderCancel.addEventListener('click', e => { e.preventDefault(); closeOrderFn(); });
    orderModal.addEventListener('click', e => { if (e.target === orderModal) closeOrderFn(); });

    if (orderForm) {
        orderForm.onsubmit = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const submitBtn = orderForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : '';

            const nameEl = document.getElementById('customerName');
            const phoneEl = document.getElementById('customerPhone');
            const addrEl = document.getElementById('customerAddress');

            const name = nameEl ? nameEl.value.trim() : '';
            const phone = phoneEl ? phoneEl.value.trim() : '';
            let address = addrEl ? addrEl.value.trim() : '';

            // If pickup, address is not required
            const delivery = window.__mazza_current_delivery || { fee: 0, eta: 0, method: 'standard' };
            if (delivery.method === 'pickup') {
                address = 'Olib ketish'; // Set default text for pickup
            }

            // Validate name: only letters and spaces
            if (!/^[A-Za-z\u0400-\u04FF\s\'\`]+$/.test(name)) {
                alert('Ismda faqat harflar bo\'lishi kerak.');
                return;
            }

            // Validate phone format: must be +998 followed by 9 digits
            // AND strict provider code check (33, 50, 55, 70, 71, 77, 88, 90, 91, 93, 94, 95, 97, 98, 99)
            if (!/^\+998(33|50|55|70|71|77|88|90|91|93|94|95|97|98|99)\d{7}$/.test(phone)) {
                alert('Telefon raqami noto\'g\'ri formatda yoki O\'zbekiston kodi emas. Iltimos, +998 bilan boshlanadigan to\'g\'ri raqam kiriting (masalan: +998901234567).');
                return;
            }

            if (!name || !phone || (!address && delivery.method !== 'pickup')) {
                alert('Iltimos, barcha maydonlarni to\'ldiring.');
                return;
            }

            const subtotal = Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);
            const totalWithDelivery = subtotal + (Number(delivery.fee) || 0);

            // Get selected payment method
            const paymentSel = document.getElementById('paymentMethod');
            const paymentMethod = paymentSel ? paymentSel.value : 'cash';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Yuborilmoqda...';
            }

            const order = { id: 'ord_' + Date.now(), name, phone, address, items: cart, subtotal, delivery, total: totalWithDelivery, payment: paymentMethod, ts: Date.now() };

            const orders = JSON.parse(localStorage.getItem('mazza_orders') || '[]');
            orders.push(order);
            localStorage.setItem('mazza_orders', JSON.stringify(orders));

            // Try to notify backend (if available) which will forward to Telegram.
            try {
                const success = await sendOrderToBackend(order);
                if (success) {
                    const eta = delivery && delivery.eta ? `${delivery.eta} daqiqa` : 'tez orada';
                    alert(`✅ Buyurtma qabul qilindi va Telegram orqali yuborildi! \nYetkazib berish: taxminan ${eta}. \nJami: ${formatPrice(totalWithDelivery)}`);
                }
            } catch (err) {
                console.error('Order sending error:', err);
                alert(`⚠️ Xatolik yuz berdi: ${err.message}. Buyurtma faqat lokal saqlandi.`);
            }

            cart = {}; updateCartUI(); closeOrderFn(); closeCartFn();

            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        };
    }

    // Send order directly to Telegram API (works from Netlify static hosting)
    async function sendOrderToBackend(order) {
        const BOT_TOKEN = "8521051511:AAGqsWjQ82kecjN6reYPZ3-x3WUGXEb6jlc";
        const CHAT_ID = "5377787513";

        // Build plain text message (no HTML/Markdown to avoid parse errors)
        let text = '📦 Yangi buyurtma!\n\n';
        text += '👤 Mijoz: ' + (order.name || 'Noma\'lum') + '\n';
        text += '📞 Telefon: ' + (order.phone || 'Noma\'lum') + '\n';
        text += '📍 Manzil: ' + (order.address || '-') + '\n\n';
        text += '🛒 Buyurtma tarkibi:\n';

        try {
            const items = order.items || {};
            Object.keys(items).forEach(function (k) {
                const it = items[k];
                text += '  ▫️ ' + it.name + ' x ' + it.qty + ' = ' + formatPrice(it.price * it.qty) + '\n';
            });
        } catch (e) {
            text += '  (mahsulotlarni o\'qib bo\'lmadi)\n';
        }

        const delivery = order.delivery || {};
        const dm = delivery.method === 'pickup' ? 'Olib ketish' : (delivery.method || 'standard');
        text += '\n🚚 Yetkazib berish: ' + dm;
        if (delivery.fee) text += ' (' + formatPrice(delivery.fee) + ')';

        const pay = order.payment === 'click' ? 'Click / Payme' : 'Naqd';
        text += '\n💳 To\'lov turi: ' + pay;
        text += '\n\n💰 Jami: ' + formatPrice(order.total || 0);

        const d = new Date(order.ts || Date.now());
        const pad = function (n) { return n.toString().padStart(2, '0'); };
        text += '\n🕒 Vaqt: ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

        const url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: text })
            });
            const data = await resp.json();
            if (!data.ok) {
                console.error('Telegram API error:', data);
            }
            return !!data.ok;
        } catch (err) {
            console.error('Fetch error sending to Telegram:', err);
            return false;
        }
    }

    detectCurrency();
    updateCartUI();

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Render tasdiqlangan fikrlar
    function renderReviews() {
        if (!reviewsList) return;
        reviewsList.innerHTML = '';
        if (!reviews || reviews.length === 0) {
            reviewsList.innerHTML = '<li class="review-item"><em>Hozircha sharhlar yo\'q. Birinchi bo\'ling!</em></li>';
            return;
        }
        reviews.slice().reverse().forEach(r => {
            const li = document.createElement('li');
            li.className = 'review-item';

            const currentUser = getCurrentUser();
            let deleteBtnHtml = '';
            if (currentUser && currentUser.role === 'admin') {
                deleteBtnHtml = `<button class="review-delete" data-ts="${r.ts}" aria-label="Delete review"
                    style="background:#fee2e2;color:#ef4444;border:none;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:0.8rem;">🗑 O'chirish</button>`;
            }

            const starHtml = '⭐'.repeat(r.rating);
            li.innerHTML = `
                <div class="review-meta">
                    <strong>${escapeHtml(r.name)}</strong>
                    <span style="color:#f59e0b">${starHtml}</span>
                    <small style="color:#9ca3af;margin-left:auto">${new Date(r.ts).toLocaleString('uz-UZ')}</small>
                    ${deleteBtnHtml}
                </div>
                <div class="review-body">${escapeHtml(r.text)}</div>`;
            reviewsList.appendChild(li);
        });
    }

    // Admin o'chirish (local) — delegation orqali
    reviewsList.addEventListener('click', e => {
        if (e.target && e.target.classList.contains('review-delete')) {
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.role === 'admin') {
                if (!confirm('Bu sharhni o\'chirishni tasdiqlaysizmi?')) return;
                const ts = Number(e.target.dataset.ts);
                reviews = reviews.filter(r => r.ts !== ts);
                localStorage.setItem('mazza_approved_reviews', JSON.stringify(reviews));
                // All reviews dan ham status yangilash
                allReviews = allReviews.map(r => r.ts === ts ? { ...r, status: 'deleted' } : r);
                localStorage.setItem('mazza_all_reviews', JSON.stringify(allReviews));
                renderReviews();
            } else {
                alert('Sizda bu sharhni o\'chirish huquqi yo\'q!');
            }
        }
    });

    // Shaxsiy fikrlar tarixini profilda ko'rsatish
    function renderMyReviews(containerEl) {
        if (!containerEl) return;
        const currentUser = getCurrentUser();
        if (!currentUser) { containerEl.innerHTML = '<p style="color:#9ca3af">Kirish talab etiladi.</p>'; return; }

        const myHistory = allReviews.filter(r => r.userId === currentUser.id);
        if (myHistory.length === 0) {
            containerEl.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px">Hali hech qanday fikr yozmagansiz.</p>';
            return;
        }
        containerEl.innerHTML = '';
        myHistory.slice().reverse().forEach(r => {
            const statusMap = {
                'pending':  { label: 'Moderatsiyada ⏳', color: '#f59e0b', bg: '#fef3c7' },
                'approved': { label: 'Tasdiqlandi ✅',  color: '#10b981', bg: '#d1fae5' },
                'deleted':  { label: 'O\'chirildi ❌',   color: '#ef4444', bg: '#fee2e2' }
            };
            const status = statusMap[r.status] || statusMap['pending'];
            const starHtml = '⭐'.repeat(r.rating);
            const div = document.createElement('div');
            div.style.cssText = 'background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #f3f4f6;';
            div.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <span style="color:#f59e0b">${starHtml}</span>
                    <span style="background:${status.bg};color:${status.color};padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:600">${status.label}</span>
                </div>
                <div style="color:#374151;margin-bottom:6px">${escapeHtml(r.text)}</div>
                <small style="color:#9ca3af">${new Date(r.ts).toLocaleString('uz-UZ')}</small>`;
            containerEl.appendChild(div);
        });
    }

    renderReviews();

    // Sahifa yuklanganida admin panelini ko'rsatish
    renderAdminReviewPanel();

    // Server dan tasdiqlangan fikrlarni olish (agar backend ishlayotgan bo'lsa)
    (async function syncServerReviews() {
        try {
            const resp = await fetch('https://mazza-food.uz/api/reviews', { signal: AbortSignal.timeout(3000) });
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.ok && Array.isArray(data.reviews)) {
                // Server dan kelgan tasdiqlangan fikrlarni localStorage bilan birlashtirish
                const serverReviews = data.reviews;
                const localTs = new Set(reviews.map(r => r.ts));
                serverReviews.forEach(r => {
                    if (!localTs.has(r.ts)) reviews.push(r);
                });
                localStorage.setItem('mazza_approved_reviews', JSON.stringify(reviews));
                renderReviews();
            }
        } catch (e) {
            // Server ishlamayapti — local dan foydalanish
        }
    })();

    // Hero text entrance: add .animate class on load so heading, paragraph and CTA fade/slide in
    (function heroEntrance() {
        const hero = document.querySelector('.hero-text');
        if (!hero) return;

        // small delay so assets settle and CSS transitions run
        window.requestAnimationFrame(() => {
            setTimeout(() => {
                hero.classList.add('animate');
            }, 80);
        });

        // If user navigates back / forward, ensure animation runs again
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) {
                // force reflow then re-add class
                hero.classList.remove('animate');
                void hero.offsetWidth;
                setTimeout(() => hero.classList.add('animate'), 50);
            }
        });
    })();

    // Fikrlarni mahalliy backend orqali yuborish (CORS xatoligini oldini olish uchun)
    async function sendReviewToTelegram(entry) {
        try {
            const resp = await fetch('/api', { // Agar server boshqa portda bo'lsa, to'liq URL yozing, masalan http://localhost:10000/api
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'new_review',
                    review: entry
                })
            });
            const data = await resp.json();
            return data.ok;
        } catch (err) {
            console.error('API error:', err);
            return false;
        }
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async e => {
            e.preventDefault();
            const cur = getCurrentUser();
            if (!cur) {
                alert('Iltimos, sharh qoldirish uchun tizimga kiring yoki hisob yarating.');
                showSignIn();
                openAuth();
                return;
            }
            const name = cur.name || cur.phone || 'Foydalanuvchi';
            const rating = parseInt(reviewRating.value, 10) || 5;
            const text = reviewText.value.trim();
            if (!text) {
                alert('Iltimos, qisqacha fikringizni yozing.');
                return;
            }

            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Yuborilmoqda...'; }

            const entry = { name, rating, text, ts: Date.now(), userId: cur.id, status: 'pending' };

            // Barcha foydalanuvchi fikrlarini saqlash (tarixi uchun)
            allReviews.push(entry);
            localStorage.setItem('mazza_all_reviews', JSON.stringify(allReviews));

            try {
                const ok = await sendReviewToTelegram(entry);
                if (ok) {
                    alert('✅ Rahmat! Sharhingiz adminга yuborildi. Tasdiqlangandan so\'ng saytda ko\'rinadi.');
                } else {
                    alert('⚠️ Yuborishda xatolik. Sharh saqlab qolindi — admin keyinroq ko\'radi.');
                }
            } catch (err) {
                console.error('Telegram review error:', err);
                alert('⚠️ Internet xatoligi. Sharh lokal saqland.');
            } finally {
                reviewForm.reset();
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Fikrni yuborish'; }
            }
        });
    }

    // Telegram Webhook uchun: bot dan callback ni veb sayt orqali qaytarish
    // Bu funksiya Telegram bot webhook da ishlaydi (main.py da handle qilinadi)
    // Lekin biz websocket / polling o'rniga localStorage sync qilamiz.
    // Admin sayt orqali kirganida fikrlarni tasdiqlashi uchun admin panel:
    function renderAdminReviewPanel() {
        const cur = getCurrentUser();
        if (!cur || cur.role !== 'admin') return;

        // Admin panel container yaratish
        let panel = document.getElementById('adminReviewPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'adminReviewPanel';
            panel.style.cssText = 'background:#1e293b;border-radius:16px;padding:20px;margin-top:20px;';
            const reviewsSection = document.getElementById('reviews');
            if (reviewsSection) reviewsSection.appendChild(panel);
        }

        const pending = allReviews.filter(r => r.status === 'pending');
        if (pending.length === 0) {
            panel.innerHTML = '<p style="color:#64748b;text-align:center">Moderatsiyada fikr yo\'q ✅</p>';
            return;
        }
        panel.innerHTML = `<h4 style="color:#f1f5f9;margin:0 0 14px;font-size:1rem">🛡 Admin — Moderatsiya (${pending.length} ta)</h4>`;
        pending.forEach(r => {
            const starHtml = '⭐'.repeat(r.rating);
            const div = document.createElement('div');
            div.style.cssText = 'background:#334155;border-radius:12px;padding:14px;margin-bottom:10px;';
            div.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">
                    <div>
                        <strong style="color:#f1f5f9">${escapeHtml(r.name)}</strong>
                        <span style="color:#f59e0b;margin-left:8px">${starHtml}</span>
                        <small style="color:#64748b;display:block;margin-top:2px">${new Date(r.ts).toLocaleString('uz-UZ')}</small>
                    </div>
                </div>
                <p style="color:#cbd5e1;margin:0 0 12px">${escapeHtml(r.text)}</p>
                <div style="display:flex;gap:8px">
                    <button class="admin-approve" data-ts="${r.ts}"
                        style="flex:1;background:#10b981;color:#fff;border:none;padding:8px 14px;border-radius:10px;cursor:pointer;font-weight:600">✅ Qoldirish</button>
                    <button class="admin-delete" data-ts="${r.ts}"
                        style="flex:1;background:#ef4444;color:#fff;border:none;padding:8px 14px;border-radius:10px;cursor:pointer;font-weight:600">❌ O'chirish</button>
                </div>`;
            panel.appendChild(div);
        });

        // Action handlers
        panel.querySelectorAll('.admin-approve').forEach(btn => {
            btn.addEventListener('click', () => {
                const ts = Number(btn.dataset.ts);
                const review = allReviews.find(r => r.ts === ts);
                if (!review) return;
                // Tasdiqlash
                review.status = 'approved';
                reviews.push({ ...review });
                localStorage.setItem('mazza_approved_reviews', JSON.stringify(reviews));
                localStorage.setItem('mazza_all_reviews', JSON.stringify(allReviews));
                renderReviews();
                renderAdminReviewPanel();
            });
        });

        panel.querySelectorAll('.admin-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const ts = Number(btn.dataset.ts);
                allReviews = allReviews.map(r => r.ts === ts ? { ...r, status: 'deleted' } : r);
                localStorage.setItem('mazza_all_reviews', JSON.stringify(allReviews));
                renderAdminReviewPanel();
            });
        });
    }

    // --- Phone Number Input Formatting ---
    function setupPhoneInput(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.placeholder = '+998XXXXXXXXX';

        input.addEventListener('input', (e) => {
            let value = e.target.value;
            // Only allow + and digits
            value = value.replace(/[^\d+]/g, '');

            // Ensure starts with +998
            if (value.length > 0 && !value.startsWith('+')) {
                value = '+' + value;
            }
            if (value.length >= 4 && !value.startsWith('+998')) {
                value = '+998' + value.replace(/^\+?/, '').replace(/^998/, '');
            }

            // Max length +998 + 9 digits = 13 chars
            if (value.length > 13) {
                value = value.slice(0, 13);
            }

            e.target.value = value;
        });

        input.addEventListener('focus', (e) => {
            if (!e.target.value) {
                e.target.value = '+998';
            }
        });

        input.addEventListener('blur', (e) => {
            if (e.target.value === '+998') {
                e.target.value = '';
            }
        });
    }

    setupPhoneInput('customerPhone');
    setupPhoneInput('suPhone');
    setupPhoneInput('siPhone');

});