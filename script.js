const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbyX7zLzAwPvdmy1V6DuQmk4N4l5R-jNj77F5M61Qo4EEFL8LTTBoQfLoMX9l971uU3w/exec";

let dataTamu = JSON.parse(localStorage.getItem('tamu') || '[]');
let dataKamar = JSON.parse(localStorage.getItem('kamarData') || '[]');
let dataPenerima = JSON.parse(localStorage.getItem('penerimaData') || '[]');

let editIndex = -1;
let editPenerimaIndex = -1;
let chartInstance = null;
let timerWaktu = null;

// Meminta izin pop-up notifikasi saat aplikasi pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// Fungsi pembantu untuk memunculkan notifikasi ke sistem HP
function tampilkanNotifikasiOS(judul, pesan) {
    if (Notification.permission === 'granted') {
        new Notification(judul, {
            body: pesan,
            icon: 'icons/launchericon-192x192.png', // Pastikan jalur ikon ini benar
            badge: 'icons/launchericon-128x128.png'
        });
    }
}
// kode selesai -- Meminta izin pop-up notifikasi saat aplikasi pertama kali dibuka

function showNotification(pesan) {
    let toast = document.getElementById("toast");
    toast.innerText = pesan;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

function setSyncStatus(status, icon) {
    document.getElementById('sync-status').innerHTML = `<i class="material-icons" style="font-size:16px;">${icon}</i> ${status}`;
}

async function fetchDataFromSheet() {
    setSyncStatus("Menyinkronkan...", "cloud_sync");
    if (window.AppInventor) {
        window.AppInventor.setWebViewString("GET_DATA");
    } else {
        try {
            let response = await fetch(URL_SCRIPT);
            let json = await response.json();
            prosesDataDariCloud(json);
        } catch (err) {
            setSyncStatus("Offline Mode", "cloud_off");
            refreshSemuaLayar();
        }
    }
}

//fungsi prosesDataDariCloud
function prosesDataDariCloud(json) {
    // Simpan jumlah data lama sebelum diperbarui
    let jumlahTamuLama = dataTamu.length;

    if(json.tamu) dataTamu = json.tamu;
    if(json.kamar) dataKamar = json.kamar;
    if(json.penerima) dataPenerima = json.penerima;

    // Logika Notifikasi: Jika jumlah tamu dari Cloud LEBIH BANYAK dari lokal
    if (jumlahTamuLama > 0 && dataTamu.length > jumlahTamuLama) {
        let tamuBaru = dataTamu[dataTamu.length - 1]; // Ambil data tamu terakhir
        tampilkanNotifikasiOS("Data Tamu Baru!", `${tamuBaru.nama} baru saja ditambahkan ke sistem.`);
    }

    localStorage.setItem('tamu', JSON.stringify(dataTamu));
    localStorage.setItem('kamarData', JSON.stringify(dataKamar));
    localStorage.setItem('penerimaData', JSON.stringify(dataPenerima));

    setSyncStatus("Online", "cloud_done");
    refreshSemuaLayar();
}
//akhir dari - fungsi prosesDataDariCloud

setInterval(() => {
    if (window.AppInventor) {
        let dataFromApp = window.AppInventor.getWebViewString();
        if (dataFromApp && dataFromApp.startsWith("{") && dataFromApp.includes("tamu")) {
            try {
                let json = JSON.parse(dataFromApp);
                prosesDataDariCloud(json);
                window.AppInventor.setWebViewString("");
            } catch(e) {}
        }
    }
}, 1000);

async function sendToCloud(payload) {
    setSyncStatus("Menyimpan...", "cloud_upload");
    if (window.AppInventor) {
        window.AppInventor.setWebViewString("POST|" + JSON.stringify(payload));
        showNotification("Aksi berhasil! Data sedang disimpan.");
    } else {
        try {
            await fetch(URL_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            setSyncStatus("Tersimpan", "cloud_done");
            showNotification("Aksi berhasil tersimpan di Cloud!");
            setTimeout(fetchDataFromSheet, 1500);
        } catch (err) {
            setSyncStatus("Offline (Tersimpan Lokal)", "cloud_off");
            showNotification("Tersimpan Offline. Akan dikirim saat Online.");
        }
    }
}

function refreshSemuaLayar() {
    updateDropdowns();
    renderList();
    renderKamarList();
    renderPenerimaList();
}

function now() { return new Date().toLocaleString('id-ID'); }
function startWaktuOtomatis() {
    if(timerWaktu) clearInterval(timerWaktu);
    timerWaktu = setInterval(() => {
        if (editIndex === -1 && document.getElementById('screen-form').classList.contains('active')) {
            document.getElementById('waktu').value = now();
        }
    }, 1000);
}
startWaktuOtomatis();

function updateDropdowns() {
    let selectPenerima = document.getElementById('penerima');
    let selectKamar = document.getElementById('kamar');

    selectPenerima.innerHTML = '';
    dataPenerima.forEach(p => selectPenerima.innerHTML += `<option value="${p.nama}">${p.nama}</option>`);

    selectKamar.innerHTML = '<option value="">-- Pilih Kamar --</option>';
    dataKamar.forEach(k => selectKamar.innerHTML += `<option value="${k.nama}">${k.nama}</option>`);
}

function updateHints() {
    let n = new Set(), a = new Set(), k = new Set();
    dataTamu.forEach(t => { if(t.nama) n.add(t.nama); if(t.asal) a.add(t.asal); if(t.keperluan) k.add(t.keperluan); });
    document.getElementById('hint-nama').innerHTML = Array.from(n).map(x => `<option value="${x}">`).join('');
    document.getElementById('hint-asal').innerHTML = Array.from(a).map(x => `<option value="${x}">`).join('');
    document.getElementById('hint-keperluan').innerHTML = Array.from(k).map(x => `<option value="${x}">`).join('');
}

function renderList(filteredData = null) {
    let container = document.getElementById('data-container');
    container.innerHTML = '';

    let dataToRender = filteredData ? filteredData : dataTamu;

    if (dataToRender.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #888;">Data tamu tidak ditemukan</div>';
        return;
    }

    let reversedData = [...dataToRender].reverse();

    reversedData.forEach((g) => {
        let i = dataTamu.indexOf(g);
        let isAda = (!g.status || g.status.toUpperCase() === 'ADA');
        let badgeHTML = isAda ? `<span class="badge-status badge-ada">ADA</span>` : `<span class="badge-status badge-keluar">KELUAR</span>`;
        let infoKeluarHTML = (!isAda && g.waktuKeluar) ? `<div style="margin-top:8px; padding:8px; background:var(--input-bg); border-radius:6px; font-size:13px;"><b>Waktu Keluar:</b> ${g.waktuKeluar}</div>` : '';
        let btnTeks = isAda ? "Check-Out" : "Batal Keluar";
        let btnClass = isAda ? "btn-checkout" : "btn-cancel-out";

        container.innerHTML += `
        <div class="card">
        <div class="card-header">
        <div class="card-title" style="display:flex; align-items:center;">${g.nama} ${badgeHTML}</div>
        <div style="font-size:12px; color:#888;">Masuk:<br>${g.waktu}</div>
        </div>
        <div style="font-size:14px; line-height: 1.6; margin-top: 8px;">
        <div>Penerima: <b>${g.penerima}</b> | Kamar: <b>${g.kamar || '-'}</b></div>
        <div>Pengikut: <b>${g.pengikut || '0'}</b></div>
        <div>Asal / Instansi: <b>${g.asal || '-'}</b></div>
        <div>Keperluan: <b>${g.keperluan || '-'}</b></div>
        <div>Catatan: <b>${g.catatan || '-'}</b></div>
        </div>
        ${infoKeluarHTML}
        <div class="card-actions">
        <button class="btn-action btn-edit" onclick="editData(${i})">Edit</button>
        <button class="btn-action ${btnClass}" onclick="toggleCheckout(${i})">${btnTeks}</button>
        <button class="btn-action btn-del" onclick="hapusTamu(${i})">Hapus</button>
        </div>
        </div>`;
    });

    if (!filteredData) {
        localStorage.setItem('tamu', JSON.stringify(dataTamu));
        updateHints();
        renderDashboard();
    }
}

function cariTamu() {
    let keyword = document.getElementById('search-tamu').value.toLowerCase();
    if (keyword === '') {
        renderList();
    } else {
        let hasilCari = dataTamu.filter(t =>
        (t.nama && t.nama.toLowerCase().includes(keyword)) ||
        (t.asal && t.asal.toLowerCase().includes(keyword)) ||
        (t.keperluan && t.keperluan.toLowerCase().includes(keyword))
        );
        renderList(hasilCari);
    }
}

function toggleCheckout(i) {
    let t = dataTamu[i];
    if (!t.status || t.status.toUpperCase() === 'ADA') {
        t.status = 'KELUAR';
        t.waktuKeluar = now();
    } else {
        t.status = 'ADA';
        t.waktuKeluar = '';
    }
    renderList();

    if(t.rowIndex) {
        sendToCloud({
            action: "updateGuest", rowIndex: t.rowIndex,
            waktu: t.waktu, nama: t.nama, asal: t.asal, pengikut: t.pengikut,
            kamar: t.kamar, keperluan: t.keperluan, penerima: t.penerima,
            catatan: t.catatan,
            status: t.status, waktuKeluar: t.waktuKeluar
        });
    } else {
        alert("Mohon tunggu sinkronisasi data awal selesai sebelum melakukan Check-out.");
    }
}

function renderDashboard() {
    let totalOrang = 0;
    let statusKamar = {};
    dataKamar.forEach(k => { statusKamar[k.nama] = []; });
    let kamarTerisiCount = 0;

    dataTamu.forEach(t => {
        let isAda = (!t.status || t.status.toUpperCase() === 'ADA');
        if (isAda) {
            let jumlahPengikut = parseInt(t.pengikut) || 0;
            totalOrang += (1 + jumlahPengikut);
        }
        if(t.kamar && statusKamar[t.kamar] !== undefined && isAda) {
            statusKamar[t.kamar].push(t.nama);
        }
    });

    document.getElementById('dash-total').innerText = totalOrang;

    let htmlKamar = '';
    for (let k in statusKamar) {
        let isFilled = statusKamar[k].length > 0;
        if(isFilled) kamarTerisiCount++;
        htmlKamar += `<div style="margin-bottom: 8px;"><span class="room-badge ${isFilled ? 'room-filled' : 'room-empty'}">${k}</span> <span style="font-size: 13px;">${isFilled ? `(${statusKamar[k].join(', ')})` : '(Kosong)'}</span></div>`;
    }
    document.getElementById('dash-kamar').innerText = kamarTerisiCount;
    document.getElementById('room-status-container').innerHTML = htmlKamar;

    updateChart();
}

function parseTanggalIndonesia(dateString) {
    if (!dateString) return null;
    let tanggalSaja = dateString.split(',')[0].split(' ')[0];
    let parts = tanggalSaja.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateString);
}

function resetFilterGrafik() {
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    updateChart();
}

function updateChart() {
    let startInput = document.getElementById('filter-start').value;
    let endInput = document.getElementById('filter-end').value;

    let startDate = startInput ? new Date(startInput) : null;
    let endDate = endInput ? new Date(endInput) : null;

    if (!startDate && !endDate) {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
    }

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    let countPerDay = {};

    dataTamu.forEach(t => {
        if(t.waktu) {
            let tglObj = parseTanggalIndonesia(t.waktu);

            if (tglObj) {
                let isInRange = true;
                if (startDate && tglObj < startDate) isInRange = false;
                if (endDate && tglObj > endDate) isInRange = false;

                if (isInRange) {
                    let tanggalSaja = t.waktu.split(',')[0].split(' ')[0];
                    let jumlahPengikut = parseInt(t.pengikut) || 0;
                    let totalOrang = 1 + jumlahPengikut;
                    countPerDay[tanggalSaja] = (countPerDay[tanggalSaja] || 0) + totalOrang;
                }
            }
        }
    });

    let sortedDates = Object.keys(countPerDay).sort((a, b) => {
        return parseTanggalIndonesia(a) - parseTanggalIndonesia(b);
    });

    let labelGrafik = [];
    let dataGrafik = [];

    sortedDates.forEach(tgl => {
        labelGrafik.push(tgl);
        dataGrafik.push(countPerDay[tgl]);
    });

    let ctx = document.getElementById('tamuChart').getContext('2d');
    if(chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelGrafik.length ? labelGrafik : ['Belum ada data'],
            datasets: [{
                label: 'Total Orang (Tamu + Pengikut)',
                              data: dataGrafik.length ? dataGrafik : [0],
                              backgroundColor: 'rgba(98, 0, 238, 0.5)'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                }
            }
        }
    });
}

