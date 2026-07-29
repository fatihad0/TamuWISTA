// script.js
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXwvw2YizWpTOiYX2vfex6ziFHO082I_tucqqD3qLHYXcOHw9PccFmP7brIpn0iD9R/exec';

let keranjang = [];
let listBarang = [];
const formatRp = (angka) => new Intl.NumberFormat('id-ID').format(angka);

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

async function loadBarang() {
    showLoading(true);
    try {
        const res = await fetch(SCRIPT_URL + '?action=getBarang');
        listBarang = await res.json();

        let htmlStok = '';
        let htmlSelect = '<option value="">-- Pilih Barang --</option>';

        listBarang.forEach(b => {
            htmlStok += `<tr><td>${b.id}</td><td>${b.nama}</td><td>${b.stok}</td><td>Rp ${formatRp(b.harga)}</td></tr>`;
            if(b.stok > 0) {
                htmlSelect += `<option value="${b.id}" data-harga="${b.harga}" data-nama="${b.nama}" data-stok="${b.stok}">${b.nama} (Stok: ${b.stok}) - Rp ${formatRp(b.harga)}</option>`;
            }
        });
        document.getElementById('tabel-stok').innerHTML = htmlStok;
        document.getElementById('kasir-barang').innerHTML = htmlSelect;
    } catch (e) { console.error(e); }
    showLoading(false);
}

async function simpanBarang() {
    const data = {
        action: 'addBarang',
        nama: document.getElementById('input-nama').value,
        stok: parseInt(document.getElementById('input-stok').value),
        harga: parseFloat(document.getElementById('input-harga').value)
    };
    if(!data.nama || !data.stok || !data.harga) return alert('Isi semua form!');

    showLoading(true);
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, 
            body: JSON.stringify(data)
        });
        alert('Barang berhasil disimpan ke Sheet!');
        document.getElementById('input-nama').value = '';
        document.getElementById('input-stok').value = '';
        document.getElementById('input-harga').value = '';
        loadBarang();
    } catch (e) { alert('Gagal menyimpan'); }
}

function tambahKeKeranjang() {
    const select = document.getElementById('kasir-barang');
    const qty = parseInt(document.getElementById('kasir-qty').value);
    if(select.value === '') return alert('Pilih barang dulu!');

    const option = select.options[select.selectedIndex];
    if(qty > parseInt(option.getAttribute('data-stok'))) return alert('Stok kurang!');

    keranjang.push({
        id: select.value,
        nama: option.getAttribute('data-nama'),
        harga: parseFloat(option.getAttribute('data-harga')),
        qty: qty
    });
    renderKeranjang();
}

function hapusKeranjang(index) {
    keranjang.splice(index, 1);
    renderKeranjang();
}

function renderKeranjang() {
    let html = '';
    let total = 0;
    keranjang.forEach((item, index) => {
        let subtotal = item.qty * item.harga;
        total += subtotal;
        html += `<tr><td>${item.nama}</td><td>${item.qty}</td><td>Rp ${formatRp(item.harga)}</td><td>Rp ${formatRp(subtotal)}</td><td><button class="btn btn-sm btn-danger" onclick="hapusKeranjang(${index})">X</button></td></tr>`;
    });
    document.getElementById('tabel-keranjang').innerHTML = html;
    document.getElementById('total-belanja').innerText = formatRp(total);
}

async function prosesCheckout() {
    if(keranjang.length === 0) return alert('Keranjang kosong!');
    const konsumen = document.getElementById('kasir-konsumen').value || 'Umum';

    let totalBelanja = keranjang.reduce((sum, item) => sum + (item.qty * item.harga), 0);

    const payload = {
        action: 'checkout',
        konsumen: konsumen,
        kasir: 'Admin Utama',
        keranjang: keranjang,
        total: totalBelanja
    };

    showLoading(true);
    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if(result.status === 'success') {
            document.getElementById('resi-tanggal').innerText = result.tanggal;
            document.getElementById('resi-konsumen').innerText = konsumen;
            document.getElementById('resi-kasir').innerText = 'Admin Utama';

            let htmlResi = '<tr><th>Barang</th><th>Qty</th><th>Subtotal</th></tr>';
            keranjang.forEach(item => {
                htmlResi += `<tr><td>${item.nama}</td><td>${item.qty}</td><td>Rp ${formatRp(item.qty * item.harga)}</td></tr>`;
            });
            document.getElementById('resi-items').innerHTML = htmlResi;
            document.getElementById('resi-total').innerText = formatRp(result.total);

            new bootstrap.Modal(document.getElementById('modalResi')).show();

            keranjang = [];
            renderKeranjang();
            document.getElementById('kasir-konsumen').value = '';
            loadBarang();
            loadLaporan();
        }
    } catch (e) { alert('Gagal memproses transaksi.'); }
    showLoading(false);
}

function kirimResiWA() {
    const konsumen = document.getElementById('resi-konsumen').innerText;
    const total = document.getElementById('resi-total').innerText;
    const text = `Halo ${konsumen}, Terima kasih telah berbelanja di Toko Recap. Total belanja Anda adalah Rp ${total}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

async function loadLaporan() {
    showLoading(true);
    try {
        const res = await fetch(SCRIPT_URL + '?action=getLaporan');
        const data = await res.json();
        let html = '';
        data.forEach(trx => {
            html += `<tr><td>${trx.id}</td><td>${trx.tanggal}</td><td>${trx.nama_konsumen}</td><td>${trx.nama_kasir}</td><td><strong>Rp ${formatRp(trx.total)}</strong></td></tr>`;
        });
        document.getElementById('tabel-laporan').innerHTML = html;
    } catch (e) { console.error(e); }
    showLoading(false);
}

window.onload = () => {
    loadBarang();
    loadLaporan();
};

// --- REGISTRASI SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker terdaftar!', reg))
            .catch(err => console.error('Service Worker gagal:', err));
    });
}
