# Pulihkan Shop dan Pastikan Boat Benar-Benar Berganti

## Temuan terverifikasi

- Database aktif saat ini kosong: `rod_tiers`, `bait_tiers`, `boat_tiers`, serta seluruh tabel kepemilikan gear masing-masing berisi 0 baris. Ini penyebab langsung ketiga shop kosong.
- Repo memang memiliki data katalog enam rod, enam bait, dan enam boat di migrasi `0004`, tetapi data itu tidak ada di database hasil remix saat ini.
- Fungsi shop tersedia di database aktif, tetapi definisinya tidak tersimpan di rangkaian migrasi repo. Clone/remix baru karena itu tidak dapat membangun sistem shop lengkap hanya dari source code.
- Keenam model boat lokal tersedia, valid sebagai GLB, memiliki isi/hash berbeda, dan sudah dilacak Git. Kode render sudah memilih model berdasarkan boat aktif dan memakai key boat untuk mengganti hull.
- Posisi tambat boat `(22.6, 73.2)` memang berada di samping boardwalk yang terletak sekitar `(19.4, 69.95)`.
- Audio gameplay masih menggunakan pointer CDN meskipun salinan lokal tersedia; ini masih berisiko hilang saat dijalankan di luar Lovable.

## Perubahan yang akan dibuat

### 1. Pulihkan semua shop tanpa merusak data pemain

- Isi kembali katalog asli: 6 rod, 6 bait, dan 6 boat dengan ID, harga, statistik, dan urutan yang sudah digunakan aplikasi.
- Gunakan upsert berdasarkan ID, bukan `DELETE`, sehingga data kepemilikan pemain tidak ikut terhapus dan foreign key tidak rusak.
- Jalankan pemulihan katalog pada database aktif dan pastikan tiap katalog berisi tepat enam item.

### 2. Lengkapi migrasi agar remix/clone dapat berdiri sendiri

- Tambahkan migrasi lanjutan yang idempotent untuk seluruh fungsi shop yang saat ini hanya ada di database: daftar, beli, equip, dan starter gear untuk rod/bait/boat.
- Simpan seed katalog idempotent di repo dan tambahkan perintah setup yang jelas agar clone lokal dapat menerapkan schema, fungsi, dan data yang sama.
- Kunci akses fungsi shop agar hanya server game yang dapat menjalankannya; browser tetap melewati verifikasi wallet yang sudah ada.
- Perbarui petunjuk setup lokal dengan langkah instalasi, konfigurasi database, migrasi, dan menjalankan game.

### 3. Pastikan pergantian boat hanya menampilkan boat terpilih

- Pertahankan satu objek boat di scene, lalu gunakan `equippedId` sebagai sumber tunggal model aktif.
- Setelah equip berhasil: ubah state aktif langsung, bongkar hull lama, pasang model boat yang dipilih, reset gerakan, dan pindahkan hull baru ke tambatan di samping boardwalk.
- Setelah refresh/reconnect: baca boat aktif dari database dan tampilkan model yang sama, bukan kembali ke starter.
- Jika model tertentu gagal dimuat, tampilkan error yang jelas dan jangan diam-diam menampilkan starter sehingga status shop dan boat di air tidak bertentangan.

### 4. Hilangkan ketergantungan aset gameplay yang rapuh

- Pastikan seluruh model dunia, ikan, dan keenam boat memakai file lokal yang dilacak repo.
- Alihkan audio aktif dari pointer CDN ke salinan lokal yang sudah ada.
- Audit semua referensi runtime agar tidak ada URL aset lama/404 yang masih digunakan; pointer tak terpakai tidak akan dipakai oleh game.

### 5. Verifikasi menyeluruh dengan scope terbatas

- Verifikasi katalog rod, bait, dan boat masing-masing tampil enam item.
- Uji beli lalu equip minimal dua boat berbeda: model visual harus berubah, hull lama hilang, hanya satu boat terlihat, dan boat baru kembali ke sisi boardwalk.
- Refresh halaman/reconnect dan pastikan boat pilihan tetap aktif.
- Periksa seluruh request model/audio tidak menghasilkan 404.
- Jalankan pemeriksaan build dan uji singkat memancing/inventory agar perubahan shop/boat tidak merusak sistem lain.

## Batasan perubahan

- Tidak mengubah sistem ikan, cuaca, ekonomi, inventory, NPC lain, atau tata letak dunia selain posisi tambat boat.
- Fitur 10 juta test coins tetap dipertahankan untuk pengembangan dan ditandai wajib dihapus sebelum rilis publik.
