const API_URL = '/api';

// Elemen DOM
const adminUsername = document.getElementById('admin-username');
const btnLogout = document.getElementById('btn-logout');
const booksTableBody = document.getElementById('books-table-body');
const searchInput = document.getElementById('search-input');
const btnAddBook = document.getElementById('btn-add-book');

// Statistik
const statTotalBooks = document.getElementById('stat-total-books');
const statTotalStock = document.getElementById('stat-total-stock');
const statTotalGenres = document.getElementById('stat-total-genres');

// Modal & Form
const bookModal = document.getElementById('book-modal');
const modalTitle = document.getElementById('modal-title');
const bookForm = document.getElementById('book-form');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');

// Input Form
const bookIdInput = document.getElementById('book-id');
const bookTitleInput = document.getElementById('book-title');
const bookAuthorInput = document.getElementById('book-author');
const bookGenreInput = document.getElementById('book-genre');
const bookImageInput = document.getElementById('book-image');
const bookPriceInput = document.getElementById('book-price');
const bookStockInput = document.getElementById('book-stock');
const bookDescriptionInput = document.getElementById('book-description');

// Elemen DOM Pencarian Online Google Books
const apiSearchInput = document.getElementById('api-search-input');
const btnApiSearch = document.getElementById('btn-api-search');
const apiResultsDropdown = document.getElementById('api-results-dropdown');

// State Aplikasi
let booksList = [];
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));

// ==========================================
// 1. CEK OTORISASI ADMIN
// ==========================================
async function checkAuth() {
  if (!token || !currentUser || currentUser.role !== 'admin') {
    sessionStorage.setItem('toastMessage', 'Akses Ditolak: Anda harus login sebagai admin terlebih dahulu.');
    sessionStorage.setItem('toastType', 'error');
    window.location.href = '../login/login&register.html';
    return;
  }

  // Set Nama User di Sidebar
  adminUsername.textContent = currentUser.username;

  // Verifikasi ke server untuk validitas token
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error('Sesi habis');
    }
  } catch (error) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('toastMessage', 'Sesi Anda telah berakhir, silakan login kembali.');
    sessionStorage.setItem('toastType', 'warning');
    window.location.href = '../login/login&register.html';
  }
}

// ==========================================
// 2. FETCH & TAMPILKAN DATA BUKU
// ==========================================
async function fetchBooks() {
  try {
    booksTableBody.innerHTML = `<tr><td colspan="5" class="table-loading">Memuat data buku...</td></tr>`;
    
    const response = await fetch(`${API_URL}/books`);
    if (!response.ok) throw new Error('Gagal mengambil data buku');
    
    booksList = await response.json();
    renderBooks(booksList);
    updateStats(booksList);
  } catch (error) {
    booksTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #ef4444; padding: 2rem 0;">
          <i class="fa-solid fa-triangle-exclamation"></i> Gagal menghubungkan ke server backend. Pastikan server sudah dijalankan.
        </td>
      </tr>`;
    console.error(error);
  }
}

function renderBooks(books) {
  if (books.length === 0) {
    booksTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px 0;">Tidak ada buku ditemukan</td></tr>`;
    return;
  }

  booksTableBody.innerHTML = books.map(book => {
    let stockClass = 'stock-active';
    let stockText = `${book.stock} Pcs`;
    
    if (book.stock === 0) {
      stockClass = 'stock-empty';
      stockText = 'Habis';
    } else if (book.stock <= 5) {
      stockClass = 'stock-warning';
      stockText = `Menipis (${book.stock})`;
    }

    const displayImgUrl = (book.imageUrl && (book.imageUrl.startsWith('http') || book.imageUrl.startsWith('data:')))
      ? book.imageUrl
      : `../${book.imageUrl || 'image/table.png'}`;

    return `
      <tr>
        <td>
          <div class="book-info">
            <img class="book-img" src="${displayImgUrl}" onerror="this.src='../image/table.png'" alt="${book.title}">
            <div class="book-details">
              <h4>${book.title}</h4>
              <p>Oleh: ${book.author}</p>
            </div>
          </div>
        </td>
        <td>
          <span class="category-badge">${book.genre}</span>
        </td>
        <td class="price-cell">
          <span>Rp ${Number(book.price).toLocaleString('id-ID')}</span>
        </td>
        <td class="stock-cell">
          <span class="stock-badge ${stockClass}">${stockText}</span>
        </td>
        <td>
          <div class="actions">
            <button class="btn-icon edit-btn" onclick="openEditModal('${book.id}')" title="Edit Buku">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-icon delete-btn" onclick="deleteBook('${book.id}', '${book.title.replace(/'/g, "\\'")}')" title="Hapus Buku">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Update Statistik
function updateStats(books) {
  statTotalBooks.textContent = books.length;
  
  const totalStock = books.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  statTotalStock.textContent = totalStock;

  const genres = [...new Set(books.map(b => b.genre.split(',')).flat().map(g => g.trim()))];
  statTotalGenres.textContent = genres.filter(g => g !== '').length;
}

// ==========================================
// 3. EVENT SEARCH & KONTROL FORM MODAL
// ==========================================
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const filtered = booksList.filter(book => 
    book.title.toLowerCase().includes(query) ||
    book.author.toLowerCase().includes(query) ||
    book.genre.toLowerCase().includes(query)
  );
  renderBooks(filtered);
});

// Buka modal untuk Tambah Buku
btnAddBook.addEventListener('click', () => {
  bookForm.reset();
  bookIdInput.value = '';
  modalTitle.textContent = 'Tambah Buku Baru';
  bookModal.classList.add('active');
});

// Buka modal untuk Edit Buku
window.openEditModal = function(id) {
  const book = booksList.find(b => b.id === id);
  if (!book) return;

  bookIdInput.value = book.id;
  bookTitleInput.value = book.title;
  bookAuthorInput.value = book.author;
  bookGenreInput.value = book.genre;
  bookImageInput.value = book.imageUrl || '';
  bookPriceInput.value = book.price;
  bookStockInput.value = book.stock;
  bookDescriptionInput.value = book.description || '';

  modalTitle.textContent = 'Edit Informasi Buku';
  bookModal.classList.add('active');
};

// Tutup Modal
const closeModal = () => {
  bookModal.classList.remove('active');
  if (apiResultsDropdown) {
    apiResultsDropdown.style.display = 'none';
    apiResultsDropdown.innerHTML = '';
  }
  if (apiSearchInput) {
    apiSearchInput.value = '';
  }
};
btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

// Tutup modal jika klik di luar box
window.addEventListener('click', (e) => {
  if (e.target === bookModal) closeModal();
});

// ==========================================
// 4. SUBMIT FORM (CREATE & UPDATE)
// ==========================================
bookForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = bookIdInput.value;
  const bookData = {
    title: bookTitleInput.value.trim(),
    author: bookAuthorInput.value.trim(),
    genre: bookGenreInput.value.trim(),
    imageUrl: bookImageInput.value.trim() || `https://placehold.co/400x600/089da1/ffffff?text=${encodeURIComponent(bookTitleInput.value.trim()).replace(/%20/g, '+')}`,
    price: Number(bookPriceInput.value),
    stock: Number(bookStockInput.value),
    description: bookDescriptionInput.value.trim()
  };

  const isEdit = id !== '';
  const url = isEdit ? `${API_URL}/books/${id}` : `${API_URL}/books`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal menyimpan buku');
    }

    Toast.success(isEdit ? 'Buku berhasil diperbarui!' : 'Buku berhasil ditambahkan!');
    closeModal();
    fetchBooks();
  } catch (error) {
    Toast.error(error.message);
  }
});