function openForm() {
    editIndex = -1;
    document.getElementById('f').reset();
    document.getElementById('pengikut').value = 0;
    document.getElementById('waktu').value = now();
    document.getElementById('btn-submit').innerText = "SIMPAN DATA";
    switchTab('form');
}

function editData(i) {
    editIndex = i; let t = dataTamu[i];
    document.getElementById('waktu').value = t.waktu;
    document.getElementById('penerima').value = t.penerima;
    document.getElementById('nama').value = t.nama;
    document.getElementById('pengikut').value = t.pengikut;
    document.getElementById('asal').value = t.asal;
    document.getElementById('keperluan').value = t.keperluan;
    document.getElementById('kamar').value = t.kamar || "";
    document.getElementById('catatan').value = t.catatan || "";

    document.getElementById('btn-submit').innerText = "UPDATE DATA";
    switchTab('form');
}

function hapusTamu(i) {
    if(confirm('Hapus tamu ini secara permanen?')) {
        let target = dataTamu[i];
        dataTamu.splice(i, 1);
        renderList();
        if(target.rowIndex) sendToCloud({ action: "deleteGuest", rowIndex: target.rowIndex });
    }
}

document.getElementById('f').onsubmit = e => {
    e.preventDefault();
    let dataLama = (editIndex !== -1) ? dataTamu[editIndex] : {};

    let d = {
        waktu: document.getElementById('waktu').value,
        penerima: document.getElementById('penerima').value,
        nama: document.getElementById('nama').value,
        pengikut: document.getElementById('pengikut').value,
        asal: document.getElementById('asal').value,
        keperluan: document.getElementById('keperluan').value,
        kamar: document.getElementById('kamar').value,
        catatan: document.getElementById('catatan').value,

        status: (editIndex === -1) ? 'ADA' : (dataLama.status || 'ADA'),
        waktuKeluar: (editIndex === -1) ? '' : (dataLama.waktuKeluar || ''),
        rowIndex: dataLama.rowIndex || null
    };

    if(editIndex === -1) {
        dataTamu.push(d);
        sendToCloud({ action: "addGuest", ...d });
    } else {
        dataTamu[editIndex] = d;
        if(d.rowIndex) sendToCloud({ action: "updateGuest", ...d });
    }

    renderList();
    switchTab('list');
};

