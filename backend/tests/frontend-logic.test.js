/**
 * ============================================================
 * FRONTEND LOGIC UNIT TESTS — E-Book Store
 * ============================================================
 * File ini menguji PURE LOGIC yang diekstrak dari script.js.
 * Semua fungsi diuji tanpa DOM, fetch, atau browser API apa pun
 * sehingga bisa berjalan cepat dan reliabel di Node / CI.
 * ============================================================
 */

// ============================================================
// FUNGSI-FUNGSI YANG DIUJI (diekstrak dari script.js)
// ============================================================

/**
 * Menambahkan buku ke keranjang belanja.
 * Mengembalikan objek { error, cart } — cart baru TIDAK memutasi array asli.
 */
function addToCartLogic(cart, allBooks, bookId, isLoggedIn) {
  if (!isLoggedIn) return { error: 'LOGIN_REQUIRED', cart };
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return { error: 'BOOK_NOT_FOUND', cart };
  if (book.stock <= 0) return { error: 'OUT_OF_STOCK', cart };
  const isExist = cart.some(item => item.id === bookId);
  if (isExist) return { error: 'ALREADY_IN_CART', cart };
  return { error: null, cart: [...cart, book] };
}

/**
 * Menghapus buku dari keranjang berdasarkan bookId.
 */
function removeFromCartLogic(cart, bookId) {
  return cart.filter(item => item.id !== bookId);
}

/**
 * Menghitung total harga seluruh item di keranjang.
 */
function calculateCartTotal(cart) {
  return cart.reduce((acc, item) => acc + Number(item.price), 0);
}

/**
 * Format angka harga menjadi string Rupiah "Rp.xxx.xxx".
 * Menggunakan locale id-ID yang sesuai dengan script.js asli.
 */
function formatPrice(price) {
  return `Rp.${Number(price).toLocaleString('id-ID')}`;
}

/**
 * Filter buku berdasarkan query (title / author / genre).
 */
function filterBooks(allBooks, query) {
  if (!query) return allBooks;
  const q = query.toLowerCase().trim();
  if (q === '') return allBooks;
  return allBooks.filter(book =>
    book.title.toLowerCase().includes(q) ||
    book.author.toLowerCase().includes(q) ||
    book.genre.toLowerCase().includes(q)
  );
}

/**
 * Ambil buku terbaru (ID terbesar = terbaru), default 5 buku.
 */
function getNewArrivals(books, count = 5) {
  return [...books].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, count);
}

/**
 * Resolve URL gambar buku — logika sama persis dengan script.js
 * baris 231-233 dan 265-267.
 */
function resolveImageUrl(book) {
  const imageUrl = book.imageUrl;
  if (
    imageUrl &&
    imageUrl !== 'image/table.png' &&
    (imageUrl.startsWith('http') ||
      imageUrl.startsWith('data:') ||
      imageUrl.startsWith('img/') ||
      imageUrl.startsWith('image/'))
  ) {
    return imageUrl;
  }
  return `https://placehold.co/400x600/089da1/ffffff?text=${encodeURIComponent(book.title).replace(/%20/g, '+')}`;
}

/**
 * Validasi durasi peminjaman buku (baris 604-611 di script.js).
 */
function validateBorrowDuration(durationStr) {
  if (durationStr === null) return { valid: false, reason: 'CANCELLED' };
  const duration = parseInt(durationStr);
  if (isNaN(duration) || duration <= 0) return { valid: false, reason: 'INVALID' };
  return { valid: true, duration };
}

/**
 * Format markdown sederhana (baris 386-393 di script.js).
 */
function formatMarkdown(text) {
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
  return formatted;
}

// ============================================================
// DATA FIXTURE
// ============================================================

