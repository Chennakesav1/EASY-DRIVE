// ==========================================
// ✨ EASY DRIVE: COMPLETE APP.JS ✨
// ==========================================

// --- 1. MASTER INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    goToScreen('splash-screen'); 

    setTimeout(async () => {
        const phone = localStorage.getItem('easyDriveUser');
        if (phone) {
            try {
                const response = await fetch(`/api/auth/me?phone=${phone}`);
                if (response.ok) {
                    const userData = await response.json();
                    if (typeof populateSidebar === "function") populateSidebar();

                    if (userData.isVerified) {
                        goToScreen('dashboard-screen');
                        if (typeof fetchAndRenderVehicles === "function") fetchAndRenderVehicles('All');
                        if (typeof checkActiveBooking === "function") checkActiveBooking();
                    } else {
                        goToScreen('upload-screen'); 
                    }
                } else {
                    localStorage.removeItem('easyDriveUser');
                    goToScreen('auth-screen');
                }
            } catch (error) {
                goToScreen('auth-screen');
            }
        } else {
            goToScreen('auth-screen');
        }
    }, 3000); 
});

// --- 2. UTILITIES ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return alert(message); 
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); 
    }, 3500);
}

function goToScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active-screen');
        window.scrollTo(0, 0);
    }
}

