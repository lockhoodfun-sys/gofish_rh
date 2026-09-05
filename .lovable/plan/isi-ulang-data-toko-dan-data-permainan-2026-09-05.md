# Isi ulang data toko dan data permainan

## Apa yang terjadi

Ketiga toko (pancing Old Bram, umpan Pip, perahu Captain Vex) terbuka normal, tapi isinya kosong. Penyebabnya bukan tampilan: permintaan data ke server sudah berhasil (status 200) tetapi mengembalikan daftar kosong.

Pengecekan langsung ke basis data menunjukkan semua tabel daftar barang dan aturan permainan masih nol baris:

- daftar pancing, umpan, perahu: 0 baris
- jenis ikan: 0 baris
- mutasi ikan: 0 baris

Jadi rak tokonya memang benar-benar kosong. Saat proyek dipindahkan ke backend baru, hanya struktur tabelnya yang ikut terbawa, sedangkan isi datanya tidak.

Dampak lain yang sama sebabnya: ikan tidak punya nama/harga, mutasi dan efek cuaca tidak berlaku, perlengkapan awal pemain baru tidak bisa diberikan (karena tidak ada barang termurah untuk dipilih), dan koin hasil jual bisa salah hitung.

## Rencana perbaikan

1. Memasukkan kembali seluruh data awal permainan ke basis data, diambil dari berkas data asli yang masih ada di dalam proyek:
   - jenis ikan beserta bobot, kelangkaan, dan harga per kg
   - bobot kelangkaan dasar, mutasi, efek cuaca, siklus cuaca, dan pengaturan permainan
2. Memasukkan katalog toko lengkap: 6 pancing, 6 umpan, 6 perahu, beserta harga, kecepatan, keberuntungan, dan urutan tampil.
3. Memberikan perlengkapan awal (pancing, umpan, perahu paling dasar) kepada akun pemain yang sudah ada, supaya ada yang terpasang sejak awal.
4. Menguji langsung di pratinjau: buka ketiga toko, pastikan daftar barang muncul dengan harga, tombol beli dan pasang berfungsi, lalu pastikan nama ikan dan harga jual tampil benar.

## Catatan teknis

- Data dimasukkan lewat satu migrasi berisi pernyataan INSERT idempoten (ON CONFLICT DO NOTHING/DO UPDATE) untuk tabel: fish_species, rarity_base_weights, mutations, weather_effects, weather_cycle_config, game_config, rod_tiers, bait_tiers, boat_tiers.
- Sumber nilai: drizzle/migrations/0001_seed_gameplay_and_xp.sql dan 0004_gofish_gear_columns_and_catalog.sql (0004 menimpa nilai 0001 untuk rod/bait, jadi urutannya dipertahankan).
- Setelah data masuk, panggil ensure_starter_gear untuk dompet yang sudah punya profil.
- Tidak ada perubahan kode antarmuka; komponen RodShop/BaitShop/BoatShop sudah benar.
