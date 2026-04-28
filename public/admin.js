function checkAdminAuth() {
    if (!sessionStorage.getItem('adminToken')) { document.getElementById('admin-login').classList.remove('hidden'); document.getElementById('admin-dashboard').classList.add('hidden'); }
    else { document.getElementById('admin-login').classList.add('hidden'); document.getElementById('admin-dashboard').classList.remove('hidden'); }
}
function adminLogin() {
    if (document.getElementById('admin-key').value === 'admin123') { sessionStorage.setItem('adminToken', 'true'); checkAdminAuth(); fetchUserData(); fetchBikeData(); }
}
function logoutAdmin() { sessionStorage.removeItem('adminToken'); window.location.reload(); }
function switchTab(id, btn) { document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden')); document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(id).classList.remove('hidden'); btn.classList.add('active'); }
window.onload = checkAdminAuth;

async function fetchUserData() {
    const res = await fetch('/api/admin/users'); const users = await res.json(); const tb = document.getElementById('user-table-body'); tb.innerHTML = '';
    users.forEach(u => {
        let docs = '';
        if(u.aadhaarUrl) docs += `<button class="btn btn-outline" onclick="viewDocument('${u.aadhaarUrl}')">Aadhaar</button> `;
        if(u.panUrl) docs += `<button class="btn btn-outline" onclick="viewDocument('${u.panUrl}')">PAN</button> `;
        if(u.addressBillUrl) docs += `<button class="btn btn-outline" onclick="viewDocument('${u.addressBillUrl}')">Bill</button> `;
        docs += `<button class="btn btn-outline" style="border-color:#e53e3e;color:#e53e3e" onclick="triggerAdminKycUpdate('${u.phone}')">Fix</button>`;
        tb.innerHTML += `<tr><td>${u.name||'Pending'}</td><td>${u.phone}</td><td>${docs}</td><td>${u.isVerified?'Verified':'Pending'}</td></tr>`;
    });
}

async function fetchBikeData() {
    const res = await fetch('/api/admin/bikes'); const bikes = await res.json(); const tb = document.getElementById('bike-table-body'); tb.innerHTML = '';
    bikes.forEach(b => { tb.innerHTML += `<tr><td>${b.model}</td><td>${b.quantity}</td><td><button class="btn btn-outline" onclick="fetchBikeData()">Refresh</button></td></tr>`; });
}

function triggerAdminKycUpdate(phone) {
    document.getElementById('admin-kyc-phone').innerText = phone; document.getElementById('admin-kyc-phone-input').value = phone;
    document.getElementById('admin-aadhaar-file').value = ""; document.getElementById('admin-pan-file').value = ""; document.getElementById('admin-bill-file').value = "";
    document.getElementById('admin-kyc-modal').classList.remove('hidden');
}

async function submitAdminKyc(event) {
    event.preventDefault(); const fd = new FormData(); fd.append('phone', document.getElementById('admin-kyc-phone-input').value);
    if(document.getElementById('admin-aadhaar-file').files[0]) fd.append('aadhaar', document.getElementById('admin-aadhaar-file').files[0]);
    if(document.getElementById('admin-pan-file').files[0]) fd.append('pan', document.getElementById('admin-pan-file').files[0]);
    if(document.getElementById('admin-bill-file').files[0]) fd.append('addressBill', document.getElementById('admin-bill-file').files[0]);
    await fetch('/api/admin/update-kyc', { method: 'POST', body: fd });
    document.getElementById('admin-kyc-modal').classList.add('hidden'); fetchUserData();
}
function viewDocument(url) { document.getElementById('doc-full-img').src = url; document.getElementById('doc-modal').classList.remove('hidden'); }