function renderKamarList() {
    let container = document.getElementById('kamar-container'); container.innerHTML = '';
    dataKamar.forEach((k, i) => {
        container.innerHTML += `<div class="card" style="display:flex; justify-content:space-between; align-items:center;">
        <b>Kamar ${k.nama}</b>
        <button class="btn-action btn-del" onclick="hapusKamar(${i})">Hapus</button>
        </div>`;
    });
}

function tambahKamarPrompt() {
    let k = prompt("Masukkan Nama / Nomor Kamar Baru:");
    if(k) {
        dataKamar.push({ nama: k });
        localStorage.setItem('kamarData', JSON.stringify(dataKamar));
        updateDropdowns(); renderKamarList();
        sendToCloud({ action: "addKamar", namaKamar: k });
    }
}

function hapusKamar(i) {
    if(confirm("Hapus kamar ini?")) {
        let target = dataKamar[i];
        dataKamar.splice(i, 1);
        localStorage.setItem('kamarData', JSON.stringify(dataKamar));
        updateDropdowns(); renderKamarList();
        if(target.rowIndex) sendToCloud({ action: "deleteKamar", rowIndex: target.rowIndex });
    }
}

function renderPenerimaList() {
    let container = document.getElementById('penerima-container'); container.innerHTML = '';
    dataPenerima.forEach((p, i) => {
        container.innerHTML += `<div class="card">
        <div class="card-title">${p.nama}</div>
        <div style="font-size:14px; margin-top:4px;">No HP: <b>${p.noHP || '-'}</b></div>
        <div style="font-size:14px;">Alamat: ${p.alamat || '-'}</div>
        <div class="card-actions">
        <button class="btn-action btn-edit" onclick="bukaFormPenerima(${i})">Edit</button>
        <button class="btn-action btn-del" onclick="hapusPenerima(${i})">Hapus</button>
        </div>
        </div>`;
    });
}

