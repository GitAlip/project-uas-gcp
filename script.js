// Banner Slider (UTS Code)
let index = 0;
const slides = document.querySelectorAll(".banner_slide img");

function changeBanner() {
    if (slides.length > 0) {
        slides.forEach(slide => slide.classList.remove("active"));
        index = (index + 1) % slides.length;
        slides[index].classList.add("active");
    }
}

if (slides.length > 0) {
    setInterval(changeBanner, 3000);
}

// Hamburger Menu & Mobile Drawer Control
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
const navBackdrop = document.getElementById('nav-backdrop');
const btnCloseDrawer = document.getElementById('btn-close-drawer');

function openDrawer() {
  if (navMenu) navMenu.classList.add('active');
  if (navBackdrop) {
    navBackdrop.style.display = 'block';
    setTimeout(() => {
      navBackdrop.style.opacity = '1';
    }, 10);
  }
  document.body.style.overflow = 'hidden'; // prevent scroll of background
}

function closeDrawer() {
  if (navMenu) navMenu.classList.remove('active');
  if (navBackdrop) {
    navBackdrop.style.opacity = '0';
    setTimeout(() => {
      navBackdrop.style.display = 'none';
    }, 300);
  }
  document.body.style.overflow = ''; // restore scroll
}

if (hamburger) {
  hamburger.addEventListener('click', openDrawer);
}
if (btnCloseDrawer) {
  btnCloseDrawer.addEventListener('click', closeDrawer);
}
if (navBackdrop) {
  navBackdrop.addEventListener('click', closeDrawer);
}

// Close drawer when any anchor link is clicked
if (navMenu) {
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

// ========================================================
// INTEGRASI UAS: BACKEND API, AUTHENTICATION, & CHATBOT AI
// ========================================================
const BACKEND_URL = '/api';

// Elemen DOM untuk UAS
const authContainer = document.getElementById('auth-buttons-container');

// 1. Inisialisasi State Autentikasi di Navbar & Drawer
function setupNavbarAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const drawerName = document.getElementById('drawer-user-name');
  const drawerRole = document.getElementById('drawer-user-role');
  const navMenu = document.getElementById('nav-menu');

  // Helper to remove existing dynamic mobile elements to avoid duplicates
  const removeOldMobileElements = () => {
    ['nav-mybooks', 'nav-admin-drawer', 'nav-auth-drawer-li'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  };

  removeOldMobileElements();

  if (token && user) {
    // Update profile in mobile drawer
    if (drawerName) drawerName.textContent = user.username || 'Pengguna';
    if (drawerRole) drawerRole.textContent = user.role === 'admin' ? 'Administrator' : 'Pengguna';

    // Add "Koleksi Saya" to the menu
    if (navMenu && !document.getElementById('nav-mybooks')) {
      const li = document.createElement('li');
      li.id = 'nav-mybooks';
      li.innerHTML = `<a href="mybooks.html"><i class="fa-solid fa-book"></i> Koleksi Saya</a>`;
      navMenu.appendChild(li);
    }

    // If admin, add "Dashboard Admin" to both navbar and drawer
    if (user.role === 'admin') {
      if (navMenu && !document.getElementById('nav-admin-drawer')) {
        const li = document.createElement('li');
        li.id = 'nav-admin-drawer';
        li.innerHTML = `<a href="admin/dashboard.html"><i class="fa-solid fa-user-gear"></i> Dashboard Admin</a>`;
        navMenu.appendChild(li);
      }
    }

    // Add mobile-only Logout button at the end of the drawer list
    if (navMenu) {
      const li = document.createElement('li');
      li.id = 'nav-auth-drawer-li';
      li.className = 'mobile-drawer-auth';
      li.innerHTML = `<button id="btn-logout-drawer" class="btn-logout-drawer"><i class="fa-solid fa-right-from-bracket"></i> Keluar</button>`;
      navMenu.appendChild(li);
      
      // Handler for mobile drawer logout
      const logoutDrawerBtn = document.getElementById('btn-logout-drawer');
      if (logoutDrawerBtn) {
        logoutDrawerBtn.addEventListener('click', () => {
          if (confirm('Apakah Anda yakin ingin keluar?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.setItem('toastMessage', 'Berhasil keluar.');
            sessionStorage.setItem('toastType', 'success');
            window.location.reload();
          }
        });
      }
    }

    // Desktop navbar auth container buttons setup
    if (authContainer) {
      let buttonsHTML = '';
      if (user.role === 'admin') {
        buttonsHTML += `<a href="admin/dashboard.html" class="btn-dashboard" style="margin-right: 10px;">Dashboard Admin</a>`;
      }
      buttonsHTML += `<button id="btn-logout-nav" class="btn-logout-nav">Keluar</button>`;
      authContainer.innerHTML = buttonsHTML;

      // Event listener for desktop logout
      const logoutBtn = document.getElementById('btn-logout-nav');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          if (confirm('Apakah Anda yakin ingin keluar?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.setItem('toastMessage', 'Berhasil keluar.');
            sessionStorage.setItem('toastType', 'success');
            window.location.reload();
          }
        });
      }
    }
  } else {
    // Guest User
    if (drawerName) drawerName.textContent = 'Tamu';
    if (drawerRole) drawerRole.textContent = 'Silakan Login';

    // Add mobile-only Login link at the end of the drawer list
    if (navMenu) {
      const li = document.createElement('li');
      li.id = 'nav-auth-drawer-li';
      li.className = 'mobile-drawer-auth';
      li.innerHTML = `<a href="login/login&register.html" class="btn-login-drawer"><i class="fa-solid fa-right-to-bracket"></i> Login</a>`;
      navMenu.appendChild(li);
    }

    if (authContainer) {
      authContainer.innerHTML = `<a href="login/login&register.html" class="btn-login">Login</a>`;
    }
  }
}