function toggleSidebar() {
    document.getElementById('user-sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('hidden');
}

function openModal(modalId) {
    document.getElementById('user-sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.add('hidden');
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function openImageModal(imgSrc) { 
    document.getElementById('expanded-img').src = imgSrc; 
    document.getElementById('image-modal').classList.remove('hidden'); 
}

function closeAndReturnToSidebar(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    openSidebar(); 
}

// --- ✨ CUSTOM ALERTS ✨ ---
let customAlertCallback = null;
function openCustomAlert(title, message, iconClass, color, btnText = "OK", callback = null) {
    document.getElementById('custom-alert-title').innerText = title;
    document.getElementById('custom-alert-message').innerText = message;
    const icon = document.getElementById('custom-alert-icon');
    icon.className = `fa-solid ${iconClass}`;
    icon.style.color = color;
    document.querySelector('#custom-alert-modal .modal-content').style.borderTopColor = color;
    const btn = document.getElementById('custom-alert-btn');
    btn.innerText = btnText;
    btn.style.background = color;
    customAlertCallback = callback;
    document.getElementById('user-sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.add('hidden');
    document.getElementById('custom-alert-modal').classList.remove('hidden');
}
function closeCustomAlert() {
    document.getElementById('custom-alert-modal').classList.add('hidden');
    if (customAlertCallback) { customAlertCallback(); customAlertCallback = null; }
}

// --- ✨ RESEND OTP TIMER LOGIC ✨ ---
let loginTimerInterval, signupTimerInterval;
function startResendTimer(type) {
    let timeLeft = 30;
    const timerText = document.getElementById(`${type}-resend-timer`);
    const resendBtn = document.getElementById(`${type}-resend-btn`);
    const timeSpan = document.getElementById(type === 'login' ? 'l-timer' : 's-timer');
    
    timerText.classList.remove('hidden');
    resendBtn.classList.add('hidden');
    timeSpan.innerText = timeLeft;

    clearInterval(type === 'login' ? loginTimerInterval : signupTimerInterval);

    const interval = setInterval(() => {
        timeLeft--;
        timeSpan.innerText = timeLeft;
        if(timeLeft <= 0) {
            clearInterval(interval);
            timerText.classList.add('hidden');
            resendBtn.classList.remove('hidden');
        }
    }, 1000);

    if(type === 'login') loginTimerInterval = interval;
    else signupTimerInterval = interval;
}

// --- 3. SIDEBAR & REFERRALS ---
async function populateSidebar() {
    const phone = localStorage.getItem('easyDriveUser');
    if (!phone) return;
    if (document.getElementById('sidebar-phone')) document.getElementById('sidebar-phone').innerText = phone;

    try {
        const response = await fetch(`/api/auth/me?phone=${phone}`);
        if (response.ok) {
            const userData = await response.json();
            if (document.getElementById('sidebar-name')) document.getElementById('sidebar-name').innerText = userData.name || "Easy Drive User";
            if (document.getElementById('sidebar-email')) document.getElementById('sidebar-email').innerText = userData.email || "No Email Provided";

            if (userData.aadhaarUrl) {
                document.getElementById('aadhaar-status').innerHTML = "Verified ✅";
                document.getElementById('aadhaar-status').style.color = "var(--btn-green)";
                localStorage.setItem('easyDriveUser_aadhaar', 'verified'); 
            }
            if (userData.panUrl) {
                document.getElementById('pan-status').innerHTML = "Verified ✅";
                document.getElementById('pan-status').style.color = "var(--btn-green)";
                localStorage.setItem('easyDriveUser_pan', 'verified'); 
            }
        }
    } catch (error) { console.error("Failed to connect to server"); }
}

function openSidebar() {
    document.getElementById('user-sidebar').classList.add('active');
    document.getElementById('sidebar-overlay').classList.remove('hidden');
    populateSidebar(); 
}

// ✨ REFERRAL SYSTEM MODAL
async function openReferralModal() {
    document.getElementById('user-sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.add('hidden');
    document.getElementById('global-loader').classList.remove('hidden');
    const phone = localStorage.getItem('easyDriveUser');
    
    try {
        const response = await fetch(`/api/auth/me?phone=${phone}`);
        const data = await response.json();
        document.getElementById('global-loader').classList.add('hidden');
        
        document.getElementById('my-referral-code').innerText = data.referralCode || "N/A";
        document.getElementById('my-wallet-balance').innerText = data.walletBalance || 0;
        
        document.getElementById('referral-modal').classList.remove('hidden');
    } catch(e) { document.getElementById('global-loader').classList.add('hidden'); }
}

function shareReferral() {
    const code = document.getElementById('my-referral-code').innerText;
    const message = `Want to ride a premium EV? Sign up on Easy Drive using my referral code *${code}* and we both get rewards!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// --- 4. PHONE VALIDATION & AUTHENTICATION ---
function setupPhoneValidation(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;

    input.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length === 10) {
            btn.classList.remove('btn-disabled'); btn.classList.add('btn-secondary'); btn.disabled = false;
        } else {
            btn.classList.add('btn-disabled'); btn.classList.remove('btn-secondary'); btn.disabled = true;
        }
    });
}
setupPhoneValidation('login-phone', 'login-get-otp-btn');
setupPhoneValidation('signup-phone', 'signup-get-otp-btn');

function toggleAuth() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authTitle = document.getElementById('auth-title');

    if (loginForm.classList.contains('hidden')) {
        loginForm.classList.remove('hidden'); signupForm.classList.add('hidden'); authTitle.innerText = "Login";
        document.getElementById('login-phone').disabled = false;
        document.getElementById('login-get-otp-btn').classList.remove('hidden');
        document.getElementById('login-otp-section').classList.add('hidden');
        document.getElementById('login-submit-btn').classList.add('hidden');
    } else {
        loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); authTitle.innerText = "Create Account";
    }
}

async function sendLoginOTP() {
    const phone = document.getElementById('login-phone').value;
    if (phone.length < 10) return showToast("Enter a valid phone number", "error");
    document.getElementById('loader-text').innerText = "Sending OTP...";
    document.getElementById('global-loader').classList.remove('hidden');

    try {
        const response = await fetch('/api/auth/send-login-otp', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone })
        });
        const data = await response.json();
        document.getElementById('global-loader').classList.add('hidden');

        if (!response.ok) {
            showToast(data.error, "error");
            if (response.status === 404) setTimeout(() => { toggleAuth(); document.getElementById('signup-phone').value = phone; }, 1500);
            return;
        }
        showToast("OTP Sent!", "success");
        document.getElementById('login-phone').disabled = true;
        document.getElementById('login-get-otp-btn').classList.add('hidden');
        document.getElementById('login-otp-section').classList.remove('hidden');
        document.getElementById('login-submit-btn').classList.remove('hidden');
        
        startResendTimer('login'); // ✨ Start Timer
    } catch (error) { document.getElementById('global-loader').classList.add('hidden'); showToast("Server error.", "error"); }
}

async function loginUser() {
    const phone = document.getElementById('login-phone').value;
    const otp = document.getElementById('login-otp-input').value;
    if (otp.length < 4) return showToast("Enter a valid OTP", "error");

    document.getElementById('global-loader').classList.remove('hidden');
    try {
        const response = await fetch('/api/auth/verify-login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp })
        });
        const data = await response.json();
        document.getElementById('global-loader').classList.add('hidden');

        if (!response.ok) return showToast(data.error, "error");

        localStorage.setItem('easyDriveUser', phone);
        if (typeof populateSidebar === "function") populateSidebar();

        if (data.isVerified) {
            goToScreen('dashboard-screen'); fetchAndRenderVehicles('All');
        } else { goToScreen('upload-screen'); }
    } catch (error) { document.getElementById('global-loader').classList.add('hidden'); showToast("Server error.", "error"); }
}

function sendSignupOTP() {
    const phoneInput = document.getElementById('signup-phone').value;
    if (!phoneInput || phoneInput.length < 10) {
        return openCustomAlert("Invalid Number", "Please enter a valid 10-digit phone number first.", "fa-circle-xmark", "#e53e3e", "Try Again");
    }
    
    openCustomAlert("OTP Sent!", "Successfully sent OTP to your WhatsApp.", "fa-circle-check", "#27ae60", "Enter OTP");
    document.getElementById('signup-otp-section').classList.remove('hidden');
    
    startResendTimer('signup'); // ✨ Start Timer
}

async function signupUser() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
    const referralCode = document.getElementById('signup-referral').value; // ✨ Get Referral Code
    
    if (!name || !email || phone.length < 10) return showToast("Please fill all required fields.", "error");

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name, email, phone, referralCode }) // ✨ Send Referral
        });
        const data = await response.json();
        if (!response.ok) return showToast(data.error, "error");

        localStorage.setItem('easyDriveUser', phone);
        if (typeof populateSidebar === "function") populateSidebar();
        goToScreen('upload-screen'); 
    } catch (error) { showToast("Server error.", "error"); }
}

function logoutUser() { localStorage.removeItem('easyDriveUser'); window.location.reload(); }

// --- 5. KYC UPLOADS ---
function previewDoc(event, previewElementId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgElement = document.getElementById(previewElementId);
            imgElement.src = e.target.result;
            imgElement.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
}
async function saveKYC() {
    const manualPan = document.getElementById('manual-pan').value.trim().toUpperCase();
    const manualAadhaar = document.getElementById('manual-aadhaar').value.replace(/\s/g, '');
    const panFile = document.querySelectorAll('.input-file')[0].files[0];
    const aadhaarFile = document.querySelectorAll('.input-file')[1].files[0];     

    if (!manualPan || !manualAadhaar) return showToast("Please enter both ID numbers.", "error");
    if (!aadhaarFile || !panFile) return showToast("Please upload both document images.", "error");

    // Let the user know the AI is thinking
    document.getElementById('loader-text').innerText = "AI Scanning Documents... (Up to 10s)";
    
    const loader = document.getElementById('global-loader');
    loader.classList.remove('hidden');

    try {
        const formData = new FormData();
        formData.append('phone', localStorage.getItem('easyDriveUser'));
        formData.append('manualPan', manualPan);       
        formData.append('manualAadhaar', manualAadhaar); 
        formData.append('pan', panFile);
        formData.append('aadhaar', aadhaarFile);

        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await response.json();
        
        loader.classList.add('hidden');
        document.getElementById('loader-text').innerText = "Processing...";

        if (response.ok) {
            showToast("AI Identity Verified!", "success");
            localStorage.setItem('easyDriveUser_aadhaar', 'verified'); 
            localStorage.setItem('easyDriveUser_pan', 'verified');
            updateDocStatusInMenu('aadhaar'); 
            updateDocStatusInMenu('pan');
            goToScreen('dashboard-screen'); 
            fetchAndRenderVehicles('All');
        } else { 
            showToast(data.error || "Verification failed.", "error"); 
        }
    } catch (error) { 
        loader.classList.add('hidden'); 
        document.getElementById('loader-text').innerText = "Processing...";
        showToast("Server error.", "error"); 
    }
}

function viewKYC(type) {
    const data = localStorage.getItem(`easyDriveUser_${type}`);
    if(data === 'verified') showToast("This document is securely verified.", "success");
    else showToast("This document is not uploaded yet.", "error");
}

function updateDocStatusInMenu(type) {
    const statusSpan = document.getElementById(`${type}-status`);
    if(!statusSpan) return;
    if(localStorage.getItem(`easyDriveUser_${type}`) === 'verified') {
        statusSpan.innerText = "Verified ✅"; statusSpan.classList.add('text-green');
    } else {
        statusSpan.innerText = "Not Uploaded"; statusSpan.classList.remove('text-green');
    }
}

// --- 6. COMPLAINTS ---
async function submitComplaint() {
    const issueText = document.getElementById('comp-issue').value;
    const fileInput = document.getElementById('comp-img');
    if (!fileInput.files || fileInput.files.length === 0) return showToast("Please take a photo.", "error");
    if (!issueText) return showToast("Please describe the issue.", "error");

    document.getElementById('global-loader').classList.remove('hidden');
    const formData = new FormData();
    formData.append('phone', localStorage.getItem('easyDriveUser'));
    formData.append('issue', issueText);
    formData.append('complaintImage', fileInput.files[0]);

    try {
        const response = await fetch('/api/complaints', { method: 'POST', body: formData });
        document.getElementById('global-loader').classList.add('hidden');
        if (response.ok) {
            closeModals(); showToast("Complaint registered.", "success");
            document.getElementById('complaint-form').reset();
            document.getElementById('comp-img-preview').classList.add('hidden');
        }
    } catch (error) { document.getElementById('global-loader').classList.add('hidden'); }
}

async function showComplaintHistory(btnElement) {
    document.querySelectorAll('.category-filters .btn-outline').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    const grid = document.getElementById('main-content-grid');
    grid.innerHTML = '<div class="loader mt-20"></div>';
    
    try {
        const phone = localStorage.getItem('easyDriveUser');
        const response = await fetch(`/api/complaints?phone=${phone}`);
        const complaints = await response.json();
        grid.innerHTML = '';

        if (complaints.length === 0) {
            grid.innerHTML = `<div class="card solid-card w-100 center-text mt-30" style="grid-column: 1 / -1;"><h3 class="text-blue mb-10">No Complaints Registered</h3></div>`;
            return;
        }
        complaints.forEach(c => {
            const card = document.createElement('div');
            card.className = 'card solid-card mb-20 w-100 complaint-card';
            card.style.display = 'flex'; card.style.justifyContent = 'space-between';
            card.style.borderLeft = c.status === "Pending" ? "4px solid #e53e3e" : "4px solid #27ae60";

            let imgSrc = c.imageUrl && c.imageUrl.startsWith('/uploads/') ? 'http://localhost:3000' + c.imageUrl : c.imageUrl;

            card.innerHTML = `
                <div style="flex: 1;">
                    <h4 class="text-blue">Status: <span class="${c.status === 'Pending' ? 'text-red' : 'text-green'}">${c.status}</span></h4>
                    <p class="mt-10 mb-10" style="font-weight: 500;">${c.issue}</p>
                </div>
                <img src="${imgSrc}" onclick="openImageModal(this.src)" class="doc-preview" style="width: 80px; height: 80px; cursor: pointer;">
            `;
            grid.appendChild(card);
        });
    } catch (error) { grid.innerHTML = '<p class="center-text text-red">Failed to load.</p>'; }
}

// --- 7. VEHICLE RENDERING ---
let globalVehicles = [];
async function fetchAndRenderVehicles(filterType = "All") {
    const grid = document.getElementById('main-content-grid');
    if (!grid) return; 
    grid.innerHTML = '<div class="loader mt-20"></div>'; 
    try {
        const response = await fetch('/api/bikes');
        globalVehicles = await response.json();
        renderVehiclesToGrid(filterType);
    } catch (error) { grid.innerHTML = '<p class="center-text text-red mt-20">Failed to load vehicles.</p>'; }
}

function renderVehiclesToGrid(filterType = "All") {
    const grid = document.getElementById('main-content-grid');
    grid.innerHTML = ''; grid.className = 'vehicle-grid';
    const filteredVehicles = filterType === "All" ? globalVehicles : globalVehicles.filter(v => v.type === filterType);

    if (filteredVehicles.length === 0) {
        grid.innerHTML = '<p class="center-text text-gray mt-20" style="grid-column: 1 / -1;">No vehicles available.</p>'; return;
    }

    filteredVehicles.forEach(v => {
        const discount = v.discount || 0;
        const finalPrice = v.price - (v.price * (discount / 100));
        const isAvailable = v.quantity > 0;
        const stockText = isAvailable ? `<span class="text-green font-bold">Available: ${v.quantity}</span>` : `<span class="text-red font-bold">Sold Out</span>`;
        let imgSrc = v.imageUrl && v.imageUrl.startsWith('http') ? v.imageUrl : 'https://placehold.co/400x300/eeeeee/999999?text=No+Image';

        let priceHtml = '';
        if (discount > 0) {
            priceHtml = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="discount-price" style="color: var(--btn-green); font-size: 1.3rem;">₹${finalPrice.toFixed(0)}</span>
                    <span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.9rem;">₹${v.price}</span>
                    <span style="background: #fffbeb; color: #d97706; font-size: 0.75rem; padding: 3px 6px; border-radius: 4px; font-weight: bold;">${discount}% OFF</span>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">per month</span>`;
        } else {
            priceHtml = `
                <div>
                    <span class="discount-price" style="color: var(--primary-blue); font-size: 1.3rem;">₹${finalPrice.toFixed(0)}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">per month</span>
                </div>`;
        }

        const buttonHtml = isAvailable 
            ? `<button class="btn btn-primary w-100 mt-10" onclick="openCheckout('${v.model}', ${v.price}, ${discount}, ${v.deposit || 1000}, '${v.locationLink || ''}', '${v.speed || 45}', '${v.rangeKms}', '${imgSrc}')">Drive Now</button>`
            : `<button class="btn btn-disabled w-100 mt-10">Sold Out</button>`;

        const card = document.createElement('div');
        card.className = `vehicle-card ${isAvailable ? '' : 'dimmed-card'}`; 
        card.innerHTML = `
            <img src="${imgSrc}" class="vehicle-img" onclick="openImageModal(this.src)">
            <div class="vehicle-info">
                <h4 style="color: #1a202c; margin-bottom: 8px; font-size: 1.1rem;">${v.model}</h4>
                
                <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                    <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; color: #475569; font-weight: 500;">
                        <i class="fa-solid fa-bolt" style="color: var(--btn-orange);"></i> ${v.rangeKms} km
                    </span>
                    <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; color: #475569; font-weight: 500;">
                        <i class="fa-solid fa-gauge-high" style="color: var(--primary-blue);"></i> ${v.speed || 45} km/h
                    </span>
                </div>
                
                <p class="text-sm text-gray mb-5"><i class="fa-solid fa-plug text-blue"></i> ${v.type}</p>
                <p class="text-sm text-gray mb-10"><i class="fa-solid fa-shield-halved text-green"></i> Deposit: <strong style="color: var(--text-main);">₹${v.deposit || 1000}</strong> <span style="font-size: 0.7rem;">(Refundable)</span></p>
                <p class="text-sm mb-10">${stockText}</p>
                
                ${priceHtml}
                ${buttonHtml}
            </div>`;
        grid.appendChild(card);
    });
}

function filterVehicles(type, btnElement) {
    document.querySelectorAll('.category-filters .btn-outline').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    renderVehiclesToGrid(type);
}

// --- 8. PROMO CODE LOGIC ---
let currentCheckoutSubtotal = 0;
let appliedPromoDiscount = 0;
async function applyPromoCode() {
    const codeInput = document.getElementById('promo-code-input').value.trim();
    const phone = localStorage.getItem('easyDriveUser');
    if (!codeInput) return;

    try {
        const res = await fetch('/api/promo/validate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: codeInput, phone: phone }) 
        });
        const data = await res.json();
        const msgEl = document.getElementById('promo-message');
        
        if (data.success) {
            appliedPromoDiscount = data.discount;
            currentAppliedPromoCode = codeInput.toUpperCase();
            
            document.getElementById('promo-display-row').classList.remove('hidden');
            document.getElementById('breakdown-promo').innerText = data.discount;
            
            const finalPayable = currentCheckoutSubtotal - data.discount;
            document.getElementById('checkout-price').innerText = finalPayable > 0 ? finalPayable : 0;
            
            msgEl.innerText = data.message;
            msgEl.style.color = 'var(--btn-green)';
            document.getElementById('promo-input-container').classList.add('hidden');
        } else {
            msgEl.innerText = data.error;
            msgEl.style.color = '#e53e3e';
        }
    } catch (e) { console.error("Promo error", e); }
}

// --- 9. CHECKOUT & PAYMENT ---
let currentMapLink = ""; let currentBikeName = "";

async function openCheckout(bikeName, basePrice, discountPercent, deposit, mapLink, speed, range, imgSrc) {
    const phone = localStorage.getItem('easyDriveUser');
    try {
        const res = await fetch(`/api/bookings/check-eligibility?phone=${phone}`);
        const data = await res.json();
        if (!data.canBook) {
            return openCustomAlert("Active Rental Found", "You must return your current vehicle before booking a new one.", "fa-triangle-exclamation", "#dd6b20", "Understood");
        }
        
        const discountAmt = Math.round(basePrice * (discountPercent / 100));
        const finalRent = basePrice - discountAmt;
        const totalPayable = finalRent + Number(deposit);

        currentCheckoutSubtotal = totalPayable;
        appliedPromoDiscount = 0;
        currentAppliedPromoCode = "";

        const imgEl = document.getElementById('modal-bike-img');
        if(imgEl) imgEl.src = imgSrc;

        document.getElementById('modal-bike-title').innerText = bikeName;
        if(document.getElementById('modal-bike-range')) document.getElementById('modal-bike-range').innerText = `${range} km`;
        if(document.getElementById('modal-bike-speed')) document.getElementById('modal-bike-speed').innerText = `${speed} km/h`;
        
        if(document.getElementById('breakdown-rent')) document.getElementById('breakdown-rent').innerText = basePrice;
        
        const fleetDiscountRow = document.getElementById('fleet-discount-row');
        if(fleetDiscountRow) {
            if(discountAmt > 0) {
                fleetDiscountRow.classList.remove('hidden');
                document.getElementById('breakdown-discount').innerText = discountAmt;
            } else {
                fleetDiscountRow.classList.add('hidden'); 
            }
        }

        if(document.getElementById('breakdown-deposit')) document.getElementById('breakdown-deposit').innerText = deposit;
        document.getElementById('checkout-price').innerText = totalPayable; 

        if(document.getElementById('promo-display-row')) document.getElementById('promo-display-row').classList.add('hidden');
        if(document.getElementById('promo-input-container')) document.getElementById('promo-input-container').classList.remove('hidden');
        if(document.getElementById('promo-code-input')) document.getElementById('promo-code-input').value = '';
        if(document.getElementById('promo-message')) document.getElementById('promo-message').innerText = '';

        currentMapLink = mapLink; currentBikeName = bikeName; 
        document.getElementById('booking-modal').classList.remove('hidden');
    } catch (e) { showToast("Error connecting to checkout.", "error"); }
}

async function processPayment() {
    const text = document.getElementById('loader-text');
    const priceText = document.getElementById('checkout-price').innerText;
    const amount = parseInt(priceText.replace(/[^0-9]/g, ''));
    const phone = localStorage.getItem('easyDriveUser');

    if (!amount || isNaN(amount) || amount <= 0) return showToast("Error: Payment amount is invalid.", "error");

    document.getElementById('global-loader').classList.remove('hidden');
    text.innerText = "Connecting to Secure Gateway...";

    try {
        const orderResponse = await fetch('/api/payment/create-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amount })
        });
        const orderData = await orderResponse.json();
        
        if (!orderData.success) {
            document.getElementById('global-loader').classList.add('hidden');
            return showToast("Failed to initialize payment. Check Admin Razorpay Keys.", "error");
        }

        const options = {
            "key": "rzp_test_SeZV1cRJuCN2TK", 
            "amount": orderData.order.amount, 
            "currency": "INR", 
            "name": "Easy Drive",
            "order_id": orderData.order.id, 
            "handler": async function (response) {
                closeModals(); 
                document.getElementById('global-loader').classList.remove('hidden');
                text.innerText = "Verifying Payment...";
                try {
                    const verifyResponse = await fetch('/api/payment/verify', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature, phone: phone, amount: amount,
                            bikeModel: currentBikeName, pickupLocation: currentMapLink, promoCode: currentAppliedPromoCode
                        })
                    });
                    const verifyData = await verifyResponse.json();
                    if (verifyData.success) {
                        text.innerText = "Payment Successful!";
                        setTimeout(() => {
                            document.getElementById('global-loader').classList.add('hidden');
                            openCustomAlert("Booking Confirmed! 🎉", `Payment ID: ${response.razorpay_payment_id}\n\nYour vehicle is ready. Please check the 'My Bike' section for pickup details.`, "fa-circle-check", "#27ae60", "Awesome!");
                            checkActiveBooking(); fetchAndRenderVehicles('All');
                        }, 2000);
                    }else {
                        document.getElementById('global-loader').classList.add('hidden'); showToast("Verification failed!", "error");
                    }
                } catch (error) { document.getElementById('global-loader').classList.add('hidden'); }
            },
            "prefill": { "contact": phone || "9999999999" }, 
            "theme": { "color": "#007bff" },
            "modal": {
                "confirm_close": true, 
                "ondismiss": function() {
                    document.getElementById('global-loader').classList.add('hidden');
                    showToast("Payment cancelled.", "info");
                }
            }
        };
        
        document.getElementById('global-loader').classList.add('hidden');
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){ 
            fetch('/api/payment/failed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone, amount: amount, errorDesc: response.error.description }) });
            showToast("Payment failed.", "error"); 
        });
        rzp.open();
    } catch (error) { document.getElementById('global-loader').classList.add('hidden'); }
}

