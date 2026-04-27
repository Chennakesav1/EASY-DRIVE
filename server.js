require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
const Tesseract = require('tesseract.js');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const app = express();
app.use(express.json());
app.use(express.static('public')); 
app.use('/uploads', express.static('uploads'));
app.use(cors()); 

const sharp = require('sharp');




// ==========================================
// 1. CONFIGURATIONS (Cloudinary, Razorpay, Email)
// ==========================================
cloudinary.config({
    cloud_name: 'dardyxy2c', 
    api_key: '644861536225427', 
    api_secret: 'OX_dUF5ouolpHxkqblVCMOkTty8' 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'easydrive_uploads', allowedFormats: ['jpg', 'png', 'jpeg', 'webp'] }
});
const upload = multer({ storage: storage });

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SeZV1cRJuCN2TK",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "YourSecret"
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ==========================================
// 2. DATABASE CONNECTION & SCHEMAS
// ==========================================
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/easydrive")
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.error("❌ MongoDB Connection CRASH:", err));

const User = mongoose.model('User', new mongoose.Schema({
    name: String, phone: String, email: String, 
    aadhaarUrl: String, panUrl: String, isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }, // ✨ NEW: Join Date
    lastLogin: { type: Date, default: Date.now }, paymentStatus: { type: String, default: 'Pending' },
    currentOtp: Number, otpExpiry: Date,
    referralCode: String, // ✨ NEW: User's unique code
    referredBy: { type: String, default: 'None' }, // ✨ NEW: Who referred them
    walletBalance: { type: Number, default: 0 } // ✨ NEW: Referral Cash
}));

const Bike = mongoose.model('Bike', new mongoose.Schema({
    model: String, type: String, rangeKms: Number, speed: { type: Number, default: 45 },
    deposit: { type: Number, default: 1000 }, price: Number, discount: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 }, imageUrl: String, locationLink: String, batteryLevel: { type: Number, default: 100 }
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
    phone: String, bikeModel: String, paymentId: String, amount: Number, pickupLocation: String,
    status: { type: String, default: 'Paid' }, paymentDate: { type: Date, default: Date.now },
    handedDate: Date, dueDate: Date, customerPhotoUrl: String, returnDate: Date, returnReason: String,
    renewalCount: { type: Number, default: 0 }, lastRenewalDate: Date,
    lastSwapDate: { type: Date, default: Date.now } // ✨ NEW: Tracks battery level over time
}));
const Payment = mongoose.model('Payment', new mongoose.Schema({
    phone: String, paymentId: String, amount: Number, status: String, createdAt: { type: Date, default: Date.now }
}));
const Swap = mongoose.model('Swap', new mongoose.Schema({
    phone: String,
    stationName: String,
    stationAddress: String,
    date: { type: Date, default: Date.now }
}));

const Returned = mongoose.model('Returned', new mongoose.Schema({
    phone: String, bikeModel: String, returnReason: String, returnDate: { type: Date, default: Date.now }
}));

const Complaint = mongoose.model('Complaint', new mongoose.Schema({
    phone: String, issue: String, imageUrl: String, status: { type: String, default: 'Pending' }, createdAt: { type: Date, default: Date.now }
}));

const Station = mongoose.model('Station', new mongoose.Schema({
    name: String, address: String, lat: Number, lng: Number, batteriesAvailable: { type: Number, default: 10 }
}));

const Promo = mongoose.model('Promo', new mongoose.Schema({
    code: String, discountAmount: Number, usedBy: { type: [String], default: [] }, createdAt: { type: Date, default: Date.now }
}));

