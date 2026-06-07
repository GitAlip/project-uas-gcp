# Catatan Percakapan: Konfigurasi Chatbot GCP & Analisis Billing (UAS 2026)

Dokumen ini berisi rangkuman diskusi kita mengenai integrasi chatbot menggunakan Google Cloud Platform (GCP) terbaru per Juni 2026 untuk membantu kelancaran UAS/UTS E-Book Store Anda.

---

## 1. Konteks Platform Agen GCP Terbaru (2026)
* Google telah mengonsolidasikan layanan pembuatan chatbot (seperti *Vertex AI Agent Builder*, Dialogflow CX, dan Agentspace) ke dalam satu payung baru bernama **Gemini Enterprise Agent Platform** (diumumkan pada Google Cloud Next '26, April 2026).
* Di dalamnya terdapat **Agent Studio** (low-code visual), **Agent Development Kit / ADK** (code-first), dan **Agent Engine** (serverless runtime).

---

## 2. Analisis Saldo & Biaya (Berdasarkan [biling_gcp.png](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/biling_gcp.png))
Akun Anda saat ini berada dalam status **Free Trial** dan memiliki tiga alokasi kredit gratis (tidak menagih kartu kredit Anda):
1. **Trial for Gen App Builder**: **Rp17.242.501,00** (Kredit promosi khusus untuk Vertex AI Agent Builder / Gemini Enterprise Agent Platform).
2. **Dialogflow CX Trial**: **Rp10.345.501,00** (Kredit promosi khusus untuk Dialogflow CX).
3. **Free Trial Umum**: **Sisa Rp4.035.208,56** (Untuk billing dasar seperti Cloud Run, Cloud SQL MySQL, dan Artifact Registry).

**Kesimpulan Biaya:** Penggunaan chatbot berbasis agen (Opsi B) **100% GRATIS** untuk Anda karena tagihannya akan langsung memotong saldo promosi khusus AI Anda (total Rp27,5 juta) tanpa memotong saldo Free Trial umum Anda.

---

## 3. Pilihan Penerapan Chatbot (Opsi B)
Karena saldo Anda mendukung penuh penggunaan platform agen GCP, berikut dua cara yang dapat dipilih:

### Cara 1: Instan (Google Web Widget)
* **Penerapan:** Menempelkan kode `<df-messenger>` dari GCP Console langsung ke [index.html](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/index.html).
* **Efek UI:** Muncul tombol bubble chat melayang default di pojok kanan bawah. UI kustom chatbox bawaan web saat ini perlu disembunyikan/dihapus agar tidak tumpang tindih.

### Cara 2: Hybrid (API Agent + Custom UI Website)
* **Penerapan:** Tetap menggunakan UI chatbox kustom yang sudah ada di website. Namun, backend Anda ([backend/server.js](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/backend/server.js)) akan diubah agar melakukan *request* ke API Agen di GCP, bukan langsung memanggil raw model Gemini.
* **Efek UI:** Tampilan chatbox website Anda tetap terlihat konsisten dengan tema web Anda (tidak berubah), namun mesin kecerdasannya di belakang layar ditenagai oleh Agen GCP Anda.

---

## 4. Langkah Selanjutnya Saat Anda Kembali
Ketika Anda login kembali, silakan pilih salah satu dari opsi di atas:
1. **Jika memilih Cara 1 (Instan):** Kita akan menonaktifkan kode UI chat di [script.js](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/script.js) dan menyematkan skrip widget melayang di [index.html](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/index.html).
2. **Jika memilih Cara 2 (Hybrid):** Kita akan menyesuaikan rute `/api/chat` di [backend/server.js](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/backend/server.js) untuk menghubungkannya ke API Agent Builder / Dialogflow CX GCP Anda.

---

## 5. Implementasi & Hasil Keberhasilan (6 Juni 2026)

Semua langkah migrasi untuk **Opsi B (Instant Web Widget)** telah berhasil diselesaikan secara penuh dengan detail sebagai berikut:

### A. Integrasi Widget Chatbot di Frontend
* **Integrasi HTML**: Menyematkan widget `<df-messenger>` secara langsung di [index.html](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/index.html) tepat sebelum tag `</body>` dan menyembunyikan widget chatbox kustom lama.
* **Auto-Reset Percakapan**: Menambahkan atribut `storage-option="none"` dan script event listener `df-chat-open-changed` pada frontend. Hasilnya, setiap kali balon chat ditutup oleh pengguna atau halaman di-reload, riwayat percakapan lama akan langsung dihapus bersih dan sesi dimulai kembali dari awal.
* **Perbaikan Tampilan Navbar**: Menambahkan properti `top: 0;` di berkas [style.css](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/style.css) pada `.section nav` untuk memperbaiki celah kosong (spacing) di atas navbar, membuatnya merapat sempurna ke atas layar.

### B. Konfigurasi Cloud SQL & Perbaikan Koneksi Database
* **Menyalakan Database**: Instance Cloud SQL bernama `ebookstore` yang sebelumnya berstatus `STOPPED` telah berhasil dinyalakan kembali ke status `ALWAYS` (Running).
* **Pembuatan User Database**: Membuat user database `db_user` dengan password `Alip123_` di panel Cloud SQL, karena sebelumnya user ini belum terdaftar dan menyebabkan masalah *access denied*.
* **Penyelesaian Autentikasi Cleartext**: Mengaktifkan setelan `enableCleartextPlugin: true` pada berkas [backend/database.js](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/backend/database.js) untuk meloloskan enkripsi otentikasi kata sandi melalui koneksi UNIX Socket aman di Cloud Run.

### C. Deployment Ulang ke Google Cloud Run
* **Kompilasi & Publikasi**: Membangun ulang image Docker menggunakan **Google Cloud Build** dan melakukan deployment ke **Cloud Run** (`ebookstore-app`). Service URL aktif: `https://ebookstore-app-1047421347297.asia-southeast2.run.app`.

### D. Konfigurasi Generative Playbook & OpenAPI Tools (Dialogflow CX)
* **OpenAPI Tool Creation**: Membuat kustom tool berbasis OpenAPI 3.0 bernama **`get_books_tool`** yang dipetakan langsung ke endpoint `/api/books` di Cloud Run.
* **Playbook Instruction Injection**: Memperbarui instruksi pada **Default Generative Playbook** di Dialogflow CX agar model Gemini memanggil `get_books_tool` secara otomatis setiap kali mendeteksi pertanyaan user terkait jumlah buku atau daftar katalog.
* **Hasil Pengujian Akhir**: Sukses besar! Chatbot kini terbukti mampu menjawab pertanyaan secara dinamis (seperti *"ada berapa buku saat ini"*) dengan mengambil data buku langsung secara real-time dari database Cloud SQL MySQL.

---

## 6. Pembaruan dan Integrasi Sistem Notifikasi & Optimalisasi GCP (6 Juni 2026)

### A. Penyelarasan API & Hasil Lolos Pengujian Unit (100% PASS)
* **Penyelarasan Endpoint**: Menambahkan rute plural (`/api/purchases/checkout`, `/api/purchases/my-books`, `/api/borrows`, `/api/borrows/my-borrows`) dan rute `/api/status` di [backend/server.js](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/backend/server.js) untuk mencocokkan apa yang dipanggil oleh frontend (`script.js` & `mybooks.html`) dan test suite.
* **Pengujian 100% Hijau**: Menjalankan kembali unit test Jest dengan hasil 4 test suites dan **269 unit tests lulus sepenuhnya (100% PASS)** tanpa ada satu pun error.

### B. Integrasi Custom Toast Notification System
* **Notifikasi Modern**: Mengganti dialog browser `alert()` yang kaku dengan Custom Toast Notification modern di file [toast.js](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/toast.js) yang memanfaatkan efek glassmorphism, FontAwesome icons, dan animasi masuk/keluar yang dinamis.
* **Penyimpanan Antrean Lintas Halaman**: Menggunakan `sessionStorage` untuk menyimpan pesan selamat datang (login), selamat tinggal (logout), peminjaman berhasil, atau checkout sukses agar dapat dimuat dengan lancar setelah pengalihan halaman (*redirect*).
* **Pembaruan Berkas Proyek**: Menghubungkan skrip `toast.js` ke seluruh berkas HTML utama (`index.html`, `mybooks.html`, `login/login&register.html`, dan `admin/dashboard.html`) serta mendaftarkannya pada [Dockerfile](file:///C:/Users/HP/Documents/semester_6/gcp/project%20UTS%20Web/Dockerfile) agar tersalin ke server produksi.

### C. Manajemen Biaya Cloud SQL & Cloud Run
* **Status Cloud SQL (Stopped)**: Demi mencegah membengkaknya tagihan/billing GCP selama masa tunggu UAS, instance Cloud SQL MySQL bernama `ebookstore` telah dinonaktifkan sementara (disetel ke status `NEVER` active). Data di dalamnya tetap aman dan tidak terhapus.
* **Status Cloud Run (Tetap Online/Free)**: Layanan Cloud Run (`ebookstore-app`) dibiarkan tetap online karena memiliki fitur *scale-to-zero* (secara otomatis menurunkan instance ke 0 ketika tidak ada kunjungan), sehingga biayanya dijamin Rp 0 ketika tidak diakses.