async function processRenewalPayment(amount, phone) {
    document.getElementById('global-loader').classList.remove('hidden');
    document.getElementById('loader-text').innerText = "Initializing Payment...";
    
    try {
        const orderResponse = await fetch('/api/payment/create-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amount })
        });
        const orderData = await orderResponse.json();
        
        if (!orderData.success) {
            document.getElementById('global-loader').classList.add('hidden');
            return showToast("Failed to initialize payment.", "error");
        }

        const options = {
            "key": "rzp_test_SeZV1cRJuCN2TK", 
            "amount": orderData.order.amount, "currency": "INR", "name": "Easy Drive",
            "description": "Vehicle Subscription Renewal", "order_id": orderData.order.id, 
            "handler": async function (response) {
                closeModals(); document.getElementById('global-loader').classList.remove('hidden');
                document.getElementById('loader-text').innerText = "Extending Due Date...";
                try {
                    const res = await fetch('/api/bookings/renew', {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ phone: phone, amount: amount, paymentId: response.razorpay_payment_id })
                    });
                    document.getElementById('global-loader').classList.add('hidden');
                    if (res.ok) { showToast("✅ Renewal Successful!", "success"); viewMyBike(); } 
                    else { showToast("Failed to process renewal data.", "error"); }
                } catch (e) { document.getElementById('global-loader').classList.add('hidden'); }
            },
            "prefill": { "contact": phone || "9999999999" }, "theme": { "color": "#f39c12" },
            "modal": {
                "confirm_close": true,
                "ondismiss": function() {
                    document.getElementById('global-loader').classList.add('hidden');
                }
            }
        };
        
        document.getElementById('global-loader').classList.add('hidden');
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){ 
            fetch('/api/payment/failed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone, amount: amount, errorDesc: "Renewal - " + response.error.description }) });
            showToast("Renewal payment cancelled.", "error"); 
        });
        rzp.open();
    } catch (error) { document.getElementById('global-loader').classList.add('hidden'); }
}

