// ==========================================
// ✨ CORE AUTH & NAVIGATION ✨
// ==========================================
function checkAdminAuth() {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        document.getElementById('admin-login').classList.remove('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
        return false;
    }
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    return token;
}

function adminLogin() {
    const key = document.getElementById('admin-key').value;
    if (key === 'admin123') { 
        sessionStorage.setItem('adminToken', 'true');
        checkAdminAuth();
        initDashboardChart();
        fetchUserData(); 
    } else {
        showAdminToast("Invalid Admin Key", "error");
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('adminToken');
    window.location.reload();
}

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    if(tabId === 'tab-users') fetchUserData();
    if(tabId === 'tab-referrals') fetchReferralsData(); 
    if(tabId === 'tab-promos') fetchPromos();
    if(tabId === 'tab-inventory') fetchBikeData();
    if(tabId === 'tab-handovers') fetchHandoversData();
    if(tabId === 'tab-returned') fetchReturnedData();
    if(tabId === 'tab-damage') fetchDamageData();
    if(tabId === 'tab-payments') fetchPaymentsData();
    if(tabId === 'tab-stations') fetchStations();
    if(tabId === 'tab-complaints') fetchComplaintsData();
}

window.onload = checkAdminAuth;

// ==========================================
// ✨ UNIVERSAL CONFIRMATION MODAL LOGIC ✨
// ==========================================
let confirmActionCallback = null;

function openConfirmModal(title, message, btnText, color, iconClass, callback) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    
    const actionBtn = document.getElementById('confirm-action-btn');
    actionBtn.innerText = btnText;
    actionBtn.style.background = color;
    
    const icon = document.getElementById('confirm-icon');
    icon.className = `fa-solid ${iconClass}`;
    icon.style.color = color;

    document.querySelector('#confirm-modal .modal-content').style.borderTopColor = color;
    
    confirmActionCallback = callback;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    confirmActionCallback = null;
}

document.getElementById('confirm-action-btn').addEventListener('click', () => {
    if (confirmActionCallback) {
        confirmActionCallback(); 
    }
    closeConfirmModal();
});


// ==========================================
// ✨ SMART SEARCH FUNCTIONS ✨
// ==========================================
function searchUsers() {
    const input = document.getElementById('user-search').value.toLowerCase();
    document.querySelectorAll('#user-table-body tr').forEach(row => {
        row.style.display = (row.cells[1].innerText.toLowerCase().includes(input) || row.cells[2].innerText.toLowerCase().includes(input)) ? '' : 'none';
    });
}
function searchBikes() {
    const input = document.getElementById('bike-search').value.toLowerCase();
    document.querySelectorAll('#bike-table-body tr').forEach(row => {
        row.style.display = row.cells[1].innerText.toLowerCase().includes(input) ? '' : 'none';
    });
}
function searchPayments() {
    const input = document.getElementById('payment-search').value.toLowerCase();
    document.querySelectorAll('#payment-table-body tr').forEach(row => {
        row.style.display = (row.cells[0].innerText.toLowerCase().includes(input) || row.cells[1].innerText.toLowerCase().includes(input) || row.cells[2].innerText.toLowerCase().includes(input)) ? '' : 'none';
    });
}
function searchHandovers() {
    const input = document.getElementById('handover-search').value.toLowerCase();
    document.querySelectorAll('#handover-table-body tr').forEach(row => {
        row.style.display = row.cells[1].innerText.toLowerCase().includes(input) ? '' : 'none';
    });
}
function searchReferrals() {
    const input = document.getElementById('referral-search').value.toLowerCase();
    document.querySelectorAll('#referral-table-body tr').forEach(row => {
        row.style.display = (row.cells[2].innerText.toLowerCase().includes(input) || row.cells[3].innerText.toLowerCase().includes(input)) ? '' : 'none';
    });
}

