document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('mazza_clean_users_v1')) {
        localStorage.removeItem('mazza_users');
        localStorage.removeItem('mazza_current_user');
        localStorage.setItem('mazza_clean_users_v1', '1');
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

    let reviews = JSON.parse(localStorage.getItem('mazza_reviews') || '[]');

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
    }
    function closeCartFn() {
        cartModal.setAttribute('aria-hidden', 'true');
    }

    // Auth Modal Handlers
    function openAuth() {
        if (authModal) authModal.setAttribute('aria-hidden', 'false');
    }
    function closeAuthFn(force = false) {
        if (!force && !getCurrentUser()) return; // Don't close if forced login is active and user not logged in
        if (authModal) authModal.setAttribute('aria-hidden', 'true');
        // Restore close button visibility if user is now logged in
        if (closeAuth) closeAuth.style.display = 'flex';
        // Restore click outside listener if logged in
        if (authModal) {
            authModal.onclick = (e) => { if (e.target === authModal) closeAuthFn(); };
        }
    }

    cartBtn.addEventListener('click', openCart);
    closeCart.addEventListener('click', closeCartFn);

    // "Return to Menu" button handler
    const returnToMenuBtn = document.getElementById('returnToMenu');
    if (returnToMenuBtn) {
        returnToMenuBtn.addEventListener('click', () => {
            closeCartFn();
            // Scroll to menu section
            const menuSection = document.getElementById('menu');
            if (menuSection) {
                menuSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    clearCart.addEventListener('click', () => { cart = {}; updateCartUI(); });
    checkout.addEventListener('click', () => {
        if (Object.keys(cart).length === 0) { alert('Avval biror narsa qo\'shing.'); return }
        // Populate order modal with cart snapshot
        populateOrderForm();
        // Prefill from signed-in user if available
        const cur = getCurrentUser();
        if (cur) {
            const nameEl = document.getElementById('customerName');
            const phoneEl = document.getElementById('customerPhone');
            if (nameEl && !nameEl.value) nameEl.value = cur.name || '';
            if (phoneEl && !phoneEl.value) phoneEl.value = cur.phone || '';
        }
        orderModal.setAttribute('aria-hidden', 'false');
    })

    // --- Authentication (Sign in / Sign up) UI wiring ---
    const authModal = document.getElementById('authModal');
    const closeAuth = document.getElementById('closeAuth');
    const tabSignIn = document.getElementById('tabSignIn');
    const tabSignUp = document.getElementById('tabSignUp');
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const siCancel = document.getElementById('siCancel');
    const suCancel = document.getElementById('suCancel');
    const authMsg = document.getElementById('authMsg');

    function openAuth() { if (authModal) authModal.setAttribute('aria-hidden', 'false'); }
    function closeAuthFn() { if (authModal) authModal.setAttribute('aria-hidden', 'true'); }

    if (closeAuth) closeAuth.addEventListener('click', closeAuthFn);
    if (siCancel) siCancel.addEventListener('click', closeAuthFn);
    if (suCancel) suCancel.addEventListener('click', closeAuthFn);

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
        if (e.target.classList && e.target.classList.contains('toggle-password')) {
            const targetId = e.target.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    e.target.textContent = '❌';
                } else {
                    input.type = 'password';
                    e.target.textContent = '👁️';
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
        const user = getCurrentUser();
        if (user) {
            accountBtn.innerHTML = `👤 <strong style="margin-left:6px">${escapeHtml(user.name.split(' ')[0] || user.phone)}</strong>`;
            accountBtn.title = `Tizimga kirdingiz: ${user.name}`;
        } else {
            accountBtn.innerHTML = `👤 <span id="accountCount" class="cart-count" aria-hidden="true">${accountTotal}</span>`;
            accountBtn.title = 'Hisob (kirish)';
        }
    }

    // clicking account opens auth modal (or account view)
    if (accountBtn) {
        accountBtn.addEventListener('click', () => {
            const u = getCurrentUser();
            if (u) {
                // open auth modal showing sign in tab but with logout option
                showSignIn(); openAuth();
                if (authMsg) { authMsg.style.display = 'block'; authMsg.style.color = '#2ecc71'; authMsg.textContent = `Tizimga kirdingiz: ${u.name} — chiqish uchun pastdagi tugmani bosing.`; }
                // create sign out button if not exists
                if (!document.getElementById('signOutBtn')) {
                    const btn = document.createElement('button'); btn.id = 'signOutBtn'; btn.className = 'btn'; btn.textContent = 'Chiqish'; btn.style.marginTop = '12px';
                    btn.addEventListener('click', () => { localStorage.removeItem('mazza_current_user'); renderAuthState(); closeAuthFn(); });
                    document.querySelector('#authModal .modal-body').appendChild(btn);
                }
            } else { showSignIn(); openAuth(); }
        });
    }

    // Sign up / Sign in handlers
    let currentOtp = null;
    const suNextBtn = document.getElementById('suNextBtn');
    const suBackBtn = document.getElementById('suBackBtn');
    const signUpStep1 = document.getElementById('signUpStep1');
    const signUpStep2 = document.getElementById('signUpStep2');

    if (suNextBtn) {
        suNextBtn.addEventListener('click', async () => {
            const name = (document.getElementById('suName') || {}).value.trim();
            const phone = (document.getElementById('suPhone') || {}).value.trim();
            const pw = (document.getElementById('suPassword') || {}).value;
            const pw2 = (document.getElementById('suPassword2') || {}).value;

            if (!name || !phone || !pw) { if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Iltimos, barcha maydonlarni to\'ldiring.'; } return; }
            if (pw !== pw2) { if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Parollar mos kelmadi.'; } return; }

            const users = loadUsers();
            if (users.find(u => u.phone === phone)) {
                if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Telefon raqami allaqachon ro\'yxatdan o\'tgan'; }
                return;
            }

            currentOtp = Math.floor(1000 + Math.random() * 9000).toString();

            try {
                // Admin info goes to the admin bot
                const ADMIN_BOT_TOKEN = "8521051511:AAGqsWjQ82kecjN6reYPZ3-x3WUGXEb6jlc";
                const ADMIN_CHAT_ID = "8283401187";
                const adminText = `🔐 Ro'yxatdan o'tish so'rovi!\n\n👤 Mijoz: ${name}\n📞 Telefon: ${phone}\n🔑 Kod: ${currentOtp}`;
                fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: adminText })
                }).catch(() => { });

                // Verification code is sent to the phone number directly
                const userText = `Sizning tasdiqlash kodingiz: ${currentOtp}`;
                fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: phone, text: userText })
                }).catch(() => { });
            } catch (e) { }

            if (authMsg) authMsg.style.display = 'none';
            if (signUpStep1) signUpStep1.style.display = 'none';
            if (signUpStep2) signUpStep2.style.display = 'block';
        });
    }

    if (suBackBtn) {
        suBackBtn.addEventListener('click', () => {
            if (signUpStep2) signUpStep2.style.display = 'none';
            if (signUpStep1) signUpStep1.style.display = 'block';
        });
    }

    async function handleSignUp(e) {
        e.preventDefault();
        const enteredOtp = (document.getElementById('suOtp') || {}).value.trim();

        if (enteredOtp !== currentOtp) {
            alert('Tasdiqlash kodi noto\'g\'ri!');
            return;
        }

        const name = (document.getElementById('suName') || {}).value.trim();
        const phone = (document.getElementById('suPhone') || {}).value.trim();
        const pw = (document.getElementById('suPassword') || {}).value;

        try {
            await registerUser(name, phone, pw);
            renderAuthState();
            closeAuthFn();
            if (signUpStep2) signUpStep2.style.display = 'none';
            if (signUpStep1) signUpStep1.style.display = 'block';
            if (document.getElementById('suOtp')) document.getElementById('suOtp').value = '';
            alert('Hisob yaratildi va muvaffaqiyatli tizimga kirildi.');
        } catch (err) { if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = err.message || String(err); } }
    }

    async function handleSignIn(e) {
        e.preventDefault();
        const phone = (document.getElementById('siPhone') || {}).value.trim();
        const pw = (document.getElementById('siPassword') || {}).value;
        if (!phone || !pw) { if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Iltimos, telefon/foydalanuvchi nomi va parolni kiriting.'; } return; }
        try {
            await loginUser(phone, pw);
            renderAuthState();
            closeAuthFn();
            alert('Muvaffaqiyatli tizimga kirildi.');
        } catch (err) { if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = err.message || String(err); } }
    }

    if (signUpForm) signUpForm.addEventListener('submit', handleSignUp);
    if (signInForm) signInForm.addEventListener('submit', handleSignIn);

    // initialize header auth state
    renderAuthState();

    // Check if user is logged in, if not, force auth modal via welcome modal
    const currentUser = getCurrentUser();
    if (!currentUser) {
        const welcomeModal = document.getElementById('welcomeModal');
        const goRegisterBtn = document.getElementById('goRegisterBtn');

        if (welcomeModal && goRegisterBtn) {
            welcomeModal.setAttribute('aria-hidden', 'false');

            goRegisterBtn.addEventListener('click', () => {
                welcomeModal.setAttribute('aria-hidden', 'true');
                showSignUp(); // Open on Sign Up tab
                openAuth();

                if (closeAuth) closeAuth.style.display = 'none';
                if (authModal) {
                    authModal.removeEventListener('click', e => { if (e.target === authModal) closeAuthFn(); });
                    authModal.onclick = null;
                }
            });
        } else {
            // fallback if welcome modal is missing
            showSignUp();
            openAuth();
            if (closeAuth) closeAuth.style.display = 'none';
            if (authModal) {
                authModal.removeEventListener('click', e => { if (e.target === authModal) closeAuthFn(); });
                authModal.onclick = null;
            }
        }
    }

    cartModal.addEventListener('click', e => {
        if (e.target === cartModal) closeCartFn();
    })

    if (authModal) {
        authModal.addEventListener('click', e => {
            // Only allow closing if user is logged in
            if (getCurrentUser() && e.target === authModal) closeAuthFn();
        });
    }

    // Google Identity Services (OAuth) Implementation
    const GOOGLE_CLIENT_ID = "146730977047-khiaa5abr6bohvt77i7r74njurrsvbo8.apps.googleusercontent.com";

    function handleGoogleCredentialResponse(response) {
        try {
            // Decode the JWT token returning from Google
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);

            // Mahalliy auth formatiga moslash
            const googleUser = {
                id: payload.sub,
                name: payload.name || 'Mijoz (Google)',
                phone: payload.email || 'google-user',
                hash: 'google-oauth'
            };

            // Foydalanuvchini saqlash
            const users = loadUsers();
            if (!users.find(u => u.id === googleUser.id)) {
                users.push(googleUser);
                saveUsers(users);
            }
            setCurrentUserId(googleUser.id);

            renderAuthState();
            closeAuthFn(true); // Asosiy oynani majburiy yopish
            alert('Google orqali muvaffaqiyatli kirildi! ✅');
        } catch (error) {
            console.error('Google auth xatoligi:', error);
            alert('Tizimga kirishda xatolik yuz berdi: ' + error.message);
        }
    }

    // Initialize Google OAuth buttons when the library is loaded
    function initGoogleAuth() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            // Agar Client ID kiritilmagan bo'lsa ogohlantirish (kod ishlashi uchun)
            if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" || !GOOGLE_CLIENT_ID) {
                console.warn("Google Client ID kiritilmagan. js/app.js faylida GOOGLE_CLIENT_ID ni o'zgartiring.");
            }

            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredentialResponse
            });
            const containers = document.querySelectorAll('.google-btn-container');
            containers.forEach(container => {
                google.accounts.id.renderButton(
                    container,
                    { theme: "outline", size: "large", type: "standard", text: "continue_with", width: "100%" }
                );
            });
        } else {
            // Retrying init if the Google script hasn't fully loaded yet
            setTimeout(initGoogleAuth, 500);
        }
    }

    // Call init
    setTimeout(initGoogleAuth, 500);

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

        // close when a mobile link is clicked
        mobile.addEventListener('click', e => {
            if (e.target && e.target.matches('.mobile-link')) close();
        });

        // close on pressing Escape
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    })();

    // Order modal handlers
    function populateOrderForm() {
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

    function closeOrderFn() { orderModal.setAttribute('aria-hidden', 'true'); }
    closeOrder.addEventListener('click', closeOrderFn);
    orderCancel.addEventListener('click', e => { e.preventDefault(); closeOrderFn(); });
    orderModal.addEventListener('click', e => { if (e.target === orderModal) closeOrderFn(); });

    // Submit order form (demo: store order in localStorage and show confirmation)
    orderForm.addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn = orderForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;

        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        let address = document.getElementById('customerAddress').value.trim();

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

        function getLoc() {
            return new Promise((resolve) => {
                if (!navigator.geolocation) { resolve('Qurilma qo\'llab-quvvatlamaydi'); return; }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve(`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`),
                    (err) => resolve('Joylashuv aniqlanmadi (ruxsat berilmagan)')
                );
            });
        }

        const subtotal = Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);
        // delivery is already defined above
        const totalWithDelivery = subtotal + (Number(delivery.fee) || 0);

        // Get selected payment method
        const paymentSel = document.getElementById('paymentMethod');
        const paymentMethod = paymentSel ? paymentSel.value : 'cash';

        // Disable button and show loading state for geolocation
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Joylashuv olinmoqda...';
        }

        const orderLocation = await getLoc();

        if (submitBtn) {
            submitBtn.textContent = 'Yuborilmoqda...';
        }

        const order = { id: 'ord_' + Date.now(), name, phone, address, items: cart, subtotal, delivery, total: totalWithDelivery, payment: paymentMethod, ts: Date.now(), location: orderLocation };

        const orders = JSON.parse(localStorage.getItem('mazza_orders') || '[]');
        orders.push(order);
        localStorage.setItem('mazza_orders', JSON.stringify(orders));

        // Try to notify backend (if available) which will forward to Telegram.
        // This call is best-effort and will fail silently if no backend is running.
        if (window.fetch) {
            try {
                await sendOrderToBackend(order);
            } catch (err) {
                console.error('Failed to send order to Telegram:', err);
            }
        }

        // Demo confirmation and clear cart — include delivery ETA and total
        try {
            const eta = delivery && delivery.eta ? `${delivery.eta} daqiqa` : 'tez orada';
            alert(`Buyurtma qabul qilindi! Yetkazib berish (${delivery.method}) taxminan ${eta}. Jami: ${formatPrice(totalWithDelivery)}`);
        } catch (err) {
            alert('Buyurtma qabul qilindi! Tez orada siz bilan bog\'lanamiz.');
        }

        cart = {}; updateCartUI(); closeOrderFn(); closeCartFn();

        // Restore button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    })

    // Attempt to post order to the server endpoint which forwards to Telegram.
    function sendOrderToBackend(order) {
        // Direct Telegram integration (client-side) for Netlify/static hosting support
        const BOT_TOKEN = "8574329398:AAFmw3CaF7Ce2PeHvTwEBmRTmpRduoXMGug";
        const CHAT_IDS = ["8283401187"]; // Add more IDs here if needed

        // Build message text
        let text = `📦 Yangi buyurtma!\n\n`;
        text += `🆔 ID: ${order.id || 'n/a'}\n`;
        text += `👤 Mijoz: ${order.name}\n`;
        text += `📞 Telefon: ${order.phone}\n`;
        text += `📍 Manzil: ${order.address || '-'}\n\n`;
        text += `🛒 Buyurtma tarkibi:\n`;

        try {
            const items = order.items || {};
            Object.keys(items).forEach(k => {
                const it = items[k];
                text += `▫️ ${it.name} × ${it.qty} = ${formatPrice(it.price * it.qty)}\n`;
            });
        } catch (e) {
            text += '(mahsulotlarni o\'qib bo\'lmadi)\n';
        }

        const delivery = order.delivery || {};
        const deliveryMethod = delivery.method === 'pickup' ? 'Olib ketish' : (delivery.method || 'standard');
        text += `\n🚚 Yetkazib berish: ${deliveryMethod}`;
        if (delivery.fee) text += ` (${formatPrice(delivery.fee)})`;

        // Payment info
        const payment = order.payment === 'click' ? '💳 Click / Payme' : '💵 Naqd';
        text += `\n💳 To'lov turi: ${payment}`;

        if (order.location) {
            text += `\n🌍 Joylashuv (GPS): ${order.location}`;
        }

        text += `\n\n💰 Jami: ${formatPrice(order.total || 0)}`;

        const d = new Date(order.ts || Date.now());
        const pad = n => n.toString().padStart(2, '0');
        const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
        const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        text += `\n🕒 Vaqt: ${dateStr}, ${timeStr}`;

        // Send to all CHAT_IDS
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

        return Promise.all(CHAT_IDS.map(chatId => {
            return fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text
                })
            }).then(res => res.json())
                .then(data => {
                    if (!data.ok) console.error('Telegram error:', data);
                    return data;
                })
                .catch(err => {
                    console.error('Fetch error:', err);
                    throw err;
                });
        })).then(() => {
            console.log('Order sent to Telegram');
        });
    }

    detectCurrency();
    updateCartUI();
    document.getElementById('year').textContent = new Date().getFullYear();
    // Render existing reviews
    function renderReviews() {
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
                deleteBtnHtml = `<button class="review-delete" data-ts="${r.ts}" aria-label="Delete review">O'chirish</button>`;
            }

            li.innerHTML = `<div class="review-meta"><strong>${escapeHtml(r.name)}</strong> — ${r.rating} ⭐ • <small>${new Date(r.ts).toLocaleString()}</small> ${deleteBtnHtml}</div><div class="review-body">${escapeHtml(r.text)}</div>`;
            reviewsList.appendChild(li);
        })
    }

    // Delete review via delegation
    reviewsList.addEventListener('click', e => {
        if (e.target && e.target.classList.contains('review-delete')) {
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.role === 'admin') {
                const ts = Number(e.target.dataset.ts);
                reviews = reviews.filter(r => r.ts !== ts);
                localStorage.setItem('mazza_reviews', JSON.stringify(reviews));
                renderReviews();
            } else {
                alert('Sizda bu sharhni o\'chirish huquqi yo\'q!');
            }
        }
    })

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    renderReviews();

    // ---------- Card tilt/translate based on cursor X position ----------
    (function setupCardTilt() {
        const cards = document.querySelectorAll('.menu-grid .card');
        if (!cards || cards.length === 0) return;

        // disable on touch devices
        const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (isTouch) return;

        cards.forEach(card => {
            card.classList.add('card--tilt');
            let raf = null;
            card.addEventListener('mousemove', (ev) => {
                const rect = card.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const dx = ev.clientX - cx; // negative = left, positive = right
                const ratio = Math.max(-1, Math.min(1, dx / (rect.width / 2)));

                // schedule via rAF for smoothness
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => {
                    const translateX = ratio * 12; // px
                    const rotateY = -ratio * 6; // deg (tilt toward cursor)
                    const translateY = Math.abs(ratio) * -6; // slight lift
                    card.style.transform = `translateX(${translateX}px) translateY(${translateY}px) rotateY(${rotateY}deg) scale(1.02)`;
                    card.style.boxShadow = `0 ${12 + Math.abs(ratio) * 20}px ${20 + Math.abs(ratio) * 40}px rgba(12,12,12,${0.08 + Math.abs(ratio) * 0.12})`;
                });
            });

            card.addEventListener('mouseleave', () => {
                if (raf) cancelAnimationFrame(raf);
                card.style.transform = '';
                card.style.boxShadow = '';
            });
        });
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

    if (reviewForm) {
        reviewForm.addEventListener('submit', e => {
            e.preventDefault();
            // Use registered user's name for reviews. Require sign-in if not present.
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
            const entry = { name, rating, text, ts: Date.now() };
            reviews.push(entry);
            localStorage.setItem('mazza_reviews', JSON.stringify(reviews));
            reviewForm.reset();
            renderReviews();
        })
    }

    // --- Phone Number Input Formatting ---
    function setupPhoneInput(inputId) {
        // Disabling automatic +998 filling based on user request
    }

    setupPhoneInput('customerPhone');
    setupPhoneInput('suPhone');
    setupPhoneInput('siPhone');

});