// --- 10. HISTORY & ACTIVE RENTALS ---
async function viewPaymentHistory() {
    document.getElementById('user-sidebar').classList.remove('active'); document.getElementById('sidebar-overlay').classList.add('hidden');
    const phone = localStorage.getItem('easyDriveUser');
    document.getElementById('global-loader').classList.remove('hidden');
    try {
        const response = await fetch(`/api/payments?phone=${phone}`);
        const payments = await response.json();
        const list = document.getElementById('user-payment-list');
        list.innerHTML = '';
        
        if (payments.length === 0) {
            list.innerHTML = `<div class="center-text" style="padding: 20px; background: #f8f9fa; border-radius: 8px;"><p>No history found.</p></div>`;
        } else {
            payments.forEach(p => {
                const isSuccess = p.status.includes('Success'); 
                const borderColor = isSuccess ? '#27ae60' : '#e53e3e';
                const pdfButtonHtml = isSuccess ? `<a href="/api/payments/${p.paymentId}/invoice" target="_blank" style="background: #e2e8f0; color: #1a202c; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: bold; border: 1px solid #cbd5e1;"><i class="fa-solid fa-file-pdf" style="color: #e53e3e;"></i> Invoice</a>` : ``;

                list.innerHTML += `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid ${borderColor};">
                        <div class="flex-row" style="justify-content: space-between; margin-bottom: 10px;">
                            <span class="text-sm">${new Date(p.createdAt).toLocaleString()}</span>
                            <span style="color: ${borderColor}; font-weight: bold; font-size: 0.85rem;">${isSuccess ? '✅' : '❌'} ${p.status}</span>
                        </div>
                        <div class="flex-row" style="justify-content: space-between; align-items: center;">
                            <div>
                                <span class="text-sm block-label" style="display:block; margin-bottom:2px;">ID: ${p.paymentId}</span>
                                <span class="font-bold text-lg">₹${p.amount}</span>
                            </div>
                            <div>${pdfButtonHtml}</div>
                        </div>
                    </div>`;
            });
        }
        document.getElementById('global-loader').classList.add('hidden'); document.getElementById('payment-history-modal').classList.remove('hidden');
    } catch (error) { document.getElementById('global-loader').classList.add('hidden'); }
}