function bukaFormPenerima(i) {
    editPenerimaIndex = i;
    if(i === -1) { document.getElementById('form-penerima').reset(); }
    else {
        let p = dataPenerima[i];
        document.getElementById('p-nama').value = p.nama;
        document.getElementById('p-nohp').value = p.noHP || '';
        document.getElementById('p-alamat').value = p.alamat || '';
    }
    switchTab('penerima-form');
}

document.getElementById('form-penerima').onsubmit = e => {
    e.preventDefault();
    let nama = document.getElementById('p-nama').value;
    let noHP = document.getElementById('p-nohp').value;
    let alamat = document.getElementById('p-alamat').value;

    if(editPenerimaIndex === -1) {
        dataPenerima.push({ nama, noHP, alamat });
        sendToCloud({ action: "addPenerima", nama, noHP, alamat });
    } else {
        let target = dataPenerima[editPenerimaIndex];
        target.nama = nama; target.noHP = noHP; target.alamat = alamat;
        if(target.rowIndex) sendToCloud({ action: "updatePenerima", rowIndex: target.rowIndex, nama, noHP, alamat });
    }

    localStorage.setItem('penerimaData', JSON.stringify(dataPenerima));
    updateDropdowns(); renderPenerimaList(); switchTab('penerima-list');
};