/** Koleksi buku contoh yang digunakan di berbagai test suite. */
const SAMPLE_BOOKS = [
  { id: '1', title: 'Laskar Pelangi', author: 'Andrea Hirata', genre: 'Fiksi', price: 75000, stock: 10, imageUrl: 'http://example.com/lp.jpg' },
  { id: '2', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', genre: 'Sejarah', price: 90000, stock: 5, imageUrl: 'img/bm.jpg' },
  { id: '3', title: 'Filosofi Teras', author: 'Henry Manampiring', genre: 'Self-Help', price: 82000, stock: 0, imageUrl: 'image/ft.png' },
  { id: '4', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help', price: 99000, stock: 15, imageUrl: 'data:image/png;base64,abc' },
  { id: '5', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Sejarah', price: 120000, stock: 8, imageUrl: 'image/table.png' },
  { id: '6', title: 'Clean Code', author: 'Robert C. Martin', genre: 'Teknologi', price: 150000, stock: 20, imageUrl: undefined },
  { id: '7', title: 'The Pragmatic Programmer', author: 'David Thomas', genre: 'Teknologi', price: '115000', stock: 3, imageUrl: 'http://example.com/tpp.jpg' },
];

// ============================================================
// 1. CART LOGIC TESTS
// ============================================================

describe('Cart Logic', () => {
  // ----- addToCartLogic -----

  describe('addToCartLogic', () => {
    test('berhasil menambahkan buku ke keranjang (happy path)', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '1', true);
      expect(result.error).toBeNull();
      expect(result.cart).toHaveLength(1);
      expect(result.cart[0].id).toBe('1');
    });

    test('mengembalikan LOGIN_REQUIRED jika user belum login', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '1', false);
      expect(result.error).toBe('LOGIN_REQUIRED');
      expect(result.cart).toEqual([]);
    });

    test('mengembalikan BOOK_NOT_FOUND untuk bookId yang tidak valid', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '999', true);
      expect(result.error).toBe('BOOK_NOT_FOUND');
    });

    test('mengembalikan OUT_OF_STOCK jika stok buku 0', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '3', true);
      expect(result.error).toBe('OUT_OF_STOCK');
    });

    test('mengembalikan ALREADY_IN_CART jika buku sudah ada di keranjang', () => {
      const existingCart = [SAMPLE_BOOKS[0]]; // Buku id '1'
      const result = addToCartLogic(existingCart, SAMPLE_BOOKS, '1', true);
      expect(result.error).toBe('ALREADY_IN_CART');
    });

    test('TIDAK memutasi array keranjang asli (immutability)', () => {
      const originalCart = [SAMPLE_BOOKS[0]];
      const cartCopy = [...originalCart];
      addToCartLogic(originalCart, SAMPLE_BOOKS, '2', true);
      expect(originalCart).toEqual(cartCopy);
      expect(originalCart).toHaveLength(1);
    });

    test('panjang keranjang bertambah 1 setelah berhasil menambahkan', () => {
      const cart = [SAMPLE_BOOKS[0]];
      const result = addToCartLogic(cart, SAMPLE_BOOKS, '2', true);
      expect(result.cart).toHaveLength(cart.length + 1);
    });

    test('mengembalikan LOGIN_REQUIRED bahkan jika bookId valid', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '2', false);
      expect(result.error).toBe('LOGIN_REQUIRED');
      // Cart dikembalikan apa adanya
      expect(result.cart).toEqual([]);
    });

    test('menambahkan buku dengan harga string tanpa masalah', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '7', true);
      expect(result.error).toBeNull();
      expect(result.cart[0].price).toBe('115000');
    });

    test('bisa menambahkan beberapa buku berbeda secara berturut-turut', () => {
      let { cart } = addToCartLogic([], SAMPLE_BOOKS, '1', true);
      ({ cart } = addToCartLogic(cart, SAMPLE_BOOKS, '2', true));
      ({ cart } = addToCartLogic(cart, SAMPLE_BOOKS, '4', true));
      expect(cart).toHaveLength(3);
      expect(cart.map(b => b.id)).toEqual(['1', '2', '4']);
    });

    test('mengembalikan referensi cart yang sama pada error (tidak membuat array baru)', () => {
      const originalCart = [];
      const result = addToCartLogic(originalCart, SAMPLE_BOOKS, '999', true);
      expect(result.cart).toBe(originalCart);
    });

    test('menangani allBooks kosong dengan benar', () => {
      const result = addToCartLogic([], [], '1', true);
      expect(result.error).toBe('BOOK_NOT_FOUND');
    });

    test('cek prioritas error: LOGIN_REQUIRED sebelum BOOK_NOT_FOUND', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '999', false);
      expect(result.error).toBe('LOGIN_REQUIRED');
    });

    test('bookId bertipe string cocok dengan id string di allBooks', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '4', true);
      expect(result.error).toBeNull();
      expect(result.cart[0].title).toBe('Atomic Habits');
    });

    test('bookId number TIDAK cocok dengan id string (strict equality)', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, 1, true);
      // id di SAMPLE_BOOKS adalah string '1', sehingga find gagal
      expect(result.error).toBe('BOOK_NOT_FOUND');
    });

    test('mengembalikan objek buku lengkap di keranjang', () => {
      const result = addToCartLogic([], SAMPLE_BOOKS, '2', true);
      expect(result.cart[0]).toEqual(SAMPLE_BOOKS[1]);
    });
  });

  // ----- removeFromCartLogic -----

  describe('removeFromCartLogic', () => {
    test('menghapus buku yang benar dari keranjang', () => {
      const cart = [SAMPLE_BOOKS[0], SAMPLE_BOOKS[1]];
      const result = removeFromCartLogic(cart, '1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    test('mengembalikan array sama jika bookId tidak ditemukan', () => {
      const cart = [SAMPLE_BOOKS[0]];
      const result = removeFromCartLogic(cart, '999');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    test('TIDAK memutasi array asli', () => {
      const cart = [SAMPLE_BOOKS[0], SAMPLE_BOOKS[1]];
      const cartCopy = [...cart];
      removeFromCartLogic(cart, '1');
      expect(cart).toEqual(cartCopy);
      expect(cart).toHaveLength(2);
    });

    test('menangani keranjang kosong tanpa error', () => {
      const result = removeFromCartLogic([], '1');
      expect(result).toEqual([]);
    });

    test('menghapus satu-satunya item di keranjang menghasilkan array kosong', () => {
      const cart = [SAMPLE_BOOKS[0]];
      const result = removeFromCartLogic(cart, '1');
      expect(result).toHaveLength(0);
    });

    test('hanya menghapus item pertama yang cocok (filter menghapus semua duplikat)', () => {
      // Simulasi: buku duplikat dengan id yang sama
      const cart = [SAMPLE_BOOKS[0], { ...SAMPLE_BOOKS[0] }];
      const result = removeFromCartLogic(cart, '1');
      // filter menghapus SEMUA item dengan id '1'
      expect(result).toHaveLength(0);
    });
  });

  // ----- calculateCartTotal -----

  describe('calculateCartTotal', () => {
    test('menjumlahkan harga dengan benar', () => {
      const cart = [SAMPLE_BOOKS[0], SAMPLE_BOOKS[1]];
      expect(calculateCartTotal(cart)).toBe(75000 + 90000);
    });

    test('mengembalikan 0 untuk keranjang kosong', () => {
      expect(calculateCartTotal([])).toBe(0);
    });

    test('menangani harga bertipe string dengan mengkonversi ke Number', () => {
      const cart = [SAMPLE_BOOKS[6]]; // price = '115000'
      expect(calculateCartTotal(cart)).toBe(115000);
    });

    test('menghitung total untuk satu item saja', () => {
      const cart = [SAMPLE_BOOKS[3]]; // Atomic Habits, 99000
      expect(calculateCartTotal(cart)).toBe(99000);
    });

    test('menghitung total semua sample books', () => {
      const total = calculateCartTotal(SAMPLE_BOOKS);
      const expected = 75000 + 90000 + 82000 + 99000 + 120000 + 150000 + 115000;
      expect(total).toBe(expected);
    });

    test('menangani campuran harga number dan string', () => {
      const cart = [
        { price: 50000 },
        { price: '30000' },
        { price: 20000 },
      ];
      expect(calculateCartTotal(cart)).toBe(100000);
    });
  });

  // ----- formatPrice -----

  describe('formatPrice', () => {
    test('memformat harga dengan benar menggunakan pemisah ribuan', () => {
      const result = formatPrice(150000);
      // id-ID menggunakan titik sebagai pemisah ribuan
      expect(result).toBe('Rp.150.000');
    });

    test('menangani harga nol', () => {
      expect(formatPrice(0)).toBe('Rp.0');
    });

    test('menangani input string', () => {
      const result = formatPrice('99000');
      expect(result).toBe('Rp.99.000');
    });

    test('memformat harga jutaan dengan benar', () => {
      const result = formatPrice(1500000);
      expect(result).toBe('Rp.1.500.000');
    });

    test('memformat harga ratusan tanpa pemisah', () => {
      expect(formatPrice(500)).toBe('Rp.500');
    });

    test('menangani angka desimal', () => {
      const result = formatPrice(75000.5);
      // toLocaleString('id-ID') akan menampilkan desimal dengan koma
      expect(result).toContain('Rp.');
      expect(result).toContain('75');
    });
  });
});

// ============================================================
// 2. SEARCH / FILTER LOGIC TESTS
// ============================================================

describe('Search / Filter Logic', () => {
  describe('filterBooks', () => {
    test('mengembalikan semua buku ketika query kosong (string kosong)', () => {
      const result = filterBooks(SAMPLE_BOOKS, '');
      expect(result).toEqual(SAMPLE_BOOKS);
    });

    test('mengembalikan semua buku ketika query null', () => {
      const result = filterBooks(SAMPLE_BOOKS, null);
      expect(result).toEqual(SAMPLE_BOOKS);
    });

    test('mengembalikan semua buku ketika query undefined', () => {
      const result = filterBooks(SAMPLE_BOOKS, undefined);
      expect(result).toEqual(SAMPLE_BOOKS);
    });

    test('memfilter berdasarkan judul buku', () => {
      const result = filterBooks(SAMPLE_BOOKS, 'Laskar Pelangi');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Laskar Pelangi');
    });

    test('memfilter berdasarkan nama penulis', () => {
      const result = filterBooks(SAMPLE_BOOKS, 'Pramoedya');
      expect(result).toHaveLength(1);
      expect(result[0].author).toContain('Pramoedya');
    });

    test('memfilter berdasarkan genre', () => {
      const result = filterBooks(SAMPLE_BOOKS, 'Sejarah');
      expect(result).toHaveLength(2);
      result.forEach(b => expect(b.genre).toBe('Sejarah'));
    });

    test('pencarian case-insensitive', () => {
      const result = filterBooks(SAMPLE_BOOKS, 'atomic habits');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Atomic Habits');
    });

    test('mengembalikan array kosong jika tidak ada yang cocok', () => {
      const result = filterBooks(SAMPLE_BOOKS, 'xxxTidakAdaxxx');
      expect(result).toHaveLength(0);
    });

    test('menghilangkan whitespace dari query (trim)', () => {
      const result = filterBooks(SAMPLE_BOOKS, '  Sapiens  ');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Sapiens');
    });

    test('menangani partial match (kecocokan sebagian)', () => {
      const result = filterBooks(SAMPLE_BOOKS, 'Clean');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Clean Code');
    });

    test('mengembalikan banyak hasil yang cocok secara parsial genre', () => {
      const result = filterBooks(SAMPLE_BOOKS, 'self');
      // 'Self-Help' cocok 2 buku
      expect(result).toHaveLength(2);
    });

    test('query hanya whitespace mengembalikan semua buku', () => {
      const result = filterBooks(SAMPLE_BOOKS, '   ');
      expect(result).toEqual(SAMPLE_BOOKS);
    });

    test('menangani array buku kosong', () => {
      const result = filterBooks([], 'Laskar');
      expect(result).toEqual([]);
    });
  });
});

// ============================================================
// 3. BOOK SORTING LOGIC TESTS (New Arrivals)
// ============================================================

describe('Book Sorting / New Arrivals', () => {
  describe('getNewArrivals', () => {
    test('mengembalikan buku terbaru terlebih dahulu (ID terbesar)', () => {
      const result = getNewArrivals(SAMPLE_BOOKS);
      expect(result[0].id).toBe('7');
      expect(result[1].id).toBe('6');
      expect(result[2].id).toBe('5');
    });

    test('mengembalikan maksimal 5 buku secara default', () => {
      const result = getNewArrivals(SAMPLE_BOOKS);
      expect(result).toHaveLength(5);
    });

    test('mengembalikan jumlah kustom jika count ditentukan', () => {
      const result = getNewArrivals(SAMPLE_BOOKS, 3);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('7');
    });

    test('TIDAK memutasi array asli', () => {
      const booksCopy = [...SAMPLE_BOOKS];
      getNewArrivals(SAMPLE_BOOKS);
      expect(SAMPLE_BOOKS).toEqual(booksCopy);
    });

    test('menangani array kosong', () => {
      const result = getNewArrivals([]);
      expect(result).toEqual([]);
    });

    test('menangani array lebih kecil dari count (tidak error)', () => {
      const smallBooks = SAMPLE_BOOKS.slice(0, 2); // hanya 2 buku
      const result = getNewArrivals(smallBooks, 5);
      expect(result).toHaveLength(2);
    });

    test('count = 1 mengembalikan hanya buku terbaru', () => {
      const result = getNewArrivals(SAMPLE_BOOKS, 1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('7');
    });

    test('count = 0 mengembalikan array kosong', () => {
      const result = getNewArrivals(SAMPLE_BOOKS, 0);
      expect(result).toEqual([]);
    });

    test('mengurutkan ID string secara numerik, bukan leksikografis', () => {
      const booksWithBigIds = [
        { id: '9', title: 'Nine' },
        { id: '10', title: 'Ten' },
        { id: '2', title: 'Two' },
      ];
      const result = getNewArrivals(booksWithBigIds, 3);
      // Numerik: 10 > 9 > 2
      expect(result[0].id).toBe('10');
      expect(result[1].id).toBe('9');
      expect(result[2].id).toBe('2');
    });
  });
});

// ============================================================
// 4. IMAGE URL LOGIC TESTS
// ============================================================

describe('Image URL Resolution', () => {
  describe('resolveImageUrl', () => {
    test('mengembalikan URL http apa adanya', () => {
      const book = { title: 'Test', imageUrl: 'http://example.com/cover.jpg' };
      expect(resolveImageUrl(book)).toBe('http://example.com/cover.jpg');
    });

    test('mengembalikan URL https apa adanya', () => {
      const book = { title: 'Test', imageUrl: 'https://cdn.example.com/cover.jpg' };
      expect(resolveImageUrl(book)).toBe('https://cdn.example.com/cover.jpg');
    });

    test('mengembalikan path img/ apa adanya', () => {
      const book = { title: 'Test', imageUrl: 'img/cover.jpg' };
      expect(resolveImageUrl(book)).toBe('img/cover.jpg');
    });

    test('mengembalikan path image/ apa adanya (bukan image/table.png)', () => {
      const book = { title: 'Test', imageUrl: 'image/custom.png' };
      expect(resolveImageUrl(book)).toBe('image/custom.png');
    });

    test('mengembalikan data: URL apa adanya', () => {
      const book = { title: 'Test', imageUrl: 'data:image/png;base64,abc123' };
      expect(resolveImageUrl(book)).toBe('data:image/png;base64,abc123');
    });

    test('menghasilkan placeholder untuk "image/table.png" (default fallback)', () => {
      const book = { title: 'Sapiens', imageUrl: 'image/table.png' };
      const result = resolveImageUrl(book);
      expect(result).toContain('placehold.co');
      expect(result).toContain('Sapiens');
    });

    test('menghasilkan placeholder untuk imageUrl undefined', () => {
      const book = { title: 'Clean Code', imageUrl: undefined };
      const result = resolveImageUrl(book);
      expect(result).toContain('placehold.co');
      expect(result).toContain('Clean+Code');
    });

    test('menghasilkan placeholder untuk imageUrl null', () => {
      const book = { title: 'My Book', imageUrl: null };
      const result = resolveImageUrl(book);
      expect(result).toContain('placehold.co');
    });

    test('menghasilkan placeholder untuk imageUrl string kosong', () => {
      const book = { title: 'My Book', imageUrl: '' };
      const result = resolveImageUrl(book);
      expect(result).toContain('placehold.co');
    });

    test('placeholder menyertakan judul buku yang ter-encode', () => {
      const book = { title: 'Bumi Manusia', imageUrl: undefined };
      const result = resolveImageUrl(book);
      expect(result).toContain('Bumi+Manusia');
    });

    test('placeholder meng-encode karakter spesial di judul', () => {
      const book = { title: 'C++ & Java', imageUrl: undefined };
      const result = resolveImageUrl(book);
      expect(result).toContain('placehold.co');
      // Karakter khusus harus ter-encode
      expect(result).not.toContain(' ');
    });

    test('menghasilkan placeholder dengan warna yang benar', () => {
      const book = { title: 'Test', imageUrl: undefined };
      const result = resolveImageUrl(book);
      expect(result).toContain('089da1');
      expect(result).toContain('ffffff');
    });
  });
});

// ============================================================
// 5. BORROW DURATION VALIDATION TESTS
// ============================================================

describe('Borrow Duration Validation', () => {
  describe('validateBorrowDuration', () => {
    test('valid untuk bilangan bulat positif', () => {
      const result = validateBorrowDuration('5');
      expect(result).toEqual({ valid: true, duration: 5 });
    });

    test('mengembalikan CANCELLED untuk null (user membatalkan prompt)', () => {
      const result = validateBorrowDuration(null);
      expect(result).toEqual({ valid: false, reason: 'CANCELLED' });
    });

    test('mengembalikan INVALID untuk string non-numerik', () => {
      const result = validateBorrowDuration('abc');
      expect(result).toEqual({ valid: false, reason: 'INVALID' });
    });

    test('mengembalikan INVALID untuk nol', () => {
      const result = validateBorrowDuration('0');
      expect(result).toEqual({ valid: false, reason: 'INVALID' });
    });

    test('mengembalikan INVALID untuk angka negatif', () => {
      const result = validateBorrowDuration('-3');
      expect(result).toEqual({ valid: false, reason: 'INVALID' });
    });

    test('meng-parse string angka dengan benar', () => {
      const result = validateBorrowDuration('1440');
      expect(result.valid).toBe(true);
      expect(result.duration).toBe(1440);
    });

    test('mengembalikan INVALID untuk string kosong', () => {
      const result = validateBorrowDuration('');
      expect(result).toEqual({ valid: false, reason: 'INVALID' });
    });

    test('meng-parse angka desimal dan mengambil bagian integer saja', () => {
      // parseInt('5.9') => 5
      const result = validateBorrowDuration('5.9');
      expect(result.valid).toBe(true);
      expect(result.duration).toBe(5);
    });

    test('mengembalikan INVALID untuk spasi saja', () => {
      const result = validateBorrowDuration('   ');
      expect(result).toEqual({ valid: false, reason: 'INVALID' });
    });

    test('valid untuk string "1" (durasi minimum)', () => {
      const result = validateBorrowDuration('1');
      expect(result).toEqual({ valid: true, duration: 1 });
    });

    test('valid untuk durasi besar', () => {
      const result = validateBorrowDuration('99999');
      expect(result).toEqual({ valid: true, duration: 99999 });
    });
  });
});

// ============================================================
// 6. MARKDOWN FORMATTER TESTS
// ============================================================

describe('Markdown Formatter', () => {
  describe('formatMarkdown', () => {
    test('mengkonversi **bold** menjadi <strong>', () => {
      expect(formatMarkdown('Ini **tebal** ya')).toBe('Ini <strong>tebal</strong> ya');
    });

    test('mengkonversi *italic* menjadi <em>', () => {
      expect(formatMarkdown('Ini *miring* teks')).toBe('Ini <em>miring</em> teks');
    });

    test('mengkonversi `code` menjadi <code>', () => {
      expect(formatMarkdown('Gunakan `npm install`')).toBe('Gunakan <code>npm install</code>');
    });

    test('mengkonversi newline menjadi <br>', () => {
      expect(formatMarkdown('Baris 1\nBaris 2')).toBe('Baris 1<br>Baris 2');
    });

    test('menangani beberapa format dalam satu string', () => {
      const input = '**Judul**: *deskripsi* dan `kode`\nBaris baru';
      const expected = '<strong>Judul</strong>: <em>deskripsi</em> dan <code>kode</code><br>Baris baru';
      expect(formatMarkdown(input)).toBe(expected);
    });

    test('mengembalikan teks polos tanpa perubahan jika tidak ada formatting', () => {
      const plain = 'Ini teks biasa tanpa format';
      expect(formatMarkdown(plain)).toBe(plain);
    });

    test('menangani bold dan italic berdampingan', () => {
      const input = '**bold** lalu *italic*';
      const expected = '<strong>bold</strong> lalu <em>italic</em>';
      expect(formatMarkdown(input)).toBe(expected);
    });

    test('menangani beberapa inline code', () => {
      const input = '`a` dan `b`';
      const expected = '<code>a</code> dan <code>b</code>';
      expect(formatMarkdown(input)).toBe(expected);
    });

    test('menangani beberapa newline berturut-turut', () => {
      const input = 'A\n\nB\n\n\nC';
      const expected = 'A<br><br>B<br><br><br>C';
      expect(formatMarkdown(input)).toBe(expected);
    });

    test('menangani string kosong', () => {
      expect(formatMarkdown('')).toBe('');
    });

    test('bold di dalam kalimat panjang', () => {
      const input = 'Halo, selamat datang di **Toko E-Book** kami!';
      const expected = 'Halo, selamat datang di <strong>Toko E-Book</strong> kami!';
      expect(formatMarkdown(input)).toBe(expected);
    });
  });
});

// ============================================================
// 7. EDGE CASES & INTEGRATION MINI-TESTS
// ============================================================

describe('Edge Cases & Integration', () => {
  test('keranjang penuh lalu dihitung totalnya', () => {
    let cart = [];
    const ids = ['1', '2', '4', '7']; // buku-buku dengan stok > 0
    for (const id of ids) {
      const result = addToCartLogic(cart, SAMPLE_BOOKS, id, true);
      cart = result.cart;
    }
    expect(cart).toHaveLength(4);
    const total = calculateCartTotal(cart);
    expect(total).toBe(75000 + 90000 + 99000 + 115000);
  });

  test('tambah lalu hapus buku, lalu hitung total', () => {
    let { cart } = addToCartLogic([], SAMPLE_BOOKS, '1', true);
    ({ cart } = addToCartLogic(cart, SAMPLE_BOOKS, '2', true));
    cart = removeFromCartLogic(cart, '1');
    expect(calculateCartTotal(cart)).toBe(90000);
  });

  test('filter buku lalu ambil new arrivals dari hasil filter', () => {
    const filtered = filterBooks(SAMPLE_BOOKS, 'Sejarah');
    const arrivals = getNewArrivals(filtered, 2);
    expect(arrivals).toHaveLength(2);
    // Yang ID lebih besar duluan
    expect(Number(arrivals[0].id)).toBeGreaterThan(Number(arrivals[1].id));
  });

  test('resolveImageUrl bekerja untuk semua sample books', () => {
    SAMPLE_BOOKS.forEach(book => {
      const url = resolveImageUrl(book);
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });
  });

  test('formatPrice lalu bandingkan dengan total keranjang', () => {
    const cart = [SAMPLE_BOOKS[0], SAMPLE_BOOKS[1]];
    const total = calculateCartTotal(cart);
    const formatted = formatPrice(total);
    expect(formatted).toBe('Rp.165.000');
  });
});