async function checkActiveBooking() {
    const phone = localStorage.getItem('easyDriveUser');
    if (!phone) return;
    try {
        const response = await fetch(`/api/bookings/active?phone=${phone}`);
        const data = await response.json();
        
        const banner = document.getElementById('active-pickup-banner');
        const pickupModal = document.getElementById('pickup-modal');

        if (data.booking && data.booking.status === 'Paid') {
            if (banner) {
                document.getElementById('pickup-banner-model').innerText = data.booking.bikeModel;
                document.getElementById('pickup-banner-map-btn').href = data.booking.pickupLocation;
                banner.classList.remove('hidden');
            }
            if (pickupModal) {
                document.getElementById('pickup-bike-name').innerText = data.booking.bikeModel;
                document.getElementById('pickup-map-btn').href = data.booking.pickupLocation;
                pickupModal.classList.remove('hidden');
            }
        } else { 
            if (banner) banner.classList.add('hidden'); 
            if (pickupModal) pickupModal.classList.add('hidden');
        }
    } catch (e) { console.error("Error checking active booking:", e); }
}

// --- 11. MY BIKE & RENEWALS ---
async function viewMyBike() {
    document.getElementById('user-sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.add('hidden');
    const phone = localStorage.getItem('easyDriveUser');
    document.getElementById('global-loader').classList.remove('hidden');

    try {
        const response = await fetch(`/api/bookings/my-rental?phone=${phone}`);
        const data = await response.json();
        document.getElementById('global-loader').classList.add('hidden');
        document.getElementById('my-bike-modal').classList.remove('hidden');

        // ✨ LIVE TELEMATICS SIMULATION ✨
        // ✨ LIVE TELEMATICS & LOW BATTERY NOTIFICATIONS ✨
        if (data.booking.status === 'Handed') {
            // Calculate EXACT battery based on time since they picked it up or last swapped it
            const lastSwapTime = data.booking.lastSwapDate ? new Date(data.booking.lastSwapDate) : new Date(data.booking.handedDate);
            const minutesSinceSwap = (new Date() - lastSwapTime) / (1000 * 60);
            
            // Simulation: Bike loses 1% battery every 5 minutes (Change this math for faster/slower drain)
            let simulatedBattery = 100 - Math.floor(minutesSinceSwap * 0.2); 
            
            if (simulatedBattery > 100) simulatedBattery = 100;
            if (simulatedBattery < 5) simulatedBattery = 5; // Absolute minimum

            const maxRange = data.bike ? data.bike.rangeKms : 80;
            const simulatedRange = Math.round(maxRange * (simulatedBattery / 100));

            document.getElementById('live-battery-text').innerText = simulatedBattery;
            document.getElementById('live-battery-fill').style.height = `${simulatedBattery}%`;
            document.getElementById('live-range-text').innerText = `${simulatedRange} km`;
            
            document.getElementById('my-bike-motor').innerText = "MOTOR ACTIVE";
            document.getElementById('my-bike-motor').style.color = "#4ade80";
            document.getElementById('my-bike-motor').style.borderColor = "rgba(74, 222, 128, 0.4)";
            document.getElementById('my-bike-motor').style.background = "rgba(74, 222, 128, 0.2)";

            // 🚨 LOW BATTERY APP NOTIFICATION 🚨
            if (simulatedBattery <= 25 && !window.lowBatteryNotified) {
                document.getElementById('live-battery-fill').style.background = 'linear-gradient(to top, #ef4444, #f87171)';
                document.getElementById('live-battery-text').style.color = '#f87171';
                
                openCustomAlert(
                    "Low Battery Warning 🪫", 
                    `Your vehicle is down to ${simulatedBattery}%. Please navigate to the nearest Swap Hub to exchange your battery.`, 
                    "fa-battery-quarter", 
                    "#e53e3e", 
                    "Find Hub", 
                    () => openStationsScreen() // Automatically opens the map when they click "Find Hub"
                );
                window.lowBatteryNotified = true; // Stops it from popping up every single second
            } else if (simulatedBattery > 25) {
                document.getElementById('live-battery-fill').style.background = 'linear-gradient(to top, #22c55e, #10b981)';
                document.getElementById('live-battery-text').style.color = 'white';
                window.lowBatteryNotified = false;
            }
            
        } else {
            // Parked Status (Before Handover)
            document.getElementById('live-battery-text').innerText = '100';
            document.getElementById('live-battery-fill').style.height = '100%';
            document.getElementById('live-range-text').innerText = `${data.bike ? data.bike.rangeKms : 80} km`;
            document.getElementById('my-bike-motor').innerText = "PARKED & LOCKED";
            document.getElementById('my-bike-motor').style.color = "#f87171";
            document.getElementById('my-bike-motor').style.borderColor = "rgba(248, 113, 113, 0.4)";
            document.getElementById('my-bike-motor').style.background = "rgba(248, 113, 113, 0.1)";
        }

        if (!data.hasRental) {
            document.getElementById('my-bike-content').classList.add('hidden');
            document.getElementById('no-bike-content').classList.remove('hidden');
            return;
        }

        document.getElementById('no-bike-content').classList.add('hidden');
        document.getElementById('my-bike-content').classList.remove('hidden');

        let imgSrc = data.bike && data.bike.imageUrl && data.bike.imageUrl.startsWith('/uploads/') ? 'http://localhost:3000' + data.bike.imageUrl : (data.bike ? data.bike.imageUrl : '');
        document.getElementById('my-bike-img').src = imgSrc;
        document.getElementById('my-bike-model').innerText = data.booking.bikeModel;

        if (document.getElementById('my-bike-type')) document.getElementById('my-bike-type').innerText = data.bike ? data.bike.type : 'N/A';
        if (document.getElementById('my-bike-range')) document.getElementById('my-bike-range').innerText = data.bike ? `${data.bike.rangeKms} km / charge` : 'N/A';

        const payDate = new Date(data.booking.paymentDate);
        document.getElementById('my-bike-paydate').innerText = payDate.toLocaleDateString();
        document.getElementById('my-bike-status').innerText = data.booking.status === 'Handed' ? 'Active & Riding' : 'Awaiting Pickup';

        const mapContainer = document.getElementById('my-bike-map-container');
        if (mapContainer) {
            if (data.booking.status === 'Paid') {
                mapContainer.classList.remove('hidden');
                document.getElementById('my-bike-map-link').href = data.booking.pickupLocation;
            } else {
                mapContainer.classList.add('hidden');
            }
        }

        if (document.getElementById('my-bike-handeddate')) document.getElementById('my-bike-handeddate').innerText = data.booking.handedDate ? new Date(data.booking.handedDate).toLocaleDateString() : 'Awaiting Pickup';
        if (document.getElementById('my-bike-duedate')) document.getElementById('my-bike-duedate').innerText = data.booking.dueDate ? new Date(data.booking.dueDate).toLocaleDateString() : 'Calculated at Pickup';
        if (document.getElementById('my-bike-renewals')) document.getElementById('my-bike-renewals').innerText = data.booking.renewalCount > 0 ? `${data.booking.renewalCount} Times` : '0';

        const unlockDate = new Date(payDate.getTime());
        unlockDate.setDate(unlockDate.getDate() + 26);
        const today = new Date();
        const btn = document.getElementById('renewal-btn');

        if (today >= unlockDate) {
            btn.className = "btn btn-primary w-100"; btn.innerText = "Renew Subscription Now";
            btn.onclick = function () {
                const standardRent = data.bike ? data.bike.price : 0;
                document.getElementById('renewal-bike-name').innerText = data.booking.bikeModel;
                if (document.getElementById('renewal-rent')) document.getElementById('renewal-rent').innerText = standardRent;
                if (document.getElementById('renewal-total')) document.getElementById('renewal-total').innerText = standardRent;

                document.getElementById('my-bike-modal').classList.add('hidden');
                document.getElementById('renewal-modal').classList.remove('hidden');
                document.getElementById('confirm-renewal-btn').onclick = () => processRenewalPayment(standardRent, phone);
            };
        } else {
            btn.className = "btn btn-disabled w-100"; btn.innerText = "Renewal Locked";
            const formattedUnlockDate = unlockDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            btn.onclick = function () {
                openCustomAlert(
                    "Renewal Locked 🔒",
                    `Your current cycle is still active.\n\nThe renewal button will automatically unlock on:\n📅 ${formattedUnlockDate}`,
                    "fa-lock",
                    "#dd6b20",
                    "Understood"
                );
            };
        }
    } catch (error) { document.getElementById('global-loader').classList.add('hidden'); }
}


// --- ✨ LIVE MAPS & GEOLOCATION LOGIC ✨ ---
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
}