// ==========================================
// ✨ USERS, REFERRALS & PROMOS ✨
// ==========================================
async function fetchUserData() {
    try {
        const res = await fetch('/api/admin/users'); // ✨ LIVE URL
        const users = await res.json();
        const tbody = document.getElementById('user-table-body');
        tbody.innerHTML = '';
        users.forEach(user => {
           const safeAadhaar = user.aadhaarUrl && user.aadhaarUrl.startsWith('http') ? user.aadhaarUrl : 'https://placehold.co/150x100/eeeeee/999999?text=No+Doc';
            const safePan = user.panUrl && user.panUrl.startsWith('http') ? user.panUrl : 'https://placehold.co/150x100/eeeeee/999999?text=No+Doc';
            const safeBill = user.addressBillUrl && user.addressBillUrl.startsWith('http') ? user.addressBillUrl : 'https://placehold.co/150x100/eeeeee/999999?text=No+Doc';

            let docsHtml = '';
            if (user.aadhaarUrl) docsHtml += `<button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:#3182ce; color:#3182ce;" onclick="viewDocument('${safeAadhaar}')">Aadhaar</button> `;
            if (user.panUrl) docsHtml += `<button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:#805ad5; color:#805ad5;" onclick="viewDocument('${safePan}')">PAN</button> `;
            
            // ✨ NEW: View Address Bill Button
            if (user.addressBillUrl) docsHtml += `<button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:#d69e2e; color:#d69e2e;" onclick="viewDocument('${safeBill}')">Bill</button> `;
            
            docsHtml += `<button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem; border-color:#e53e3e; color:#e53e3e;" onclick="triggerAdminKycUpdate('${user.phone}')"><i class="fa-solid fa-upload"></i> Fix</button>`;
            
            const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            const walletHtml = `<span style="color:var(--btn-green); font-weight:bold;">₹${user.walletBalance || 0}</span>`;

            tbody.innerHTML += `<tr>
                <td style="font-size:0.85rem; color:var(--text-muted);">${joinDate}</td>
                <td style="font-weight: 600;">${user.name || 'Pending'}</td>
                <td>${user.phone}</td>
                <td>${walletHtml}</td>
                <td>${docsHtml || 'No Docs'}</td>
                <td><span class="badge" style="background:${user.isVerified ? '#c6f6d5' : '#feebc8'}; color:${user.isVerified ? '#22543d' : '#9c4221'};">${user.isVerified ? 'Verified' : 'Pending'}</span></td>
            </tr>`;
        });
    } catch (e) { showAdminToast("Fetch failed", "error"); }
}

async function fetchReferralsData() {
    try {
        const res = await fetch('/api/admin/users'); // ✨ LIVE URL
        const users = await res.json();
        const tbody = document.getElementById('referral-table-body');
        tbody.innerHTML = '';
        
        const referrals = users.filter(u => u.referredBy && u.referredBy !== 'None');
        
        if (referrals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No successful referrals yet.</td></tr>';
            return;
        }

        referrals.forEach(user => {
            const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            tbody.innerHTML += `<tr>
                <td style="font-size:0.85rem; color:var(--text-muted);">${joinDate}</td>
                <td style="font-weight: 600;">${user.name || 'Pending'}</td>
                <td>${user.phone}</td>
                <td style="font-weight:bold; color:var(--primary-blue);"><i class="fa-solid fa-user-check"></i> ${user.referredBy}</td>
                <td><span class="badge" style="background:#c6f6d5; color:#22543d;">₹100 Awarded ✅</span></td>
            </tr>`;
        });
    } catch (e) { showAdminToast("Failed to fetch referrals", "error"); }
}