// 2. Fetch Buku Secara Dinamis dari Database Backend
let allBooks = []; // State daftar buku global

async function loadDynamicBooks() {
  try {
    const response = await fetch(`${BACKEND_URL}/books`);
    if (!response.ok) throw new Error('Gagal mengambil data buku dari server');
    
    allBooks = await response.json();
    renderFeaturedBooks(allBooks);
    setupSearchFilter(); // Inisialisasi filter pencarian

    // Konsep New Book: Urutkan ID secara descending (buku terbaru) dan tampilkan 5 teratas
    const sortedBooks = [...allBooks].sort((a, b) => Number(b.id) - Number(a.id));
    const newArrivals = sortedBooks.slice(0, 5); // Ambil 5 teratas
    renderArrivals(newArrivals);
  } catch (error) {
    console.warn('Backend server offline. Menggunakan data statis bawaan HTML sebagai fallback.', error.message);
    // Tidak merender ulang jika backend mati, membiarkan data HTML statis bawaan UTS tetap tampil
  }
}

function setupSearchFilter() {
  const searchInput = document.getElementById('main-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderFeaturedBooks(allBooks);
      return;
    }

    const filtered = allBooks.filter(book => 
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.genre.toLowerCase().includes(query)
    );
    renderFeaturedBooks(filtered);
  });
}