// ==========================================
// 3. AUTHENTICATION, KYC & REFERRALS
// ==========================================
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, phone, referralCode } = req.body;
        if (await User.findOne({ phone })) return res.status(400).json({ error: "Phone number already registered." });
        
        // ✨ Generate Unique Referral Code (First 3 of name + Last 4 of phone)
        const myReferralCode = (name.substring(0, 3) + phone.substring(6)).toUpperCase();
        let referredByPhone = "None";
        let initialWallet = 0;

        // ✨ Check if they applied a friend's referral code
        if (referralCode) {
            const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
            if (referrer) {
                referredByPhone = referrer.phone;
                initialWallet = 100; // Give new user ₹100
                referrer.walletBalance += 100; // Give referrer ₹100
                await referrer.save();
            }
        }

        await new User({ 
            name, email, phone, isVerified: false, 
            referralCode: myReferralCode, referredBy: referredByPhone, walletBalance: initialWallet 
        }).save();

        res.json({ success: true, message: "Account created successfully!" });
    } catch (error) { res.status(500).json({ error: "Signup failed." }); }
});

app.post('/api/auth/send-login-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ error: "Phone number not registered." });
        
        const otp = Math.floor(1000 + Math.random() * 9000);
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); 
        
        await User.findOneAndUpdate({ phone }, { $set: { currentOtp: otp, otpExpiry: expiryTime } });
        await sendMetaWhatsApp(phone, 'easy_drive_otp', [otp]);
        res.json({ success: true, message: "WhatsApp OTP sent successfully!" });
    } catch (error) { res.status(500).json({ error: "Failed to process request." }); }
});

app.post('/api/auth/verify-login', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const user = await User.findOne({ phone });
        if (!user || user.currentOtp !== parseInt(otp)) return res.status(400).json({ error: "Invalid OTP." });
        if (new Date() > user.otpExpiry) return res.status(400).json({ error: "OTP expired." });
        
        user.lastLogin = new Date();
        await user.save();
        res.json({ success: true, isVerified: user.isVerified, user });
    } catch (error) { res.status(500).json({ error: "Login failed." }); }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.query.phone });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ 
            name: user.name, email: user.email, phone: user.phone, 
            aadhaarUrl: user.aadhaarUrl, panUrl: user.panUrl, isVerified: user.isVerified,
            referralCode: user.referralCode, walletBalance: user.walletBalance // ✨ Fetch Referral Info
        });
    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});


app.post('/api/upload', upload.fields([{ name: 'aadhaar' }, { name: 'pan' }]), async (req, res) => {
    try {
        const { phone, manualPan, manualAadhaar } = req.body;
        if (!req.files || !req.files.pan || !req.files.aadhaar) return res.status(400).json({ error: "Missing document images" });

        let panText = "", aadhaarText = "";
        try {
            // ✨ BULLETPROOF SPEED HACK ✨
            // .rotate() automatically reads phone EXIF data and flips sideways photos upright!
            // .normalize() boosts the contrast so the text is incredibly easy to read.
            const [panBuffer, aadhaarBuffer] = await Promise.all([
                sharp(req.files.pan[0].path).rotate().resize({ width: 1200 }).normalize().grayscale().jpeg().toBuffer(),
                sharp(req.files.aadhaar[0].path).rotate().resize({ width: 1200 }).normalize().grayscale().jpeg().toBuffer()
            ]);

            // We go back to standard 'eng' (No more crashing OSD brain)
            // It runs both cards at the exact same time using the highly optimized images
            const [panResult, aadhaarResult] = await Promise.all([
                Tesseract.recognize(panBuffer, 'eng'),
                Tesseract.recognize(aadhaarBuffer, 'eng')
            ]);
            
            panText = panResult.data.text.toUpperCase();
            aadhaarText = aadhaarResult.data.text.toUpperCase();
            
        } catch (ocrError) { 
            console.error("AI Crash:", ocrError);
            return res.status(400).json({ error: "Could not read images. Take a clearer photo." }); 
        }

        const cleanPanText = panText.replace(/[^A-Z0-9]/g, '');
        const cleanAadhaarText = aadhaarText.replace(/[^0-9]/g, '');
        const panChunk = manualPan ? manualPan.substring(2, 6) : "INVALID_PAN";
        const aadhaarChunk = manualAadhaar ? manualAadhaar.substring(4, 8) : "INVALID_ID";

        const isPanValid = cleanPanText.includes(panChunk) || panText.includes("INCOME TAX") || panText.includes("INCOME");
        const isAadhaarValid = cleanAadhaarText.includes(aadhaarChunk) || aadhaarText.includes("GOVERNMENT") || aadhaarText.includes("INDIA");

        if (!isPanValid || !isAadhaarValid) return res.status(400).json({ error: "Upload rejected. Image does not match entered details." });

        await User.findOneAndUpdate({ phone }, { $set: { isVerified: true, panUrl: req.files.pan[0].path, aadhaarUrl: req.files.aadhaar[0].path }});
        return res.json({ message: "Verified Successfully!" });
    } catch (error) { res.status(500).json({ error: "Verification system failed." }); }
});