async function openStationsScreen() {
    document.getElementById('user-sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.add('hidden');
    goToScreen('stations-screen');
    
    const grid = document.getElementById('user-stations-grid');
    grid.innerHTML = '<div class="loader mt-20"></div>';

    if (!window.swapMap) {
        const telanganaBounds = [[15.8000, 77.2000], [19.9500, 81.0000]];
        window.swapMap = L.map('swap-map', {
            maxBounds: telanganaBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 6
        }).setView([17.8749, 79.1124], 7);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.swapMap);
    } else {
        window.swapMap.eachLayer((l) => { if (l instanceof L.Marker) l.remove(); });
    }
    
    setTimeout(() => { window.swapMap.invalidateSize(); }, 400);
    
    try {
        const res = await fetch('/api/stations');
        let stations = await res.json();
        const bounds = L.latLngBounds();
        let hasValidPoints = false;
        
        const markersCluster = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50 
        });

        stations.forEach(s => {
            const exactLat = parseFloat(s.lat);
            const exactLng = parseFloat(s.lng);

            if(!isNaN(exactLat) && !isNaN(exactLng)) {
                const marker = L.marker([exactLat, exactLng]).addTo(window.swapMap);
                
                marker.bindTooltip(`
                    <div style="text-align: center; min-width: 140px; padding: 5px;">
                        <b style="color: #007bff;">${s.name}</b><br>
                        <span style="color: #27ae60; font-weight: bold;">🔋 ${s.batteriesAvailable} Available</span><br>
                        <div style="margin-top:5px; color:#007bff; font-size:0.75rem;">
                            <i class="fa-solid fa-diamond-turn-right"></i> Click to Navigate
                        </div>
                    </div>`, { sticky: true });

                // Fix: Correct Google Maps URL and exactLat variable
                marker.on('click', () => window.open(`https://maps.google.com/?q=${exactLat},${exactLng}`, '_blank'));
                markersCluster.addLayer(marker);
                bounds.extend([exactLat, exactLng]);
                hasValidPoints = true;
            }
        });
        window.swapMap.addLayer(markersCluster);

        if (hasValidPoints) {
            window.swapMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const uLat = pos.coords.latitude;
                const uLng = pos.coords.longitude;
                stations.forEach(s => s.distance = calculateDistance(uLat, uLng, s.lat, s.lng));
                stations.sort((a, b) => a.distance - b.distance);
                renderStationCards(stations, true);
            }, () => renderStationCards(stations, false));
        } else {
            renderStationCards(stations, false);
        }
    } catch (e) { grid.innerHTML = '<p>Error loading stations.</p>'; }
}

