document.addEventListener('DOMContentLoaded', () => {
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
            li.innerHTML = `<div><strong>${item.name}</strong><br><small>${item.qty} × ${formatPrice(item.price)}</small></div><div><button class="btn icon remove" data-id="${id}" aria-label="Remove ${item.name}">−</button></div>`;
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
                if (cart[id].qty <= 0) delete cart[id];
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

    cartBtn.addEventListener('click', openCart);
    closeCart.addEventListener('click', closeCartFn);
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
    }
    if (tabSignIn) tabSignIn.addEventListener('click', showSignIn);
    if (tabSignUp) tabSignUp.addEventListener('click', showSignUp);

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
    async function handleSignUp(e) {
        e.preventDefault();
        const name = (document.getElementById('suName') || {}).value.trim();
        const phone = (document.getElementById('suPhone') || {}).value.trim();
        const pw = (document.getElementById('suPassword') || {}).value;
        const pw2 = (document.getElementById('suPassword2') || {}).value;
        if (!name || !phone || !pw) { if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Iltimos, barcha maydonlarni to\'ldiring.'; } return; }
        if (pw !== pw2) { if (authMsg) { authMsg.style.display = 'block'; authMsg.textContent = 'Parollar mos kelmadi.'; } return; }
        try {
            await registerUser(name, phone, pw);
            renderAuthState();
            closeAuthFn();
            alert('Hisob yaratildi va tizimga kirildi.');
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

    cartModal.addEventListener('click', e => {
        if (e.target === cartModal) closeCartFn();
    })

    if (authModal) {
        authModal.addEventListener('click', e => { if (e.target === authModal) closeAuthFn(); });
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

        // close when a mobile link is clicked
        mobile.addEventListener('click', e => {
            if (e.target && e.target.matches('.mobile-link')) close();
        });

        // close on pressing Escape
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    })();

    // Order modal handlers
    function populateOrderForm() {
        orderItemsEl.innerHTML = '';
        let total = 0;
        Object.keys(cart).forEach(id => {
            const it = cart[id];
            const row = document.createElement('div');
            row.className = 'order-item';
            row.innerHTML = `<div>${escapeHtml(it.name)} <small>× ${it.qty}</small></div><div><strong>${formatPrice(it.price * it.qty)}</strong></div>`;
            orderItemsEl.appendChild(row);
            total += it.price * it.qty;
        })
        const totalRow = document.createElement('div');
        totalRow.className = 'order-item';
        totalRow.innerHTML = `<div><strong>Total</strong></div><div><strong>${formatPrice(total)}</strong></div>`;
        orderItemsEl.appendChild(totalRow);
    }

    function closeOrderFn() { orderModal.setAttribute('aria-hidden', 'true'); }
    closeOrder.addEventListener('click', closeOrderFn);
    orderCancel.addEventListener('click', e => { e.preventDefault(); closeOrderFn(); });
    orderModal.addEventListener('click', e => { if (e.target === orderModal) closeOrderFn(); });

    // Submit order form (demo: store order in localStorage and show confirmation)
    orderForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const address = document.getElementById('customerAddress').value.trim();
        if (!name || !phone || !address) { alert('Iltimos, ism, telefon va manzilni to\'ldiring.'); return }
        const order = { id: 'ord_' + Date.now(), name, phone, address, items: cart, total: Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0), ts: Date.now() };
        const orders = JSON.parse(localStorage.getItem('mazza_orders') || '[]');
        orders.push(order);
        localStorage.setItem('mazza_orders', JSON.stringify(orders));

        // Try to notify backend (if available) which will forward to Telegram.
        // This call is best-effort and will fail silently if no backend is running.
        if (window.fetch) {
            sendOrderToBackend(order);
        }

        // Demo confirmation and clear cart
        alert('Buyurtma qabul qilindi! Tez orada siz bilan bog\'lanamiz.');
        cart = {}; updateCartUI(); closeOrderFn(); closeCartFn();
    })

    // Attempt to post order to the server endpoint which forwards to Telegram.
    function sendOrderToBackend(order) {
        try {
            fetch('/api/send-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order })
            }).then(async res => {
                if (res.ok) {
                    console.log('Order forwarded to backend.');
                } else {
                    const txt = await res.text().catch(() => null);
                    console.warn('Backend responded with status', res.status, txt);
                }
            }).catch(err => {
                console.warn('Could not reach backend to forward order (this is optional):', err.message || err);
            });
        } catch (err) {
            console.warn('Failed to send order to backend:', err);
        }
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
            li.innerHTML = `<div class="review-meta"><strong>${escapeHtml(r.name)}</strong> — ${r.rating} ⭐ • <small>${new Date(r.ts).toLocaleString()}</small> <button class="review-delete" data-ts="${r.ts}" aria-label="Delete review">O'chirish</button></div><div class="review-body">${escapeHtml(r.text)}</div>`;
            reviewsList.appendChild(li);
        })
    }

    // Delete review via delegation
    reviewsList.addEventListener('click', e => {
        if (e.target && e.target.classList.contains('review-delete')) {
            const ts = Number(e.target.dataset.ts);
            reviews = reviews.filter(r => r.ts !== ts);
            localStorage.setItem('mazza_reviews', JSON.stringify(reviews));
            renderReviews();
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
            const name = reviewName.value.trim();
            const rating = parseInt(reviewRating.value, 10) || 5;
            const text = reviewText.value.trim();
            if (!name || !text) {
                alert('Iltimos, ismingiz va qisqacha fikringizni yozing.');
                return;
            }
            const entry = { name, rating, text, ts: Date.now() };
            reviews.push(entry);
            localStorage.setItem('mazza_reviews', JSON.stringify(reviews));
            reviewForm.reset();
            renderReviews();
        })
    }
});