function renderFeaturedBooks(books) {
  const container = document.querySelector('.featured_book_box');
  if (!container) return;

  if (books.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">Tidak ada koleksi buku tersedia saat ini.</p>`;
    return;
  }

  container.innerHTML = books.map(book => {
    // Format harga Rupiah
    const formattedPrice = `Rp.${Number(book.price).toLocaleString('id-ID')}`;
    const formattedOriginalPrice = book.originalPrice ? `Rp.${Number(book.originalPrice).toLocaleString('id-ID')}` : '';

    const imgUrl = (book.imageUrl && book.imageUrl !== 'image/table.png' && (book.imageUrl.startsWith('http') || book.imageUrl.startsWith('data:') || book.imageUrl.startsWith('img/') || book.imageUrl.startsWith('image/')))
      ? book.imageUrl
      : `https://placehold.co/400x600/089da1/ffffff?text=${encodeURIComponent(book.title).replace(/%20/g, '+')}`;

    return `
      <div class="featured_book_card">
        <div class="featurde_book_img">
          <img src="${imgUrl}" onerror="this.src='https://placehold.co/400x600/089da1/ffffff?text=Buku+Store'">
        </div>
        <div class="featurde_book_tag">
          <h2>${book.title}</h2>
          <p class="writer">${book.author}</p>
          <div class="categories">${book.genre}</div>
          <p class="book_price">${formattedPrice} ${formattedOriginalPrice ? `<sub><del>${formattedOriginalPrice}</del></sub>` : ''}</p>
          <div class="card_actions">
            <button onclick="addToCart('${book.id}')" class="f_btn">Beli</button>
            <button onclick="borrowBookPrompt('${book.id}', '${book.title.replace(/'/g, "\\'")}')" class="borrow_btn">Pinjam</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderArrivals(books) {
  const container = document.querySelector('.arrivals_box');
  if (!container) return;

  if (books.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">Tidak ada koleksi e-book baru saat ini.</p>`;
    return;
  }

  container.innerHTML = books.map(book => {
    const imgUrl = (book.imageUrl && book.imageUrl !== 'image/table.png' && (book.imageUrl.startsWith('http') || book.imageUrl.startsWith('data:') || book.imageUrl.startsWith('img/') || book.imageUrl.startsWith('image/')))
      ? book.imageUrl
      : `https://placehold.co/400x600/089da1/ffffff?text=${encodeURIComponent(book.title).replace(/%20/g, '+')}`;

    return `
      <div class="arrivals_card">
        <div class="arrivals_image">
          <img src="${imgUrl}" onerror="this.src='https://placehold.co/400x600/089da1/ffffff?text=Buku+Store'">
        </div>
        <div class="arrivals_tag">
          <p>${book.title}</p>
          <div class="arrivals_icon">
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
          </div>
          <div class="card_actions">
            <button onclick="addToCart('${book.id}')" class="arrivals_btn">Beli</button>
            <button onclick="borrowBookPrompt('${book.id}', '${book.title.replace(/'/g, "\\'")}')" class="arrivals_borrow_btn">Pinjam</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 3. Fungsionalitas Chatbot AI Gemini
function setupChatbot() {
  const chatbotToggle = document.getElementById('chatbot-toggle');
  const chatbotBox = document.getElementById('chatbot-box');
  const chatbotClose = document.getElementById('chatbot-close');
  const chatbotForm = document.getElementById('chatbot-form');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotMessages = document.getElementById('chatbot-messages');

  if (!chatbotToggle || !chatbotBox || !chatbotClose || !chatbotForm) return;

  // Toggle chatbot
  chatbotToggle.addEventListener('click', () => {
    chatbotBox.classList.toggle('active');
  });

  chatbotClose.addEventListener('click', () => {
    chatbotBox.classList.remove('active');
  });

  // Kirim Chat
  chatbotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = chatbotInput.value.trim();
    if (!userMessage) return;

    // Tampilkan pesan user di chat window
    appendMessage('user', userMessage);
    chatbotInput.value = '';

    // Tampilkan typing indicator
    const typingIndicatorId = appendTypingIndicator();

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      removeTypingIndicator(typingIndicatorId);

      if (!response.ok) {
        throw new Error(data.message || 'Gagal memproses pesan');
      }

      // Tampilkan balasan AI
      appendMessage('bot', data.reply);

    } catch (error) {
      removeTypingIndicator(typingIndicatorId);
      appendMessage('bot', `Maaf, saya sedang mengalami kendala teknis (${error.message}). Pastikan server backend Anda menyala dan kunci API diatur.`);
    }
  });

  function appendMessage(sender, text) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    
    // Jika pengirimnya bot, kita bisa parsing markdown dasar secara sederhana (terutama link/list/bold)
    if (sender === 'bot') {
      messageEl.innerHTML = formatMarkdown(text);
    } else {
      messageEl.textContent = text;
    }
    
    chatbotMessages.appendChild(messageEl);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function appendTypingIndicator() {
    const id = 'typing-' + Date.now();
    const indicatorEl = document.createElement('div');
    indicatorEl.id = id;
    indicatorEl.classList.add('typing-indicator');
    indicatorEl.innerHTML = `<span></span><span></span><span></span>`;
    
    chatbotMessages.appendChild(indicatorEl);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return id;
  }

  function removeTypingIndicator(id) {
    const indicatorEl = document.getElementById(id);
    if (indicatorEl) {
      indicatorEl.remove();
    }
  }

  // Fungsi sederhana mem-format markdown tebal dan list
  function formatMarkdown(text) {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    return formatted;
  }
}

// Inisialisasi saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuth();
  loadDynamicBooks();
  setupChatbot();
  setupCart();
});

// ========================================================
// 4. FUNGSIONALITAS KERANJANG BELANJA & CHECKOUT SIMULASI
// ========================================================
let cart = [];

function setupCart() {
  const cartIconWrapper = document.getElementById('cart-icon-wrapper');
  const cartDrawer = document.getElementById('cart-drawer');
  const btnCloseCart = document.getElementById('btn-close-cart');
  const btnCheckout = document.getElementById('btn-checkout');

  if (!cartIconWrapper || !cartDrawer || !btnCloseCart || !btnCheckout) return;

  // Buka Drawer Keranjang
  cartIconWrapper.addEventListener('click', () => {
    cartDrawer.classList.toggle('active');
  });

  // Tutup Drawer Keranjang
  btnCloseCart.addEventListener('click', () => {
    cartDrawer.classList.remove('active');
  });

  // Event checkout bayar
  btnCheckout.addEventListener('click', checkoutCart);

  // Ambil data keranjang lama jika ada di session
  const savedCart = sessionStorage.getItem('cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartUI();
  }
}

// Tambah Buku ke Keranjang Belanja
window.addToCart = function(bookId) {
  const token = localStorage.getItem('token');
  if (!token) {
    Toast.warning("Silakan login terlebih dahulu untuk melakukan pembelian!");
    setTimeout(() => {
      window.location.href = "login/login&register.html";
    }, 1200);
    return;
  }

  // Temukan detail buku dari cache allBooks
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  if (book.stock <= 0) {
    Toast.error("Maaf, stok buku ini sudah habis!");
    return;
  }

  // Cek apakah buku sudah ada di keranjang
  const isExist = cart.some(item => item.id === bookId);
  if (isExist) {
    Toast.warning("Buku ini sudah ada di dalam keranjang belanja Anda!");
    return;
  }

  cart.push(book);
  sessionStorage.setItem('cart', JSON.stringify(cart));
  
  updateCartUI();
  
  // Berikan efek visual pada keranjang
  const cartIcon = document.querySelector('#cart-icon-wrapper i');
  if (cartIcon) {
    cartIcon.style.transform = 'scale(1.3)';
    setTimeout(() => {
      cartIcon.style.transform = 'scale(1)';
    }, 200);
  }

  // Buka drawer keranjang
  const cartDrawer = document.getElementById('cart-drawer');
  if (cartDrawer) {
    cartDrawer.classList.add('active');
  }
};

// Hapus Buku dari Keranjang
window.removeFromCart = function(bookId) {
  cart = cart.filter(item => item.id !== bookId);
  sessionStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
};

// Perbarui Tampilan UI Keranjang
function updateCartUI() {
  const cartBadge = document.getElementById('cart-badge');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartTotalPrice = document.getElementById('cart-total-price');

  if (!cartBadge || !cartItemsContainer || !cartTotalPrice) return;

  // Set Badge
  cartBadge.textContent = cart.length;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<p style="text-align: center; color: #64748b; margin-top: 40px;">Keranjang belanja Anda kosong.</p>`;
    cartTotalPrice.textContent = 'Rp 0';
    return;
  }

  // Render Items
  cartItemsContainer.innerHTML = cart.map(item => {
    const formattedPrice = `Rp ${Number(item.price).toLocaleString('id-ID')}`;
    const imgUrl = (item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('data:')))
      ? item.imageUrl
      : item.imageUrl || 'image/table.png';

    return `
      <div class="cart-item-row">
        <img src="${imgUrl}" onerror="this.src='image/table.png'" alt="Cover">
        <div class="cart-item-info">
          <h4>${item.title}</h4>
          <p>${formattedPrice}</p>
        </div>
        <button class="btn-remove-cart" onclick="removeFromCart('${item.id}')" title="Hapus dari keranjang">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');

  // Hitung Total
  const total = cart.reduce((acc, item) => acc + Number(item.price), 0);
  cartTotalPrice.textContent = `Rp ${total.toLocaleString('id-ID')}`;
}

// Lakukan Transaksi (Checkout)
async function checkoutCart() {
  const token = localStorage.getItem('token');
  if (cart.length === 0) {
    Toast.warning("Keranjang belanja masih kosong!");
    return;
  }

  const paymentMethodSelect = document.getElementById('payment-method-select');
  const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'bank-transfer';
  
  const btnCheckout = document.getElementById('btn-checkout');
  btnCheckout.disabled = true;
  btnCheckout.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses Pembayaran...';

  try {
    const response = await fetch(`${BACKEND_URL}/purchases/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        bookIds: cart.map(item => item.id)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Transaksi gagal');
    }

    // Alert sukses simulasi bayar
    let methodText = 'Virtual Account';
    if (paymentMethod === 'gopay') methodText = 'GoPay';
    else if (paymentMethod === 'ovo') methodText = 'OVO';
    else if (paymentMethod === 'credit-card') methodText = 'Kartu Kredit';

    // Store in sessionStorage to display on redirect page
    sessionStorage.setItem('toastMessage', `Pembayaran Sukses via ${methodText}!\nSemua e-book pilihan Anda telah berhasil dibeli.`);
    sessionStorage.setItem('toastType', 'success');
    
    // Clear keranjang
    cart = [];
    sessionStorage.removeItem('cart');
    updateCartUI();
    
    // Sembunyikan keranjang
    const cartDrawer = document.getElementById('cart-drawer');
    if (cartDrawer) cartDrawer.classList.remove('active');

    // Redirect ke Koleksi Saya
    window.location.href = 'mybooks.html';

  } catch (error) {
    Toast.error('Terjadi kesalahan pembayaran: ' + error.message);
  } finally {
    btnCheckout.disabled = false;
    btnCheckout.innerHTML = '<i class="fa-solid fa-credit-card"></i> Bayar Sekarang';
  }
}

// 5. FUNGSIONALITAS PEMINJAMAN BUKU (BORROW)
window.borrowBookPrompt = function(bookId, bookTitle) {
  const token = localStorage.getItem('token');
  if (!token) {
    sessionStorage.setItem('toastMessage', 'Silakan login terlebih dahulu untuk meminjam buku.');
    sessionStorage.setItem('toastType', 'warning');
    window.location.href = "login/login&register.html";
    return;
  }

  const durationStr = prompt(`Masukkan durasi peminjaman untuk "${bookTitle}" (dalam menit):\nContoh: 1 (untuk uji coba cepat), 5, 60 (1 jam), 1440 (1 hari)`, "5");
  if (durationStr === null) return; // Batal

  const durationMinutes = parseInt(durationStr);
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    Toast.warning("Durasi peminjaman harus berupa angka bulat positif!");
    return;
  }

  borrowBook(bookId, durationMinutes);
};

async function borrowBook(bookId, durationMinutes) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${BACKEND_URL}/borrows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ bookId, durationMinutes })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Gagal meminjam buku');
    }

    sessionStorage.setItem('toastMessage', `Berhasil meminjam buku!\nBuku tersebut telah ditambahkan ke Koleksi Saya selama ${durationMinutes} menit.`);
    sessionStorage.setItem('toastType', 'success');
    window.location.href = 'mybooks.html';
  } catch (error) {
    Toast.error(error.message);
  }
}