function renderStationCards(stations, hasGPS) {
    const grid = document.getElementById('user-stations-grid');
    grid.innerHTML = '';
    stations.forEach((s, idx) => {
        const isNearest = hasGPS && idx === 0;
        grid.innerHTML += `
            <div class="card solid-card" style="width: 100%; ${isNearest ? 'border: 2px solid #2ecc71;' : 'border-left: 5px solid #2ecc71;'}">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <h3>${s.name}</h3>
                        <p class="text-sm"><i class="fa-solid fa-location-dot"></i> ${s.address}</p>
                        ${hasGPS ? `<span class="text-red font-bold">${s.distance} km away</span>` : ''}
                        <div style="margin-top: 10px;">
                            <span style="background: #e6ffed; color: #10b981; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                                🔋 ${s.batteriesAvailable} Batteries Available
                            </span>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="window.open('https://maps.google.com/?q=${s.lat},${s.lng}', '_blank')">
                        <i class="fa-solid fa-diamond-turn-right"></i> Navigate
                    </button>
                </div>
            </div>`;
    });
}
// ==========================================
// ✨ BATTERY EXCHANGE & GEOFENCE WORKFLOW ✨
// ==========================================
let currentSwapStationId = null;
let currentSwapStationLat = null;
let currentSwapStationLng = null;