function hapusPenerima(i) {
    if(confirm("Hapus penerima ini?")) {
        let target = dataPenerima[i];
        dataPenerima.splice(i, 1);
        localStorage.setItem('penerimaData', JSON.stringify(dataPenerima));
        updateDropdowns(); renderPenerimaList();
        if(target.rowIndex) sendToCloud({ action: "deletePenerima", rowIndex: target.rowIndex });
    }
}

function toggleTheme() { let isDark = document.body.classList.toggle('dark-mode'); document.getElementById('theme-icon').innerText = isDark ? "light_mode" : "dark_mode"; localStorage.setItem('theme', isDark ? 'dark' : 'light'); }
if(localStorage.getItem('theme') === 'dark') toggleTheme();

function switchTab(tab) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    let fab = document.getElementById('fab-add');

    if(tab === 'beranda') {
        document.getElementById('screen-beranda').classList.add('active');
        document.querySelectorAll('.nav-item')[0].classList.add('active');
        document.getElementById('app-title').innerText = "Beranda";
        fab.classList.remove('hidden'); renderDashboard();
    }
    else if(tab === 'list') {
        document.getElementById('screen-list').classList.add('active');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
        document.getElementById('app-title').innerText = "Daftar Tamu";
        fab.classList.remove('hidden'); renderList();
    }
    else if(tab === 'settings') {
        document.getElementById('screen-settings').classList.add('active');
        document.querySelectorAll('.nav-item')[2].classList.add('active');
        document.getElementById('app-title').innerText = "Pengaturan";
        fab.classList.add('hidden');
    }
    else if(tab === 'kamar-list') {
        document.getElementById('screen-kamar-list').classList.add('active');
        document.getElementById('app-title').innerText = "Kelola Kamar";
        fab.classList.add('hidden'); renderKamarList();
    }
    else if(tab === 'penerima-list') {
        document.getElementById('screen-penerima-list').classList.add('active');
        document.getElementById('app-title').innerText = "Kelola Penerima";
        fab.classList.add('hidden'); renderPenerimaList();
    }
    else if(tab === 'penerima-form') {
        document.getElementById('screen-penerima-form').classList.add('active');
        document.getElementById('app-title').innerText = editPenerimaIndex === -1 ? "Tambah Penerima" : "Edit Penerima";
        fab.classList.add('hidden');
    }
    else if(tab === 'form') {
        document.getElementById('screen-form').classList.add('active');
        document.getElementById('app-title').innerText = editIndex === -1 ? "Tambah Tamu" : "Edit Tamu";
        fab.classList.add('hidden');
    }
    else if(tab === 'informasi') {
        document.getElementById('screen-informasi').classList.add('active');
        document.getElementById('app-title').innerText = "Informasi";
        fab.classList.add('hidden'); // Menyembunyikan tombol + agar layar rapi
    }
}