async function fetchPromos() {
    try {
        const res = await fetch('/api/admin/promos'); // ✨ LIVE URL
        const promos = await res.json();
        const tbody = document.getElementById('promo-table-body');
        tbody.innerHTML = promos.length ? '' : '<tr><td colspan="3" style="text-align:center;">No promos.</td></tr>';
        promos.forEach(p => {
            tbody.innerHTML += `<tr><td style="font-weight:bold; color:var(--btn-orange);">${p.code}</td><td style="font-weight:bold; color:var(--btn-green);">₹${p.discountAmount} Off</td><td><button class="btn btn-outline" onclick="deletePromo('${p._id}')" style="border-color:#e53e3e; color:#e53e3e; padding:4px 8px; font-size:0.8rem;"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    } catch (e) { showAdminToast("Fetch failed", "error"); }
}

async function sendBulkPromo() {
    const code = document.getElementById('promo-name-input').value;
    const amt = document.getElementById('promo-amount-input').value;
    if (!code || !amt) return showAdminToast("Enter code and amount", "error");
    showAdminToast("Broadcasting...", "info");
    try {
        const res = await fetch('/api/admin/broadcast', { // ✨ LIVE URL
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateName: 'weekend_promo', promoCode: code, discountAmount: amt })
        });
        if (res.ok) { showAdminToast("✅ Saved and Broadcasted!", "success"); fetchPromos(); }
    } catch (e) {}
}

function deletePromo(id) {
    openConfirmModal("Delete Promo Code", "Are you sure? Users will no longer be able to use this discount.", "Delete Code", "#e53e3e", "fa-trash",
        async () => {
            await fetch(`/api/admin/promos/${id}`, { method: 'DELETE' }); // ✨ LIVE URL
            fetchPromos();
            showAdminToast("Promo Deleted!", "success");
        }
    );
}

// ==========================================
// ✨ INVENTORY ✨
// ==========================================
async function fetchBikeData() {
    try {
        const res = await fetch('/api/admin/bikes'); // ✨ LIVE URL
        const bikes = await res.json();
        const tbody = document.getElementById('bike-table-body');
        tbody.innerHTML = bikes.length ? '' : '<tr><td colspan="9" style="text-align:center;">Empty.</td></tr>';
        bikes.forEach(bike => {
            const basePrice = parseFloat(bike.price);
            const disc = parseFloat(bike.discount) || 0;
            const finalPrice = disc > 0 ? basePrice - (basePrice * (disc/100)) : basePrice;
            const safeImg = bike.imageUrl && bike.imageUrl.startsWith('http') ? bike.imageUrl : 'https://placehold.co/150x100/eeeeee/999999?text=No+Image';

            tbody.innerHTML += `<tr>
                <td><img src="${safeImg}" style="width:70px; height:50px; object-fit:contain; border:1px solid #eee;"></td>
                <td style="font-weight:600;">${bike.model} <br><span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-solid fa-gauge-high"></i> ${bike.speed || 45} km/h</span></td>
                <td><span class="badge ${bike.type === 'Swapping' ? 'badge-swapping' : 'badge-home'}">${bike.type}</span></td>
                <td style="font-weight:bold;">₹${bike.deposit || 1000}</td>
                <td style="font-weight:bold; color:var(--primary-blue); font-size:1.1rem;">${bike.quantity}</td>
                <td style="text-decoration:line-through; color:#a0aec0;">₹${basePrice}</td>
                <td style="color:#e53e3e; font-weight:bold;">-${disc}%</td>
                <td style="font-weight:bold; color:var(--btn-green); font-size:1.1rem;">₹${finalPrice.toFixed(0)}</td>
                <td>
                    <button class="btn btn-outline" onclick="openEditModal('${bike._id}','${bike.model}',${bike.price},${disc},${bike.quantity},${bike.rangeKms})" style="padding:4px 8px; border-color:#3182ce; color:#3182ce;"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-outline" onclick="deleteBike('${bike._id}')" style="padding:4px 8px; border-color:#e53e3e; color:#e53e3e;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });
    } catch (e) {}
}

function previewBikeImg(event) {
    const input = event.target;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('bike-preview').src = e.target.result;
            document.getElementById('bike-preview').classList.remove('hidden');
            document.getElementById('preview-placeholder').classList.add('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function addBike(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const ogText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...'; btn.disabled = true;

    const fd = new FormData();
    fd.append('model', document.getElementById('bike-model').value);
    fd.append('type', document.getElementById('bike-type').value);
    fd.append('rangeKms', document.getElementById('bike-range').value);
    fd.append('speed', document.getElementById('bike-speed').value);
    fd.append('deposit', document.getElementById('bike-deposit').value);
    fd.append('price', document.getElementById('bike-price').value);
    fd.append('discount', document.getElementById('bike-discount').value);
    fd.append('quantity', document.getElementById('bike-qty').value);
    fd.append('locationLink', document.getElementById('bike-location').value);
    const img = document.getElementById('bike-img-input');
    if (img.files.length > 0) fd.append('bikeImage', img.files[0]);

    try {
        const res = await fetch('/api/admin/bikes', { method: 'POST', body: fd }); // ✨ LIVE URL
        const data = await res.json();
        btn.innerHTML = ogText; btn.disabled = false;
        if (data.success) {
            showAdminToast("✅ Vehicle Added!", "success");
            event.target.reset(); document.getElementById('bike-preview').classList.add('hidden'); document.getElementById('preview-placeholder').classList.remove('hidden');
            fetchBikeData(); switchTab('tab-inventory', document.querySelector('.tab-btn[onclick*="tab-inventory"]'));
        } else { showAdminToast(data.error, "error"); }
    } catch (e) { btn.innerHTML = ogText; btn.disabled = false; }
}

function deleteBike(id) {
    openConfirmModal("Delete Vehicle", "Are you sure? This will completely remove the vehicle from your inventory.", "Delete Vehicle", "#e53e3e", "fa-trash",
        async () => {
            await fetch(`/api/admin/bikes/${id}`, { method: 'DELETE' }); // ✨ LIVE URL
            fetchBikeData();
            showAdminToast("Vehicle Deleted", "success");
        }
    );
}

function openEditModal(id, model, price, discount, qty, range) {
    document.getElementById('edit-bike-id').value = id; document.getElementById('edit-bike-model').value = model; document.getElementById('edit-bike-price').value = price; document.getElementById('edit-bike-discount').value = discount; document.getElementById('edit-bike-qty').value = qty; document.getElementById('edit-bike-range').value = range;
    document.getElementById('edit-bike-modal').classList.remove('hidden');
}

async function updateBike(event) {
    event.preventDefault();
    const id = document.getElementById('edit-bike-id').value;
    const payload = { model: document.getElementById('edit-bike-model').value, price: document.getElementById('edit-bike-price').value, discount: document.getElementById('edit-bike-discount').value, quantity: document.getElementById('edit-bike-qty').value, rangeKms: document.getElementById('edit-bike-range').value };
    await fetch(`/api/admin/bikes/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }); // ✨ LIVE URL
    document.getElementById('edit-bike-modal').classList.add('hidden'); fetchBikeData();
}

// ==========================================
// ✨ HANDOVERS, RETURNS, DAMAGE & REMINDERS ✨
// ==========================================
async function fetchHandoversData() {
    try {
        const res = await fetch('/api/admin/all-bookings'); // ✨ LIVE URL
        const data = await res.json();
        const tbody = document.getElementById('handover-table-body');
        tbody.innerHTML = '';
        data.forEach(b => {
            let actionHtml = ''; let timerHtml = 'Awaiting Handover';
            if (b.status === 'Paid') {
                actionHtml = `<button class="btn btn-primary" onclick="openHandoverModal('${b._id}', '${b.phone}', '${b.bikeModel}')">Handover</button>`;
            } else if (b.status === 'Handed') {
                const due = new Date(b.dueDate); const now = new Date();
                const diffTime = due - now; const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 0) {
                    timerHtml = `<span style="color:#38a169; font-weight:bold;">${diffDays} Days Left</span>`;
                    actionHtml = `<button class="btn btn-outline" style="border-color:#10b981; color:#10b981; padding: 4px 8px; font-size: 0.85rem;" onclick="openReturnModal('${b._id}', '${b.bikeModel}')">Mark Returned</button>`;
                    if (diffDays <= 2) {
                        timerHtml = `<span style="color:var(--btn-orange); font-weight:bold; background: #fffaf0; padding: 4px 8px; border-radius: 4px; border: 1px solid #feebc8;"><i class="fa-solid fa-triangle-exclamation"></i> ${diffDays} Days Left</span>`;
                        actionHtml += ` <button class="btn btn-outline" style="border-color:#25D366; color:#25D366; background:#f0fff4; padding: 4px 8px; font-size: 0.85rem; margin-left: 5px;" onclick="openReminderModal('${b.phone}', '${b.bikeModel}', ${diffDays})"><i class="fa-brands fa-whatsapp"></i> Remind</button>`;
                    }
                } else {
                    timerHtml = `<span style="color:#e53e3e; font-weight:bold; background: #fff5f5; padding: 4px 8px; border-radius: 4px; border: 1px solid #fed7d7;"><i class="fa-solid fa-circle-exclamation"></i> Overdue</span>`;
                    actionHtml = `<button class="btn btn-outline" style="border-color:#10b981; color:#10b981; padding: 4px 8px; font-size: 0.85rem;" onclick="openReturnModal('${b._id}', '${b.bikeModel}')">Mark Returned</button>`;
                    actionHtml += ` <button class="btn btn-outline" style="border-color:#e53e3e; color:#e53e3e; background:#fff5f5; padding: 4px 8px; font-size: 0.85rem; margin-left: 5px;" onclick="openReminderModal('${b.phone}', '${b.bikeModel}', 'OVERDUE')"><i class="fa-brands fa-whatsapp"></i> Alert</button>`;
                }
            }
            tbody.innerHTML += `<tr><td style="font-size:0.85rem;">${new Date(b.paymentDate).toLocaleDateString()}</td><td style="font-weight:600;">${b.phone}</td><td>${b.bikeModel}</td><td style="font-weight:bold; color:var(--btn-green);">₹${b.amount}</td><td style="font-size:0.85rem;">${b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}</td><td>${timerHtml}</td><td><span class="badge" style="background:#edf2f7; color:#4a5568;">${b.renewalCount || 0}</span></td><td>${actionHtml}</td></tr>`;
        });
    } catch (e) {}
}

function openHandoverModal(id, phone, bikeModel) { document.getElementById('handover-booking-id').value = id; document.getElementById('handover-display-phone').innerText = phone; document.getElementById('handover-display-bike').innerText = bikeModel; document.getElementById('handover-modal').classList.remove('hidden'); }

async function submitHandover(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]'); btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...'; btn.disabled = true;
    const fd = new FormData(); fd.append('customerPhoto', document.getElementById('handover-photo').files[0]);
    const id = document.getElementById('handover-booking-id').value;
    try {
        const res = await fetch(`/api/admin/bookings/${id}/handover`, { method: 'POST', body: fd }); // ✨ LIVE URL
        if(res.ok) { document.getElementById('handover-modal').classList.add('hidden'); fetchHandoversData(); showAdminToast("Timer started.", "success"); }
    } catch (e) {}
    btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Start 28-Day Timer'; btn.disabled = false;
}

let currentReminderPhone = "";
function openReminderModal(phone, bikeModel, daysLeft) {
    currentReminderPhone = phone;
    document.getElementById('reminder-phone').innerText = phone;
    document.getElementById('reminder-bike').innerText = bikeModel;
    document.getElementById('reminder-days').innerText = daysLeft === 'OVERDUE' ? 'Rental is OVERDUE!' : `Rental due in ${daysLeft} Days`;
    document.getElementById('reminder-msg').value = daysLeft === 'OVERDUE' ? `🚨 *Urgent Alert from Easy Drive* 🚨\n\nDear Customer, your rental for the *${bikeModel}* is currently OVERDUE.\n\nPlease return the vehicle immediately or renew your plan to avoid penalty charges.` : `🔔 *Reminder from Easy Drive* 🔔\n\nDear Customer, your rental for the *${bikeModel}* expires in ${daysLeft} days.\n\nPlease ensure you return the vehicle on time or renew your plan via the app.`;
    document.getElementById('reminder-modal').classList.remove('hidden');
}
function sendWhatsAppReminder() {
    const rawMsg = document.getElementById('reminder-msg').value;
    let formattedPhone = currentReminderPhone.replace(/\D/g, ''); if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(rawMsg)}`, '_blank');
    document.getElementById('reminder-modal').classList.add('hidden');
}

function openReturnModal(bookingId, bikeModel) {
    document.getElementById('return-booking-id').value = bookingId; document.getElementById('return-bike').innerText = bikeModel;
    document.getElementById('return-condition').value = 'Complete'; document.getElementById('return-notes').value = '';
    document.getElementById('damage-notes-group').classList.add('hidden'); document.getElementById('return-notes').required = false;
    document.getElementById('return-modal').classList.remove('hidden');
}
function toggleDamageInput() {
    const cond = document.getElementById('return-condition').value;
    if (cond === 'Damaged') { document.getElementById('damage-notes-group').classList.remove('hidden'); document.getElementById('return-notes').required = true; } 
    else { document.getElementById('damage-notes-group').classList.add('hidden'); document.getElementById('return-notes').required = false; }
}
async function submitReturn(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]'); btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...'; btn.disabled = true;
    const bookingId = document.getElementById('return-booking-id').value; const bikeModel = document.getElementById('return-bike').innerText;
    const condition = document.getElementById('return-condition').value; const notes = document.getElementById('return-notes').value;
    const finalReason = condition === 'Damaged' ? `Damaged: ${notes}` : condition;
    try {
        const res = await fetch(`/api/admin/bookings/${bookingId}/return`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ reason: finalReason, bikeModel }) }); // ✨ LIVE URL
        if (!res.ok) throw new Error("Server rejected save.");
        document.getElementById('return-modal').classList.add('hidden'); fetchHandoversData(); 
        if (condition === 'Damaged') showAdminToast("Sent to Damage tab!", "error"); else showAdminToast("Returned & Restocked!", "success");
    } catch (e) { showAdminToast("Error: " + e.message, "error"); }
    btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Confirm Vehicle Return'; btn.disabled = false;
}