function openSwapAction(stationId, stationName, lat, lng) {
    currentSwapStationId = stationId;
    currentSwapStationLat = lat; // Store destination Latitude
    currentSwapStationLng = lng; // Store destination Longitude
    
    document.getElementById('swap-dest-name').innerText = stationName;
    document.getElementById('swap-maps-btn').href = `https://maps.google.com/?q=${lat},${lng}`;
    document.getElementById('swap-action-modal').classList.remove('hidden');
}

// ✨ NEW: GPS Geofence Security Check
function markStationReached() {
    if (!navigator.geolocation) {
        return showToast("GPS is not supported on this device.", "error");
    }

    // Change button to show it is tracking them
    const btn = document.querySelector('#swap-action-modal .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Location...';
    btn.disabled = true;

    // Ping their exact GPS coordinates right now
    navigator.geolocation.getCurrentPosition((pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        
        // Calculate distance between user and the hub (in km)
        const distanceStr = calculateDistance(userLat, userLng, currentSwapStationLat, currentSwapStationLng);
        const distanceKm = parseFloat(distanceStr);

        btn.innerHTML = originalText;
        btn.disabled = false;

        // SECURITY: Are they within 300 meters (0.3 km) of the Hub?
        if (distanceKm <= 0.3) {
            document.getElementById('swap-action-modal').classList.add('hidden');
            openCustomAlert(
                "Exchange Battery", 
                "Location verified! ✅\n\nPlease hand over your empty battery to the staff. Confirm below to instantly update your vehicle's telematics to 100%.", 
                "fa-battery-full", 
                "#2ecc71", 
                "Confirm Exchange", 
                processBatterySwap
            );
        } else {
            // Block them! They are too far away!
            openCustomAlert(
                "Location Mismatch ❌", 
                `Geofence locked. You are still ${distanceKm} km away from the hub.\n\nYou must be physically at the location to confirm the exchange.`, 
                "fa-location-crosshairs", 
                "#e53e3e", 
                "Understood"
            );
        }
    }, (err) => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast("Failed to get your location. Please turn on your phone's GPS location.", "error");
    }, {
        enableHighAccuracy: true, // Forces phone to use real GPS, not just WiFi estimation
        timeout: 10000,
        maximumAge: 0
    });
}

async function processBatterySwap() {
    const phone = localStorage.getItem('easyDriveUser');
    document.getElementById('global-loader').classList.remove('hidden');
    document.getElementById('loader-text').innerText = "Exchanging Battery...";

    try {
        const res = await fetch('/api/bookings/swap', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, stationId: currentSwapStationId })
        });
        const data = await res.json();
        document.getElementById('global-loader').classList.add('hidden');

        if (data.success) {
            openCustomAlert("Battery Exchanged! 🔋", "Your vehicle is now back at 100%. Safe travels!", "fa-bolt", "#27ae60", "View Dashboard", () => viewMyBike());
            window.lowBatteryNotified = false; 
        } else {
            showToast(data.error, "error");
        }
    } catch (e) {
        document.getElementById('global-loader').classList.add('hidden');
        showToast("Error processing exchange.", "error");
    }
}

// ✨ LOAD SWAP HISTORY
async function viewSwapHistory() {
    const phone = localStorage.getItem('easyDriveUser');
    const list = document.getElementById('swap-history-list');
    list.innerHTML = '<div class="loader"></div>';
    openModal('swap-history-modal');

    try {
        const res = await fetch(`/api/bookings/swap-history?phone=${phone}`);
        const data = await res.json();
        list.innerHTML = data.length ? '' : '<p class="center-text">No swaps recorded yet.</p>';
        
        data.forEach(s => {
            list.innerHTML += `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #2ecc71;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:var(--text-main);">${s.stationName}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(s.date).toLocaleDateString()}</span>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;"><i class="fa-solid fa-location-dot"></i> ${s.stationAddress}</p>
                </div>`;
        });
    } catch (e) { list.innerHTML = 'Error loading history.'; }
}

// ✨ FAQ TOGGLE
function toggleFAQ(element) {
    element.classList.toggle('active');
}