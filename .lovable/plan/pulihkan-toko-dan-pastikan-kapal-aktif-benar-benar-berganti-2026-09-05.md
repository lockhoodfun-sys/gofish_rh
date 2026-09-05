# Pulihkan toko dan pastikan kapal aktif benar-benar berganti

## Kondisi yang sudah dikonfirmasi
- Ketiga toko kosong karena `rod_tiers`, `bait_tiers`, dan `boat_tiers` masing-masing berisi 0 baris.
- Fungsi pembaca ketiga toko dan fungsi equip kapal masih tersedia di backend.
- Data katalog asli masih tercatat di migrasi proyek: 6 pancing, 6 umpan, dan 6 kapal.
- Tampilan kapal sudah memilih model berdasarkan kapal aktif dan model lokal berbeda sudah tersedia untuk setiap kapal.

## Perbaikan
1. Pulihkan **hanya data katalog asli** ke tiga tabel toko menggunakan operasi data yang aman dan dapat dijalankan ulang; tidak mengubah struktur tabel, fungsi jual-beli, profil, koin, inventaris ikan, atau sistem lain.
2. Pastikan starter gear diberikan hanya kepada profil yang belum memilikinya, tanpa menghapus pembelian pemain yang sudah ada.
3. Pertahankan perbaikan kapal secara terisolasi:
   - setelah `Sail this` berhasil, kapal aktif langsung berubah ke ID yang dipilih;
   - model kapal lama dilepas dan model kapal baru dirender;
   - kapal baru dikembalikan ke titik tambat di samping boardwalk;
   - refresh dari backend tidak boleh mengembalikan kapal ke starter.
4. Tambahkan penanganan kondisi kosong/error yang terlihat di dialog toko agar kegagalan data tidak lagi tampak sebagai ruang kosong tanpa penjelasan.

## Verifikasi
- Pastikan ketiga katalog masing-masing kembali berisi 6 item dan semua kartu tampil di toko.
- Uji alur beli lalu pakai kapal non-starter; konfirmasi status kapal aktif tersimpan.
- Verifikasi secara visual bahwa starter hilang, kapal pilihan muncul sebagai satu-satunya kapal, dan posisinya berada di samping boardwalk.
- Uji pancing dan umpan tetap tampil dan dapat dibeli/dipakai, untuk memastikan perubahan kapal tidak merusak toko lain.
- Jalankan pemeriksaan proyek yang relevan dan cek tidak ada error pemuatan model atau fungsi toko.

## Batasan scope
Tidak mendesain ulang toko dan tidak mengubah ekonomi, harga, gameplay memancing, profil, atau sistem lain di luar pemulihan katalog yang hilang dan pergantian kapal yang diminta.