async function fetchReturnedData() {
    try {
        const res = await fetch('/api/admin/returned-list'); // ✨ LIVE URL
        const data = await res.json();
        const tbody = document.getElementById('returned-table-body'); tbody.innerHTML = '';
        if (!Array.isArray(data)) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e53e3e;">Server error. Restart backend.</td></tr>`;
        data.forEach(r => { tbody.innerHTML += `<tr><td style="font-size:0.85rem;">${new Date(r.returnDate).toLocaleDateString()}</td><td style="font-weight:600;">${r.customerName || 'Unknown'}</td><td>${r.phone}</td><td>${r.bikeModel}</td><td><span class="badge" style="background:${r.returnReason.includes('Damage')?'#fed7d7':'#c6f6d5'}; color:${r.returnReason.includes('Damage')?'#9b2c2c':'#22543d'};">${r.returnReason}</span></td></tr>`; });
    } catch(e) {}
}

async function fetchDamageData() {
    try {
        const res = await fetch('/api/admin/damage-list'); // ✨ LIVE URL
        const data = await res.json();
        const tbody = document.getElementById('damage-table-body'); tbody.innerHTML = '';
        if (!Array.isArray(data)) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#e53e3e;">Server error. Restart backend.</td></tr>`;
        if (data.length === 0) return tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No damaged vehicles reported.</td></tr>';
        data.forEach(d => {
            tbody.innerHTML += `<tr><td style="font-weight: 600;">${d.customerName || 'Customer'}</td><td>${d.phone}</td><td style="font-weight: 500;">${d.bikeModel}</td><td style="color: #e53e3e; font-weight: bold;">${d.returnReason}</td><td style="font-size: 0.85rem;">${new Date(d.returnDate).toLocaleDateString()}</td><td><button class="btn btn-outline" style="border-color: #38a169; color: #38a169; padding: 4px 10px; font-size: 0.85rem;" onclick="markRepaired('${d._id}', '${d.bikeModel}')"><i class="fa-solid fa-wrench"></i> Mark Repaired</button></td></tr>`;
        });
    } catch(e) {}
}