// ==========================================
// 4. PAYMENTS & RAZORPAY ROUTES
// ==========================================

// ✨ NEW HELPER: Generates the PDF Invoice automatically in the background ✨
async function createInvoicePDF(payment, user, booking, bike) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- Company Header ---
            doc.fontSize(26).fillColor('#27ae60').font('Helvetica-Bold').text('EASY DRIVE', { align: 'left' });
            doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Premium EV Rentals - Hyderabad', { align: 'left' });
            doc.moveDown(0.5);
            doc.fillColor('#333333').text('Phone: +91 7989004552');
            doc.text('Email: chennakesavarao89@gmail.com');
            
            // --- Divider ---
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#dddddd');
            doc.moveDown();
            
            doc.fontSize(18).fillColor('#333333').font('Helvetica-Bold').text('PAYMENT RECEIPT / INVOICE', { align: 'center' });
            doc.moveDown();

            // --- Customer & Transaction Details ---
            const startY = doc.y;
            doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text('Customer Details:', 50, startY);
            doc.font('Helvetica').text(`Name: ${user && user.name ? user.name : 'Guest'}`);
            doc.text(`Phone: +91 ${payment.phone}`);
            if(user && user.email) doc.text(`Email: ${user.email}`);
            
            doc.font('Helvetica-Bold').text('Transaction Details:', 350, startY);
            doc.font('Helvetica').text(`ID: ${payment.paymentId}`, 350, startY + 15);
            doc.text(`Date: ${new Date(payment.createdAt).toLocaleString()}`, 350, startY + 30);
            doc.text(`Status: ${payment.status}`, 350, startY + 45);
            doc.moveDown(3);

            // --- Payment Table ---
            doc.x = 50; 
            const tableTop = doc.y;
            doc.rect(50, tableTop, 500, 30).fill('#f4f7f6').stroke('#dddddd');
            doc.fillColor('#000').font('Helvetica-Bold').text('Description', 60, tableTop + 10);
            doc.text('Amount', 450, tableTop + 10);
            
            doc.moveDown(1.5);
            doc.font('Helvetica');
            const desc = booking ? `Vehicle Rental: ${booking.bikeModel}` : 'Vehicle Rental / Subscription Renewal';
            doc.text(desc, 60, doc.y);
            doc.text(`INR ${payment.amount}.00`, 450, doc.y);
            
            // --- Total ---
            doc.moveDown(2);
            doc.moveTo(350, doc.y).lineTo(550, doc.y).stroke('#dddddd');
            doc.moveDown(0.5);
            doc.fontSize(14).font('Helvetica-Bold').text(`Total Paid: INR ${payment.amount}.00`, { align: 'right' });
            
            // --- Bike Image Fetch ---
            if (bike && bike.imageUrl) {
                try {
                    let imgBuffer;
                    if (bike.imageUrl.startsWith('http')) {
                        const response = await fetch(bike.imageUrl);
                        const arrayBuffer = await response.arrayBuffer();
                        imgBuffer = Buffer.from(arrayBuffer);
                    } else {
                        const fs = require('fs'); const path = require('path');
                        imgBuffer = fs.readFileSync(path.join(__dirname, bike.imageUrl));
                    }
                    doc.moveDown(2); const imageY = doc.y;
                    doc.fontSize(12).font('Helvetica-Bold').text('Vehicle Rented:', 50, imageY);
                    doc.image(imgBuffer, 50, imageY + 20, { width: 220, fit: [220, 150] });
                    doc.y = imageY + 180;
                } catch (imgErr) { console.log("Could not load image for PDF", imgErr.message); }
            }

            // --- Footer ---
            doc.y = 700; 
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#dddddd');
            doc.moveDown();
            doc.fontSize(10).font('Helvetica').fillColor('#888888').text('Thank you for choosing eco-friendly transit with Easy Drive.', { align: 'center' });
            doc.text('For support, contact us at +91 7989004552 or chennakesavarao89@gmail.com', { align: 'center' });

            doc.end(); 
        } catch (err) { reject(err); }
    });
}

