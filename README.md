# Checklist Pengembangan Bot Discord
> This is progress pengembangan discord botnya. Will update in here!
## 1. Onboarding & Roles
- [x] Buat menu *Dropdown* interaktif di kanal `#rules`.
- [ ] Atur logika pemberian *role* `Member` saat opsi *dropdown* "I Agree" dipilih.
- [ ] Buat desain *Welcome Embed* untuk kanal `#landing-page`.
- [ ] Atur agar *embed* terkirim otomatis ke `#landing-page` saat ada member baru masuk.
- [ ] Buat tombol interaktif (*Buttons*) di kanal `#role-assignment`.
- [ ] Atur logika *toggle* tombol untuk menambah atau mencabut *role* `Cybersecurity` & `Artificial Intelligence`.
- [ ] Pastikan balasan dari interaksi tombol *role* bersifat *ephemeral* (hanya terlihat oleh user tersebut).

## 2. Levelling & XP System
- [ ] Siapkan *database* atau sistem penyimpanan untuk melacak XP tiap member.
- [ ] Buat sistem penambahan 15 XP per pesan teks.
- [ ] Implementasikan *cooldown* 30 detik per user agar tidak bisa *spam* XP.# Checklist Pengembangan Bot Discord

## 1. Onboarding & Roles
- [x] Buat menu *Dropdown* interaktif di kanal `#rules`. (dibikin sama mas zelig)
- [ ] Atur logika pemberian *role* `Member` saat opsi *dropdown* "I Agree" dipilih.
- [ ] Buat desain *Welcome Embed* untuk kanal `#landing-page`.
- [ ] Atur agar *embed* terkirim otomatis ke `#landing-page` saat ada member baru masuk.
- [ ] Buat tombol interaktif (*Buttons*) di kanal `#role-assignment`.
- [ ] Atur logika *toggle* tombol untuk menambah atau mencabut *role* `Cybersecurity` & `Artificial Intelligence`.
- [ ] Pastikan balasan dari interaksi tombol *role* bersifat *ephemeral* (hanya terlihat oleh user tersebut).

## 2. Levelling & XP System
- [ ] Siapkan *database* atau sistem penyimpanan untuk melacak XP tiap member.
- [ ] Buat sistem penambahan 15 XP per pesan teks.
- [ ] Implementasikan *cooldown* 30 detik per user agar tidak bisa *spam* XP.
- [ ] Buat filter blokir (*blacklist*) agar pesan di kanal internal, `#bot-commands`, dan `#mini-games` tidak mendapatkan XP.
- [ ] Buat *slash command* `/rank` untuk menampilkan UI status XP, level, dan peringkat pengguna saat ini.
- [ ] Buat *slash command* `/leaderboard` untuk menampilkan top 10 member dengan XP tertinggi.
- [ ] Buat sistem pengecekan otomatis untuk memberikan *role* khusus saat user menyentuh Level 5, 15, 30, dan 50.

## 3. Events & Reminders
- [x] Buat *slash command* `/event create` dengan pembatasan akses hanya untuk `Admin` dan Staff Internal.
- [x] Integrasikan perintah tersebut dengan fitur *Server Events* bawaan API Discord.
- [x] Buat sistem penjadwalan (*scheduler*) untuk mengirim pengingat acara otomatis ke `#announcements`.
- [x] Atur *default* pengingat terkirim pada H-24 jam dan H-3 jam sebelum acara dimulai.
- [x] Tambahkan opsi parameter untuk mengatur waktu pengingat kustom dan melakukan *ping* *role* tertentu (misal: @Cybersecurity).

## 4. Tickets & Suggestions
- [x] Kirim pesan berisi tombol `[Create Ticket]` ke kanal `#support-ticket`.
- [x] Atur logika agar saat tombol diklik, bot membuat kanal teks privat baru (misal: `ticket-001`).
- [x] Setel *permissions* kanal tiket agar hanya bisa dilihat oleh pembuat tiket dan admin.
- [x] Sediakan tombol `[Close Ticket]` dan perintah `/ticket close` di dalam tiket untuk menutup/menghapus kanal tersebut.
- [x] Buat *slash command* `/suggest` untuk menerima pesan dari member di mana saja.
- [x] Atur bot agar mengirim isi saran tersebut ke `#internal-suggestions` setelah menghapus data identitas pengirimnya secara total.

## 5. Mini-Games
- [x] Buat *slash command* dan logika permainan untuk `/trivia` (dengan opsi kategori Tech/AI dan Umum).
- [x] Buat *slash command* dan logika interaksi tombol untuk `/rps` (Gunting-Batu-Kertas).
- [x] Buat *slash command* dan logika probabilitas untuk `/coinflip`.
- [ ] Buat *slash command* dan logika pengacakan kata untuk `/scramble`.
- [x] Buat filter validasi global untuk semua perintah *mini-game*.
- [x] Atur agar bot menolak perintah *game* dan mengirim pesan *error* jika digunakan di luar kanal `#mini-games`.
- [ ] Buat filter blokir (*blacklist*) agar pesan di kanal internal, `#bot-commands`, dan `#mini-games` tidak mendapatkan XP.
- [ ] Buat *slash command* `/rank` untuk menampilkan UI status XP, level, dan peringkat pengguna saat ini.
- [ ] Buat *slash command* `/leaderboard` untuk menampilkan top 10 member dengan XP tertinggi.
- [ ] Buat sistem pengecekan otomatis untuk memberikan *role* khusus saat user menyentuh Level 5, 15, 30, dan 50.

## 3. Events & Reminders
- [x] Buat *slash command* `/event create` dengan pembatasan akses hanya untuk `Admin` dan Staff Internal.
- [x] Integrasikan perintah tersebut dengan fitur *Server Events* bawaan API Discord.
- [x] Buat sistem penjadwalan (*scheduler*) untuk mengirim pengingat acara otomatis ke `#announcements`.
- [x] Atur *default* pengingat terkirim pada H-24 jam dan H-3 jam sebelum acara dimulai.
- [x] Tambahkan opsi parameter untuk mengatur waktu pengingat kustom dan melakukan *ping* *role* tertentu (misal: @Cybersecurity).

## 4. Tickets & Suggestions
- [x] Kirim pesan berisi tombol `[Create Ticket]` ke kanal `#support-ticket`.
- [x] Atur logika agar saat tombol diklik, bot membuat kanal teks privat baru (misal: `ticket-001`).
- [x] Setel *permissions* kanal tiket agar hanya bisa dilihat oleh pembuat tiket dan admin.
- [x] Sediakan tombol `[Close Ticket]` dan perintah `/ticket close` di dalam tiket untuk menutup/menghapus kanal tersebut.
- [x] Buat *slash command* `/suggest` untuk menerima pesan dari member di mana saja.
- [x] Atur bot agar mengirim isi saran tersebut ke `#internal-suggestions` setelah menghapus data identitas pengirimnya secara total.

## 5. Mini-Games
- [x] Buat *slash command* dan logika permainan untuk `/trivia` (dengan opsi kategori Tech/AI dan Umum).
- [x] Buat *slash command* dan logika interaksi tombol untuk `/rps` (Gunting-Batu-Kertas).
- [x] Buat *slash command* dan logika probabilitas untuk `/coinflip`.
- [ ] Buat *slash command* dan logika pengacakan kata untuk `/scramble`.
- [x] Buat filter validasi global untuk semua perintah *mini-game*.
- [x] Atur agar bot menolak perintah *game* dan mengirim pesan *error* jika digunakan di luar kanal `#mini-games`.