function markRepaired(bookingId, bikeModel) {
    openConfirmModal("Mark as Repaired", "Are you sure you want to add this vehicle back to the live active stock?", "Yes, Restock", "#38a169", "fa-wrench",
        async () => {
            await fetch('/api/admin/repair-complete', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({bookingId, bikeModel}) }); // ✨ LIVE URL
            fetchDamageData(); 
            showAdminToast("Vehicle Repaired & Restocked!", "success");
        }
    );
}

// ==========================================
// ✨ PAYMENTS & RECEIPTS ✨
// ==========================================
async function fetchPaymentsData() {
    try {
        const res = await fetch('/api/admin/payments'); // ✨ LIVE URL
        const data = await res.json();
        const tbody = document.getElementById('payment-table-body'); tbody.innerHTML = '';
        data.forEach(p => {
            const isSuccess = p.status.includes('Success');
            tbody.innerHTML += `<tr><td style="font-size:0.85rem;">${new Date(p.createdAt).toLocaleString()}</td><td style="font-weight:600;">${p.phone}</td><td style="font-family:monospace; color:var(--text-muted);">${p.paymentId}</td><td style="font-weight:bold;">₹${p.amount}</td><td><span style="color:${isSuccess ? '#38a169' : '#e53e3e'}; font-weight:bold;">${p.status}</span></td><td><button class="btn btn-outline" style="border-color: var(--btn-pink); color: var(--btn-pink); padding: 4px 10px; font-size: 0.85rem;" onclick="viewPaymentDetails('${p.paymentId}')"><i class="fa-solid fa-eye"></i> View</button></td></tr>`;
        });
    } catch (e) {}
}