app.post('/api/payment/create-order', async (req, res) => {
    try {
        const order = await razorpay.orders.create({ amount: req.body.amount * 100, currency: "INR", receipt: "rcpt_" + Date.now() });
        res.json({ success: true, order });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/payment/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, phone, amount, bikeModel, pickupLocation, promoCode } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "YourSecret").update(sign.toString()).digest("hex");

    if (razorpay_signature === expectedSign) {
        const newPayment = await new Payment({ phone, paymentId: razorpay_payment_id, amount, status: 'Success' }).save();
        const newBooking = await new Booking({ phone, bikeModel, paymentId: razorpay_payment_id, amount, pickupLocation }).save();
        await Bike.findOneAndUpdate({ model: bikeModel }, { $inc: { quantity: -1 } });

        if (promoCode) await Promo.findOneAndUpdate({ code: promoCode.toUpperCase() }, { $push: { usedBy: phone } });

        try {
            const user = await User.findOne({ phone: phone });
            const bike = await Bike.findOne({ model: bikeModel });
            
            // 1. Send WhatsApp Notification
            await sendMetaWhatsApp(phone, 'payment_confirmed', [user && user.name ? user.name : "Rider", amount, bikeModel, pickupLocation]);
            
            // 2. ✨ BEAUTIFUL EMAIL WITH PDF ATTACHMENT ✨
            if (user && user.email) {
                const pdfBuffer = await createInvoicePDF(newPayment, user, newBooking, bike);

                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); padding: 30px 20px; text-align: center; color: white;">
                            <h1 style="margin: 0; font-size: 24px;">Booking Confirmed! 🎉</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your ride is ready for pickup.</p>
                        </div>
                        <div style="padding: 30px; background: #ffffff;">
                            <p style="font-size: 16px; color: #333;">Hi <strong>${user.name || 'Rider'}</strong>,</p>
                            <p style="font-size: 16px; color: #555; line-height: 1.5;">Thank you for choosing <strong>Easy Drive</strong>. Your payment of <strong style="color: #27ae60;">₹${amount}</strong> was successful.</p>
                            
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                                <h3 style="margin-top: 0; color: #2d3748; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px;">Booking Summary</h3>
                                <p style="margin: 8px 0; color: #4a5568;"><strong>Vehicle:</strong> ${bikeModel}</p>
                                <p style="margin: 8px 0; color: #4a5568;"><strong>Payment ID:</strong> <span style="font-family: monospace;">${razorpay_payment_id}</span></p>
                                <p style="margin: 8px 0; color: #4a5568;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                                <a href="${pickupLocation}" style="display: inline-block; margin-top: 15px; background: #007bff; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold;">📍 Open Maps for Pickup</a>
                            </div>
                            
                            <p style="font-size: 15px; color: #555;">We have attached your official PDF invoice to this email for your records.</p>
                            
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                            <p style="font-size: 14px; color: #718096; margin: 0;">Ride Safe & Stay Green 🍃</p>
                            <p style="font-size: 14px; color: #2d3748; font-weight: bold; margin: 5px 0 0 0;">The Easy Drive Team</p>
                        </div>
                    </div>
                `;

                transporter.sendMail({
                    from: `"Easy Drive 🛵" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: `Your Easy Drive Booking: ${bikeModel} 🚀`,
                    html: emailHtml,
                    attachments: [{
                        filename: `EasyDrive_Invoice_${razorpay_payment_id}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }]
                });
            }
        } catch (err) { console.log("Notification failed", err); }
        res.json({ success: true, message: "Payment verified successfully" });
    } else {
        await new Payment({ phone, paymentId: razorpay_payment_id || 'Invalid', amount, status: 'Failed (Invalid Signature)' }).save();
        res.status(400).json({ success: false, message: "Invalid signature." });
    }
});

app.post('/api/payment/failed', async (req, res) => {
    await new Payment({ phone: req.body.phone, paymentId: 'N/A', amount: req.body.amount, status: 'Failed - ' + req.body.errorDesc }).save();
    res.json({ success: true });
});

app.get('/api/payments', async (req, res) => {
    try { res.json(await Payment.find({ phone: req.query.phone }).sort({ createdAt: -1 })); } 
    catch (error) { res.status(500).json({ error: "Failed to fetch." }); }
});

app.get('/api/payments/:paymentId/invoice', async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId });
        if (!payment) return res.status(404).send("Invoice not found.");
        
        const user = await User.findOne({ phone: payment.phone });
        const booking = await Booking.findOne({ paymentId: payment.paymentId });
        let bike = null;
        if (booking) bike = await Bike.findOne({ model: booking.bikeModel });

        // Reuse the exact same PDF generator for the Admin Panel!
        const pdfBuffer = await createInvoicePDF(payment, user, booking, bike);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=EasyDrive_Invoice_${payment.paymentId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) { 
        console.error("Invoice Error:", error); 
        if(!res.headersSent) res.status(500).send("Error generating invoice."); 
    }
});

// ==========================================
// 5. INVENTORY & BIKES ROUTES
// ==========================================
app.get('/api/bikes', async (req, res) => {
    try { res.json(await Bike.find({})); } catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/admin/bikes', async (req, res) => {
    try { res.json(await Bike.find({})); } catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/admin/bikes', upload.single('bikeImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Image required." });
        await new Bike({ ...req.body, imageUrl: req.file.path }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to save." }); }
});

app.put('/api/admin/bikes/:id', async (req, res) => {
    try { await Bike.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.delete('/api/admin/bikes/:id', async (req, res) => {
    try { await Bike.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// ==========================================
// 6. BOOKINGS, HANDOVERS & RETURNS
// ==========================================
app.get('/api/bookings/my-rental', async (req, res) => {
    try {
        const booking = await Booking.findOne({ phone: req.query.phone, status: { $in: ['Paid', 'Handed'] } }).sort({ paymentDate: -1 });
        if (!booking) return res.json({ hasRental: false });
        const bike = await Bike.findOne({ model: booking.bikeModel });
        res.json({ hasRental: true, booking, bike });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/bookings/active', async (req, res) => {
    try {
        const booking = await Booking.findOne({ phone: req.query.phone, status: 'Paid' }).sort({ paymentDate: -1 });
        res.json({ booking });
    } catch (e) { 
        res.status(500).json({ error: "Failed to fetch active booking" }); 
    }
});

app.get('/api/bookings/check-eligibility', async (req, res) => {
    try {
        const activeBooking = await Booking.findOne({ phone: req.query.phone, status: { $in: ['Paid', 'Handed'] } });
        res.json({ canBook: !activeBooking });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/bookings/renew', async (req, res) => {
    try {
        const { phone, amount, paymentId } = req.body;
        const booking = await Booking.findOne({ phone: phone, status: 'Handed' });
        if (!booking) return res.status(400).json({ error: "No active rental found." });

        const newDue = new Date(new Date(booking.dueDate).getTime() + (28 * 24 * 60 * 60 * 1000));
        booking.dueDate = newDue; booking.renewalCount += 1; booking.lastRenewalDate = new Date();
        await booking.save();
        await new Payment({ phone, paymentId: paymentId || 'REN_' + Date.now(), amount, status: 'Success (Renewal)' }).save();
        res.json({ success: true, newDueDate: newDue });
    } catch (error) { res.status(500).json({ error: "Renewal failed." }); }
});

app.get('/api/admin/all-bookings', async (req, res) => {
    try { res.json(await Booking.find({ status: { $ne: 'Returned' } }).sort({ paymentDate: -1 })); } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/admin/bookings/:id/handover', upload.single('customerPhoto'), async (req, res) => {
    try {
        const handedDate = new Date();
        const dueDate = new Date(handedDate.getTime() + (28 * 24 * 60 * 60 * 1000));
        await Booking.findByIdAndUpdate(req.params.id, { status: 'Handed', handedDate, dueDate, customerPhotoUrl: req.file.path });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/admin/bookings/:id/return', async (req, res) => {
    try {
        const { reason, bikeModel } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        await new Returned({ phone: booking.phone, bikeModel, returnReason: reason }).save();
        await Booking.findByIdAndDelete(req.params.id);

        if (!reason.includes('Damaged')) await Bike.findOneAndUpdate({ model: bikeModel }, { $inc: { quantity: 1 } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/admin/returned-list', async (req, res) => {
    try {
        const returns = await Returned.find().sort({ returnDate: -1 }).lean();
        const data = await Promise.all(returns.map(async r => {
            const user = await User.findOne({ phone: r.phone }).lean();
            return { ...r, customerName: user && user.name ? user.name : 'Pending KYC' };
        }));
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/admin/damage-list', async (req, res) => {
    try {
        const damaged = await Returned.find({ returnReason: { $regex: 'Damage', $options: 'i' } }).sort({ returnDate: -1 }).lean();
        const data = await Promise.all(damaged.map(async d => {
            const user = await User.findOne({ phone: d.phone }).lean();
            return { ...d, customerName: user && user.name ? user.name : 'Pending KYC' };
        }));
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/admin/repair-complete', async (req, res) => {
    try {
        await Returned.findByIdAndUpdate(req.body.bookingId, { returnReason: "Repaired & Restocked" });
        await Bike.findOneAndUpdate({ model: req.body.bikeModel }, { $inc: { quantity: 1 } });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});
// --- ✨ NEW: BATTERY SWAP LOGIC ✨ ---
app.post('/api/bookings/swap', async (req, res) => {
    try {
        const { phone, stationId } = req.body;
        const booking = await Booking.findOne({ phone: phone, status: 'Handed' });
        if (!booking) return res.status(400).json({ error: "No active vehicle." });

        const station = await Station.findById(stationId);
        
        // 1. Save the History Record ✨
        await new Swap({ 
            phone, 
            stationName: station ? station.name : "Unknown Hub",
            stationAddress: station ? station.address : "N/A"
        }).save();

        // 2. Reset Battery & Update Station
        booking.lastSwapDate = new Date();
        await booking.save();
        if (stationId) await Station.findByIdAndUpdate(stationId, { $inc: { batteriesAvailable: -1 } });

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Swap failed" }); }
});


// --- ✨ NEW: GET USER SWAP HISTORY ✨ ---
app.get('/api/bookings/swap-history', async (req, res) => {
    try {
        const history = await Swap.find({ phone: req.query.phone }).sort({ date: -1 });
        res.json(history);
    } catch (e) { 
        res.status(500).json({ error: "Failed to fetch history" }); 
    }
});
// ==========================================
// 7. PROMOS, ADMIN & OTHER ROUTES
// ==========================================
app.post('/api/admin/login', (req, res) => {
    if (req.body.key === "admin123") res.json({ success: true, token: "secure_admin_session_token" });
    else res.status(401).json({ error: "Invalid Key" });
});

// ✨ FETCH USERS WITH REFERRAL DATA
app.get('/api/admin/users', async (req, res) => {
    try { res.json(await User.find({}).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/admin/payments', async (req, res) => {
    try { res.json(await Payment.find({}).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/admin/payments/details/:paymentId', async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId }).lean();
        if (!payment) return res.status(404).json({ error: "Not found" });
        const user = await User.findOne({ phone: payment.phone }).lean();
        res.json({ name: user ? user.name : 'Customer', phone: payment.phone, email: user ? user.email : 'N/A', amount: payment.amount, status: payment.status, date: payment.createdAt, paymentId: payment.paymentId, method: "UPI/Card", bankDetails: "Razorpay Secure" });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/promo/validate', async (req, res) => {
    try {
        const promo = await Promo.findOne({ code: req.body.code.toUpperCase() });
        if (promo) {
            if (promo.usedBy.includes(req.body.phone)) return res.status(400).json({ error: "Code already used!" });
            res.json({ success: true, discount: promo.discountAmount, message: `Flat ₹${promo.discountAmount} Off Applied!` });
        } else { res.status(400).json({ error: "Invalid promo code." }); }
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/admin/promos', async (req, res) => {
    try { res.json(await Promo.find().sort({ createdAt: -1 })); } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/admin/broadcast', async (req, res) => {
    try {
        const { templateName, promoCode, discountAmount } = req.body;
        const codeUpper = promoCode.toUpperCase();
        if (!(await Promo.findOne({ code: codeUpper }))) await new Promo({ code: codeUpper, discountAmount }).save();
        res.json({ success: true, message: `Saved & Broadcasted!` });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.delete('/api/admin/promos/:id', async (req, res) => {
    try { await Promo.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/stations', async (req, res) => {
    try { res.json(await Station.find()); } catch (e) { res.status(500).json({ error: "Failed" }); }
});
app.post('/api/admin/stations', async (req, res) => {
    try { await new Station(req.body).save(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Failed" }); }
});
app.delete('/api/admin/stations/:id', async (req, res) => {
    try { await Station.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Failed" }); }
});

app.post('/api/complaints', upload.single('complaintImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Camera image required." });
        await new Complaint({ phone: req.body.phone, issue: req.body.issue, imageUrl: req.file.path }).save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.get('/api/complaints', async (req, res) => {
    try { res.json(await Complaint.find(req.query.phone ? { phone: req.query.phone } : {}).sort({ createdAt: -1 })); } 
    catch (error) { res.status(500).json({ error: "Failed" }); }
});

app.put('/api/admin/complaints/:id/solve', async (req, res) => {
    try { await Complaint.findByIdAndUpdate(req.params.id, { status: 'Solved' }); res.json({ success: true }); } 
    catch (error) { res.status(500).json({ error: "Failed" }); }
});

// ==========================================
// 8. UTILITIES (WhatsApp API)
// ==========================================
async function sendMetaWhatsApp(toPhone, templateName, variables = []) {
    const url = `https://graph.facebook.com/v18.0/${process.env.META_PHONE_ID}/messages`;
    const parameters = variables.map(val => ({ type: "text", text: String(val) }));
    const payload = { messaging_product: "whatsapp", to: `91${toPhone}`, type: "template", template: { name: templateName, language: { code: "en_US" }, components: parameters.length > 0 ? [{ type: "body", parameters }] : [] } };
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (data.error) console.error("Meta API Error:", data.error.message);
    } catch (error) { console.error("Failed to connect to Meta API:", error); }
}

// ==========================================
// 🚨 SERVER START 🚨
// ==========================================
// ==========================================
// 🚨 SERVER START 🚨
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('====================================');
    console.log(`🚀 Easy Drive Server is RUNNING on Port ${PORT}!`);
    console.log('====================================');
});