// ==========================================
// 5. HAPUS BUKU (DELETE)
// ==========================================
window.deleteBook = async function(id, title) {
  if (!confirm(`Apakah Anda yakin ingin menghapus buku "${title}" dari katalog?`)) return;

  try {
    const response = await fetch(`${API_URL}/books/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal menghapus buku');
    }

    Toast.success('Buku berhasil dihapus!');
    fetchBooks();
  } catch (error) {
    Toast.error(error.message);
  }
};

// ==========================================
// 6. LOGOUT
// ==========================================
btnLogout.addEventListener('click', () => {
  if (confirm('Apakah Anda yakin ingin keluar dari panel admin?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('toastMessage', 'Anda berhasil keluar dari panel admin.');
    sessionStorage.setItem('toastType', 'success');
    window.location.href = '../index.html';
  }
});

// ==========================================
// 7. GOOGLE BOOKS ONLINE SEARCH & AUTO-FILL
// ==========================================
if (btnApiSearch && apiSearchInput && apiResultsDropdown) {
  btnApiSearch.addEventListener('click', performOnlineSearch);
  apiSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performOnlineSearch();
    }
  });
}

async function performOnlineSearch() {
  const query = apiSearchInput.value.trim();
  if (!query) {
    Toast.warning('Silakan masukkan kata kunci judul atau pengarang buku!');
    return;
  }

  btnApiSearch.disabled = true;
  btnApiSearch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  apiResultsDropdown.style.display = 'none';
  apiResultsDropdown.innerHTML = '';

  let apiSource = 'google';
  let items = [];

  try {
    // 1. Coba panggil Google Books API terlebih dahulu
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`);
    if (!response.ok) throw new Error('Status: ' + response.status);
    
    const data = await response.json();
    items = data.items || [];
    
    if (items.length === 0) {
      throw new Error('Tidak ditemukan hasil di Google Books');
    }
    
    apiSource = 'google';
  } catch (error) {
    console.warn('Google Books API dibatasi (rate limit/429) atau offline. Mengalihkan ke Open Library API...', error.message);
    
    try {
      // 2. Fallback otomatis ke Open Library API yang bebas rate limit
      const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=5`);
      if (!response.ok) throw new Error('Gagal menghubungi Open Library API');
      
      const data = await response.json();
      items = data.docs || [];
      apiSource = 'openlibrary';
    } catch (olError) {
      Toast.error('Kedua layanan pencarian buku online sedang tidak dapat dihubungi. Pastikan laptop Anda terhubung ke internet.');
      btnApiSearch.disabled = false;
      btnApiSearch.innerHTML = '<i class="fa-solid fa-earth-americas"></i> Cari';
      return;
    }
  }

  // Tampilkan pesan jika tidak ada hasil dari kedua API
  if (items.length === 0) {
    apiResultsDropdown.innerHTML = '<div style="padding: 0.5rem; color: var(--text-secondary); text-align: center; font-size: 0.8rem;">Buku tidak ditemukan secara online.</div>';
    apiResultsDropdown.style.display = 'flex';
    btnApiSearch.disabled = false;
    btnApiSearch.innerHTML = '<i class="fa-solid fa-earth-americas"></i> Cari';
    return;
  }

  // Render opsi berdasarkan sumber API yang berhasil memuat
  if (apiSource === 'google') {
    apiResultsDropdown.innerHTML = items.map((item, index) => {
      const info = item.volumeInfo;
      const title = info.title || 'Tanpa Judul';
      const authors = info.authors ? info.authors.join(', ') : 'Penulis Tidak Diketahui';
      let thumb = '';
      if (info.imageLinks) {
        thumb = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
        thumb = thumb.replace(/^http:/i, 'https:');
      }

      return `
        <div class="api-result-item" data-index="${index}">
          <img src="${thumb || '../image/table.png'}" onerror="this.src='../image/table.png'" alt="Cover">
          <div class="item-info">
            <h5>${title}</h5>
            <p>${authors}</p>
          </div>
        </div>
      `;
    }).join('');
  } else {
    // Open Library mapping
    apiResultsDropdown.innerHTML = items.map((doc, index) => {
      const title = doc.title || 'Tanpa Judul';
      const authors = doc.author_name ? doc.author_name.join(', ') : 'Penulis Tidak Diketahui';
      const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '';

      return `
        <div class="api-result-item" data-index="${index}">
          <img src="${coverUrl || '../image/table.png'}" onerror="this.src='../image/table.png'" alt="Cover">
          <div class="item-info">
            <h5>${title}</h5>
            <p>${authors} (OpenLibrary)</p>
          </div>
        </div>
      `;
    }).join('');
  }

  apiResultsDropdown.style.display = 'flex';

  // Tambahkan event listener klik pada masing-masing item hasil pencarian
  const resultItems = apiResultsDropdown.querySelectorAll('.api-result-item');
  resultItems.forEach(itemEl => {
    itemEl.addEventListener('click', () => {
      const idx = itemEl.getAttribute('data-index');
      
      if (apiSource === 'google') {
        const selectedBook = items[idx].volumeInfo;
        
        // Auto-fill field formulir
        bookTitleInput.value = selectedBook.title || '';
        bookAuthorInput.value = selectedBook.authors ? selectedBook.authors.join(', ') : '';
        bookGenreInput.value = selectedBook.categories ? selectedBook.categories.join(', ') : 'Novel';
        
        let desc = selectedBook.description || '';
        desc = desc.replace(/<\/?[^>]+(>|$)/g, "");
        bookDescriptionInput.value = desc;
        
        let coverUrl = '';
        if (selectedBook.imageLinks) {
          coverUrl = selectedBook.imageLinks.thumbnail || selectedBook.imageLinks.smallThumbnail || '';
          coverUrl = coverUrl.replace(/^http:/i, 'https:');
        }
        bookImageInput.value = coverUrl;
      } else {
        // Open Library mapping
        const selectedBook = items[idx];
        bookTitleInput.value = selectedBook.title || '';
        bookAuthorInput.value = selectedBook.author_name ? selectedBook.author_name.join(', ') : '';
        
        // Cari genre/kategori dari subjek pertama
        bookGenreInput.value = selectedBook.subject ? selectedBook.subject.slice(0, 2).join(', ') : 'Novel';
        
        // Open Library Search doc tidak ada sinopsis langsung, beri deskripsi default yang bagus
        bookDescriptionInput.value = `Buku berkualitas berjudul "${selectedBook.title}" karangan ${selectedBook.author_name ? selectedBook.author_name[0] : 'penulis pilihan'}. Pertama kali diterbitkan pada tahun ${selectedBook.first_publish_year || 'yang lalu'}.`;
        
        const coverUrl = selectedBook.cover_i ? `https://covers.openlibrary.org/b/id/${selectedBook.cover_i}-L.jpg` : '';
        bookImageInput.value = coverUrl;
      }
      
      // Isi nilai default harga & stok jika belum terisi
      if (!bookPriceInput.value) {
        const randomPrice = Math.floor(Math.random() * 11) * 5000 + 45000;
        bookPriceInput.value = randomPrice;
      }
      if (!bookStockInput.value) {
        bookStockInput.value = 10;
      }

      // Sembunyikan dropdown & reset kolom pencarian online
      apiResultsDropdown.style.display = 'none';
      apiResultsDropdown.innerHTML = '';
      apiSearchInput.value = '';
    });
  });

  btnApiSearch.disabled = false;
  btnApiSearch.innerHTML = '<i class="fa-solid fa-earth-americas"></i> Cari';
}

// Inisialisasi
checkAuth().then(fetchBooks);