async function viewPaymentDetails(paymentId) {
    document.getElementById('receipt-modal').classList.remove('hidden'); document.getElementById('receipt-loader').classList.remove('hidden'); document.getElementById('receipt-content').classList.add('hidden');
    try {
        const res = await fetch(`/api/admin/payments/details/${paymentId}`); // ✨ LIVE URL
        const data = await res.json();
        if (res.ok) {
            document.getElementById('receipt-amount').innerText = `₹${data.amount}`;
            const badge = document.getElementById('receipt-status'); badge.innerText = data.status; badge.style.background = data.status.includes('Success') ? '#c6f6d5' : '#fed7d7'; badge.style.color = data.status.includes('Success') ? '#22543d' : '#9b2c2c';
            document.getElementById('receipt-date').innerText = new Date(data.date).toLocaleString(); document.getElementById('receipt-id').innerText = data.paymentId; document.getElementById('receipt-name').innerText = data.name; document.getElementById('receipt-phone').innerText = data.phone; document.getElementById('receipt-email').innerText = data.email; document.getElementById('receipt-method').innerText = data.method; document.getElementById('receipt-bank').innerText = data.bankDetails;
            document.getElementById('receipt-loader').classList.add('hidden'); document.getElementById('receipt-content').classList.remove('hidden');
        } else { document.getElementById('receipt-modal').classList.add('hidden'); showAdminToast("Details not found.", "error"); }
    } catch (e) { document.getElementById('receipt-modal').classList.add('hidden'); showAdminToast("Failed to connect.", "error"); }
}