fetchDataFromSheet();

if (typeof navigator.serviceWorker !== 'undefined') {
    navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker berhasil didaftarkan!'))
    .catch((error) => console.log('Gagal mendaftar Service Worker:', error));
}

/* ==========================================
 *  FUNGSI MENU PENGATURAN TAMBAHAN
 *  ========================================== */

// 1. Fitur Bagikan (Memanggil fitur Share bawaan HP)
function bagikanAplikasi() {
    if (navigator.share) {
        navigator.share({
            title: 'Buku Tamu WISTA',
            text: 'Gunakan aplikasi pencatatan Buku Tamu digital ini!',
            url: window.location.href
        }).catch((error) => console.log('Gagal membagikan', error));
    } else {
        alert("Maaf, fitur bagikan tidak didukung di perangkat/browser ini.");
    }
}

// 2. Kontrol Situs (Mengecek dan meminta ulang izin Notifikasi)
function kontrolSitus() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            alert("Izin Notifikasi: DIIZINKAN.\nAplikasi dapat mengirim pemberitahuan.");
        } else {
            alert("Izin Notifikasi: DITOLAK.\nBuka pengaturan browser/HP Anda untuk mengizinkan.");
        }
    });
}

// 3. Fitur Zoom
let currentZoom = 100; // Dimulai dari 100%

function updateZoomDisplay() {
    // Memperbarui angka di layar
    document.getElementById('zoom-level-text').innerText = currentZoom + '%';
    // Menerapkan efek zoom ke seluruh halaman (dibagi 100 karena CSS zoom butuh format desimal, contoh: 1.1)
    document.body.style.zoom = (currentZoom / 100);
}

function zoomIn() {
    if (currentZoom < 200) { // Batas maksimal zoom diperbesar (200%)
        currentZoom += 10;
        updateZoomDisplay();
    }
}

function zoomOut() {
    if (currentZoom > 50) { // Batas maksimal zoom diperkecil (50%)
        currentZoom -= 10;
        updateZoomDisplay();
    }
}

// 4. Fitur Layar Penuh (Fullscreen)
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        // Jika belum layar penuh, maka masuk ke mode layar penuh
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Terjadi kesalahan saat mengaktifkan mode layar penuh: ${err.message}`);
        });
    } else {
        // Jika sudah layar penuh, maka keluar
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