function exportTableToCSV(tableBodyId, filename) {
    let csv = []; let rows = document.querySelectorAll(`#${tableBodyId} tr`);
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        csv.push(row.join(","));
    }
    let downloadLink = document.createElement("a"); downloadLink.download = filename; downloadLink.href = window.URL.createObjectURL(new Blob([csv.join("\n")], {type: "text/csv"}));
    downloadLink.style.display = "none"; document.body.appendChild(downloadLink); downloadLink.click();
}

// ==========================================
// ✨ CHARTS, STATIONS & COMPLAINTS ✨
// ==========================================
async function initDashboardChart() {
    try {
        const res = await fetch('/api/admin/payments'); // ✨ LIVE URL
        const payments = await res.json();
        let rentals = 0, renewals = 0, failed = 0;
        payments.forEach(p => { if (p.status === 'Success') rentals += p.amount; else if (p.status.includes('Renewal')) renewals += p.amount; else failed += p.amount; });
        const ctx = document.getElementById('mainDashboardChart');
        if (window.myChart) window.myChart.destroy();
        window.myChart = new Chart(ctx, { type: 'bar', data: { labels: ['New Rentals (₹)', 'Renewals (₹)', 'Failed (₹)'], datasets: [{ label: 'Revenue', data: [rentals, renewals, failed], backgroundColor: ['#4ade80', '#60a5fa', '#f87171'], borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    } catch (e) {}
}

async function fetchStations() {
    try {
        const res = await fetch('/api/stations'); // ✨ LIVE URL
        const stations = await res.json();
        const tbody = document.getElementById('station-table-body'); tbody.innerHTML = '';
        if (stations.length === 0) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No swap hubs.</td></tr>';
        stations.forEach(s => { tbody.innerHTML += `<tr><td style="font-weight: 600;">${s.name}</td><td>${s.address}</td><td style="font-weight: bold; color: var(--btn-green);"><i class="fa-solid fa-battery-full"></i> ${s.batteriesAvailable}</td><td><button class="btn btn-outline" onclick="deleteStation('${s._id}')" style="border-color:#e53e3e; color:#e53e3e; padding:4px 8px;"><i class="fa-solid fa-trash"></i></button></td></tr>`; });
    } catch (e) {}
}

async function addStation() {
    const name = document.getElementById('station-name').value; const address = document.getElementById('station-address').value; const batteries = document.getElementById('station-batteries').value; const lat = document.getElementById('station-lat').value; const lng = document.getElementById('station-lng').value;
    if(!name || !address || !lat || !lng) return showAdminToast("Fill all fields", "error");
    try {
        const res = await fetch('/api/admin/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, address, lat: parseFloat(lat), lng: parseFloat(lng), batteriesAvailable: parseInt(batteries) || 10 }) }); // ✨ LIVE URL
        if(res.ok) { showAdminToast("Station Added!", "success"); fetchStations(); }
    } catch (e) {}
}

function deleteStation(id) {
    openConfirmModal("Delete Swap Station", "Remove this battery swap hub from the active map?", "Delete Hub", "#e53e3e", "fa-trash",
        async () => {
            await fetch(`/api/admin/stations/${id}`, { method: 'DELETE' }); // ✨ LIVE URL
            fetchStations();
            showAdminToast("Station Deleted!", "success");
        }
    );
}

async function fetchComplaintsData() {
    try {
        const res = await fetch('/api/complaints'); // ✨ LIVE URL
        const complaints = await res.json();
        const tbody = document.getElementById('complaints-table-body'); tbody.innerHTML = '';
        const pendingCount = complaints.filter(c => c.status === 'Pending').length;
        const badge = document.getElementById('pending-badge');
        if (pendingCount > 0) { badge.innerText = pendingCount; badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; }
        if (complaints.length === 0) return tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No complaints.</td></tr>';
        complaints.forEach(c => {
            let actionHtml = c.status === 'Pending' ? `<span style="color: #e53e3e; font-weight: bold; display: block; margin-bottom: 5px;">Pending</span><button class="btn btn-outline" style="border-color: #38a169; color: #38a169; padding: 4px 8px; font-size: 0.8rem;" onclick="markComplaintSolved('${c._id}')"><i class="fa-solid fa-check"></i> Mark Solved</button>` : `<span style="color: var(--btn-green); font-weight: bold;">Solved ✅</span>`;
            const safeImg = c.imageUrl && c.imageUrl.startsWith('http') ? c.imageUrl : 'https://placehold.co/150x100/eeeeee/999999?text=No+Image';
            tbody.innerHTML += `<tr><td style="font-size: 0.85rem;">${new Date(c.createdAt).toLocaleDateString()}</td><td style="font-weight: 600;">${c.phone}</td><td><img src="${safeImg}" onclick="viewDocument('${safeImg}')" style="width: 50px; height: 50px; border-radius: 4px; object-fit: cover; border: 1px solid #ddd; cursor: pointer;"></td><td style="max-width: 250px; word-wrap: break-word;">${c.issue}</td><td>${actionHtml}</td></tr>`;
        });
    } catch (e) {}
}

function markComplaintSolved(id) {
    openConfirmModal("Resolve Complaint", "Are you sure you want to mark this customer complaint as solved?", "Mark Solved", "#38a169", "fa-check",
        async () => {
            await fetch(`/api/admin/complaints/${id}/solve`, { method: 'PUT' }); // ✨ LIVE URL
            fetchComplaintsData();
            showAdminToast("Complaint Solved!", "success");
        }
    );
}

// --- Utilities ---
function viewDocument(url) { document.getElementById('doc-full-img').src = url; document.getElementById('doc-modal').classList.remove('hidden'); }
function showAdminToast(msg, type = "info") {
    const toast = document.getElementById('admin-toast'); toast.innerText = msg;
    toast.style.backgroundColor = type === "success" ? "#27ae60" : type === "error" ? "#e53e3e" : "#333";
    toast.className = "show"; setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// ==========================================
// ✨ ADMIN OVERRIDE KYC LOGIC ✨
// ==========================================
function triggerAdminKycUpdate(phone) {
    // Open the modal and set the phone number
    document.getElementById('admin-kyc-phone').innerText = phone;
    document.getElementById('admin-kyc-phone-input').value = phone;
    
    // Clear old files
    document.getElementById('admin-aadhaar-file').value = "";
    document.getElementById('admin-pan-file').value = "";
    
    document.getElementById('admin-kyc-modal').classList.remove('hidden');
}

async function submitAdminKyc(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    const phone = document.getElementById('admin-kyc-phone-input').value;
    const aadhaarFile = document.getElementById('admin-aadhaar-file').files[0];
    const panFile = document.getElementById('admin-pan-file').files[0];
    const billFile = document.getElementById('admin-bill-file').files[0]; // ✨ NEW

    if (!aadhaarFile && !panFile && !billFile) {
        showAdminToast("Please select at least one file to update.", "error");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    const fd = new FormData();
    fd.append('phone', phone);
    if (aadhaarFile) fd.append('aadhaar', aadhaarFile); // Exact mapping!
    if (panFile) fd.append('pan', panFile); // Exact mapping!
    if (billFile) fd.append('addressBill', billFile);

    try {
        const res = await fetch('/api/admin/update-kyc', { method: 'POST', body: fd });
        if (res.ok) {
            showAdminToast("✅ Documents overridden successfully!", "success");
            document.getElementById('admin-kyc-modal').classList.add('hidden');
            fetchUserData(); // Refresh the table so you can see the new docs
        } else {
            showAdminToast("Failed to upload.", "error");
        }
    } catch (err) {
        showAdminToast("Server error.", "error");
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}



