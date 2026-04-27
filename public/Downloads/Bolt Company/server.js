require('dotenv').config();






const { jsPDF } = require("jspdf");
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { google } = require('googleapis');

const adminOtpStore = {};
const QRCode = require('qrcode');


const masterKey = 'PRECIFAST_MASTER_ADMIN_KEY_2026';
const app = express();


// --- 1. Middleware ---
app.use(cors());

// INCREASE PAYLOAD LIMITS HERE (Change these two lines)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lock the public folder using the absolute path
app.use(express.static(path.join(__dirname, 'public')));
// Lock the public folder using the absolute path
app.use(express.static(path.join(__dirname, 'public')));


// --- GOOGLE SHEETS SETUP ---
const auth = new google.auth.GoogleAuth({
    keyFile: './google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets('v4');
const SPREADSHEET_ID = '14wxoe__iMEwl09TwUFIvxH2ah_9PxfrKdR6Kj4paiag';

// --- BULLETPROOF EMAIL TRANSPORTER ---
const myEmail = process.env.EMAIL_USER || process.env.GMAIL_USER;
const myPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

if (!myEmail || !myPass) {
    console.error("🚨 CRITICAL ERROR: Email credentials are missing from your .env file!");
} else {
    console.log(`📧 Transporter configuring for: ${myEmail}`);
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // Forces secure SSL connection
    secure: true,
    auth: {
        user: myEmail,
        pass: myPass
    }
});



// ==========================================
// 🛡️ ADMIN AUTHENTICATION ROUTES
// ==========================================

// 1. Send OTP to Director
app.post('/api/admin/send-otp', async (req, res) => {
    const { email } = req.body;

    // Check if it's your director email
    if (email !== 'chennakesavarao89@gmail.com') {
        return res.status(403).json({ success: false, message: "Unauthorized Email" });
    }

    // Generate a 6 digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    adminOtpStore[email] = { otp: otp, expires: Date.now() + 300000 }; // Valid for 5 mins

    try {
        await transporter.sendMail({
            from: `"Precifast Security" <${myEmail}>`,
            to: email,
            subject: "Admin Portal Access Code",
            text: `Your secure Admin Login OTP is: ${otp}. It will expire in 5 minutes.`
        });
        res.json({ success: true, message: "OTP sent to director email." });
    } catch (error) {
        console.error("Failed to send Admin OTP:", error);
        res.status(500).json({ success: false, message: "Failed to send email." });
    }
});

// ==========================================
// 🔑 ADMIN LOGIN (THE KEY MAKER)
// ==========================================
app.post('/api/admin/verify-otp', (req, res) => {
    try {
        const { email, otp } = req.body;
        const stored = adminOtpStore[email];

        if (stored && stored.otp === otp && stored.expires > Date.now()) {

            // THE EXACT SAME MASTER KEY
            const masterKey = 'PRECIFAST_MASTER_ADMIN_KEY_2026';

            // Generate the secure Admin Badge
            const token = jwt.sign({ email, role: 'admin' }, masterKey, { expiresIn: '12h' });

            delete adminOtpStore[email]; // Clear OTP
            res.json({ success: true, token });
        } else {
            res.status(401).json({ success: false, message: "Invalid or expired OTP." });
        }
    } catch (error) {
        console.error("🚨 OTP Verification Crash:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

transporter.verify(function (error, success) {
    if (error) {
        console.log("🚨 Transporter Login Error:", error.message);
    } else {
        console.log("✅ Email Server is securely connected to Gmail!");
    }
});

// --- 2. Database Connection ---
mongoose.connect('mongodb+srv://chennakesavarao89_db_user:chennakesava1234@bolt.gjmjgpv.mongodb.net/PrecifastDB?retryWrites=true&w=majority&appName=Bolt')
    .then(() => console.log("✅ Successfully connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// --- 3. Schemas & Models ---
// server.js - Find this schema and add "quality: String"

const orderSchema = new mongoose.Schema({
    razorpay_order_id: String,
    amount: Number,
    status: { type: String, default: 'Initiated' },
    paymentMethod: { type: String, default: 'Razorpay' },
    dueDate: Date,
    userEmail: String,
    shippingAddress: { name: String, email: String, phone: String, location: String, addressText: String },
    items: [{
        productId: String,
        productCode: String,
        name: String,
        qty: Number,
        price: Number,
        size: String,
        length: String,
        af: String,
        wtpc: String,
        quality: String      // <--- ADD THIS LINE FOR GRADE
    }],
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Update Product Schema to match your Excel Data
// server.js - Update your Product Schema
const productSchema = new mongoose.Schema({
    productCode: String,
    sector: String,
    name: String,
    quality: String,
    size: String,
    length: String,     // <--- ADD THIS
    af: String,         // <--- ADD THIS
    wtpc: String,       // <--- ADD THIS (Weight per piece)
    weight: String,     // Keeping this so old data doesn't break
    price: { type: Number, default: 0 },
    desc: String,
    img: { type: String, default: '' },
    stockQuantity: { type: Number, default: 0 }
});
const Product = mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otp: { type: String },
    otpExpiry: { type: Date },
    isVerified: { type: Boolean, default: false },
    addresses: [{
        name: String,
        email: String,
        phone: String,
        location: String,
        addressText: String
    }]
});
const User = mongoose.model('User', userSchema);

const applicationSchema = new mongoose.Schema({
    name: String, email: String, phone: String, degree: String, university: String,
    gradYear: Number, role: String, yearsExp: Number, skills: String,
    resumeFilePath: String, appliedAt: { type: Date, default: Date.now }
});
const Application = mongoose.model('Application', applicationSchema);

const leadSchema = new mongoose.Schema({
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', leadSchema);


// --- Middlewares ---
const verifyUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ success: false, message: "No token provided." });
    }
    try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: "Invalid Token." });
    }
};

// ==========================================
// 🛡️ ADMIN SECURITY GUARD (THE LOCK)
// ==========================================
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("🚨 Blocked: Missing or bad token format.");
        return res.status(401).json({ success: false, message: "Unauthorized: Missing Token" });
    }

    const token = authHeader.split(' ')[1];

    // THE MASTER KEY
    const masterKey = 'PRECIFAST_MASTER_ADMIN_KEY_2026';

    jwt.verify(token, masterKey, (err, user) => {
        if (err) {
            console.error("🚨 Blocked: Token Rejected!", err.message);
            return res.status(401).json({ success: false, message: "Unauthorized: Invalid Token" });
        }
        if (user.role !== 'admin') {
            console.error("🚨 Blocked: User is not an admin!");
            return res.status(403).json({ success: false, message: "Forbidden: Admins Only" });
        }

        req.user = user; // Let them pass!
        next();
    });
};




// --- 4. Configurations (Razorpay, Multer) ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// A. Product Images Upload
const productUploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}
const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, productUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bolt-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadProduct = multer({ storage: productStorage });

// B. Resumes Upload
const resumeDir = path.join(__dirname, 'public', 'uploads', 'resumes');
if (!fs.existsSync(resumeDir)) {
    fs.mkdirSync(resumeDir, { recursive: true });
}
const resumeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, resumeDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'resume-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadResume = multer({ storage: resumeStorage });


const generateInvoiceBuffer = (order) => {
    const doc = new jsPDF();
    const address = order.shippingAddress || {};

    // 1. Company Header
    doc.setFontSize(22);
    doc.setTextColor(255, 153, 0);
    doc.text("PRECIFAST PVT LTD", 190, 20, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Industrial Manufacturing Bolts", 190, 26, { align: "right" });
    doc.text("DNO 2-360/1,kolumalapalli,BETAMCHERLA,Nandyala,518599,AP,INDIA.", 190, 32, { align: "right" });

    // 2. Invoice Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("TAX INVOICE", 20, 45);

    doc.setFontSize(10);
    doc.text(`Order ID: ${order.razorpay_order_id}`, 20, 55);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, 62);
    doc.text(`Payment: ${order.paymentMethod}`, 20, 69);

    // 3. Bill To Section
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, 85);
    doc.setFont("helvetica", "normal");
    doc.text(`${address.name || "Valued Customer"}`, 20, 92);
    doc.text(`Phone: ${address.phone || "N/A"}`, 20, 99);

    const splitAddress = doc.splitTextToSize(address.addressText || "No Address Provided", 80);
    doc.text(splitAddress, 20, 106);

    // 4. Order Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 125, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("Full Technical Specifications & Item Details", 25, 132);
    doc.text("Amount", 185, 132, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // 5. Dynamic Items List
    let currentY = 145;

    // THE CRITICAL LOOP
    order.items.forEach(item => {
        const lineTotal = item.qty * item.price;

        // Main Line: Name and Qty
        doc.setFont("helvetica", "bold");
        doc.text(`${item.qty}x  ${item.name} (${item.productCode || 'N/A'})`, 25, currentY);
        doc.text(`INR ${lineTotal.toFixed(2)}`, 185, currentY, { align: "right" });

        // Sub Line: Technical Dimensions (WITH GRADE AND WEIGHT)
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const specs = `Grade: ${item.quality || 'N/A'} | Size: ${item.size} | Len: ${item.length || 'N/A'} | A/F: ${item.af || 'N/A'} | WT/PC: ${item.wtpc || 'N/A'}`;
        doc.text(specs, 25, currentY + 5);

        doc.setTextColor(0, 0, 0);
        currentY += 15; // Extra space for the two-line item description
    });

    // 6. Total Line
    doc.line(20, currentY, 190, currentY);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: INR ${order.amount.toFixed(2)}`, 185, currentY + 10, { align: "right" });

    // 7. Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for choosing Precifast. For support: info@precifastpvtltmd.com", 105, 285, { align: "center" });

    return Buffer.from(doc.output('arraybuffer'));
};

function formatOrderItems(items) {
    if (!items || items.length === 0) return "No items recorded";
    return items.map(i => `${i.name} (${i.size || 'N/A'}) x${i.qty}`).join('  |  ');
}
async function addOrderToSheet(order) {
    try {
        const client = await auth.getClient();

        const itemsStr = order.items.map(i => {
            // Added Grade to the Google Sheet String
            return `[Code: ${i.productCode || 'N/A'}] ${i.name} | Grade: ${i.quality || 'N/A'} | Size: ${i.size} | Len: ${i.length || 'N/A'} | AF: ${i.af || 'N/A'} | WT: ${i.wtpc || 'N/A'} (Qty: ${i.qty})`;
        }).join('\n');

        const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('en-IN');
        const addressStr = order.shippingAddress ? `${order.shippingAddress.addressText}, ${order.shippingAddress.location}` : 'N/A';

        const dynamicQRFormula = '=HYPERLINK("https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=" & ENCODEURL("Order ID: " & INDIRECT("A"&ROW()) & " | Specs: " & INDIRECT("J"&ROW())), IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" & ENCODEURL("Order ID: " & INDIRECT("A"&ROW()) & " | Specs: " & INDIRECT("J"&ROW()))))';

        await sheets.spreadsheets.values.append({
            auth: client,
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:L',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
                    order.razorpay_order_id,
                    dateStr,
                    order.status,
                    order.paymentMethod || 'Razorpay',
                    order.amount,
                    order.shippingAddress?.name || 'N/A',
                    order.userEmail || 'N/A',
                    order.shippingAddress?.phone || 'N/A',
                    addressStr,
                    itemsStr,
                    order.items[0]?.sector || 'N/A',
                    dynamicQRFormula
                ]]
            }
        });
        console.log("📊 Added new order with Grade & QR Code to Google Sheets!");
    } catch (error) {
        console.error("🚨 Google Sheets Append Error:", error.message);
    }
}

async function updateOrderStatusInSheet(orderId, newStatus) {
    try {
        const client = await auth.getClient();
        const getRes = await sheets.spreadsheets.values.get({
            auth: client, spreadsheetId: SPREADSHEET_ID, range: 'Sheet1!A:A',
        });

        const rows = getRes.data.values;
        if (!rows) return;

        let rowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === orderId) {
                rowIndex = i + 1;
                break;
            }
        }

        if (rowIndex !== -1) {
            await sheets.spreadsheets.values.update({
                auth: client,
                spreadsheetId: SPREADSHEET_ID,
                range: `Sheet1!C${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[newStatus]] }
            });
            console.log(`📊 Google Sheet Updated: Row ${rowIndex} changed to ${newStatus}`);
        }
    } catch (error) {
        console.error("🚨 Google Sheets Update Error:", error.message);
    }
}

async function sendSMS(toNumber, messageText) {
    if (!process.env.FAST2SMS_KEY || !toNumber) return;
    try {
        const cleanNumber = toNumber.toString().replace(/\D/g, '').slice(-10);
        await axios.post('https://www.fast2sms.com/dev/bulkV2', {
            route: 'q', message: messageText, language: 'english', flash: 0, numbers: cleanNumber,
        }, {
            headers: { 'authorization': process.env.FAST2SMS_KEY }
        });
        console.log(`📱 SMS Sent Successfully to ${cleanNumber}`);
    } catch (error) {
        console.error("🚨 SMS Failed to send:", error.response ? error.response.data : error.message);
    }
}


// --- 6. Auth & User Routes ---

app.post('/api/auth/request-phone-otp', (req, res) => {
    const { phone } = req.body;
    console.log(`MOCK SMS SENT TO ${phone}: Your OTP is 123456`);
    res.json({ success: true, message: "OTP sent to phone (Use 123456 for testing)" });
});

app.post('/api/auth/request-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60000);

        await User.findOneAndUpdate(
            { email }, { otp, otpExpiry }, { upsert: true, returnDocument: 'after' }
        );

        await transporter.sendMail({
            from: myEmail,
            to: email,
            subject: 'Precifast Pvt Ltd - Login OTP',
            text: `Your OTP is: ${otp}. Valid for 10 minutes.`
        });
        res.json({ message: "OTP sent" });
    } catch (error) {
        res.status(500).json({ error: "OTP failed" });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (user && user.otp === otp && user.otpExpiry > new Date()) {
        user.otp = undefined;
        await user.save();
        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});

app.post('/api/auth/admin-login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/user/addresses', verifyUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        res.json({ success: true, addresses: user ? user.addresses : [] });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch addresses" });
    }
});

app.post('/api/user/addresses', verifyUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        user.addresses.push(req.body);
        await user.save();
        res.json({ success: true, addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ error: "Failed to save address" });
    }
});

app.delete('/api/user/addresses/:index', verifyUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const index = parseInt(req.params.index);
        if (index >= 0 && index < user.addresses.length) {
            user.addresses.splice(index, 1);
            await user.save();
            res.json({ success: true, addresses: user.addresses });
        } else {
            res.status(400).json({ error: "Invalid address index" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to delete address" });
    }
});


// --- 7. Order & Payment Routes ---

app.get('/api/razorpay-key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

app.post('/create-order', async (req, res) => {
    try {
        console.log("🛒 1. Checkout request received!");
        const { amount, email, shippingAddress, items } = req.body;

        // Safety Check: Log incoming data to terminal
        console.log("📦 Order Detail Check:", JSON.stringify(items[0]));

        console.log(`💸 2. Asking Razorpay to create order for INR ${amount}...`);
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        });

        console.log("💽 3. Saving to database with full specs...");
        const newOrder = new Order({
            razorpay_order_id: razorpayOrder.id,
            amount: amount,
            userEmail: email,
            status: "Initiated",
            shippingAddress: shippingAddress,
            paymentMethod: "Razorpay",
            // Mapping every technical detail to the database
            items: items.map(i => ({
                productId: i.productId || i._id || 'UNKNOWN',
                productCode: i.productCode || 'N/A',
                name: i.name || 'Bolt',
                qty: Number(i.qty) || 100,
                price: Number(i.price) || 0,
                size: i.size || 'N/A',
                length: i.length || 'N/A',
                af: i.af || 'N/A',
                wtpc: i.wtpc || i.weight || 'N/A',  // <--- FALLBACK FOR WEIGHT
                quality: i.quality || 'N/A'         // <--- ADDED GRADE
            }))
        });

        await newOrder.save();
        console.log("✅ 4. Database record created. Handing over to Razorpay!");
        res.json({ orderId: razorpayOrder.id });

    } catch (error) {
        console.error("🚨 RAZORPAY ROUTE CRASH:", error);
        res.status(500).json({ success: false, error: "Payment initiation failed: " + error.message });
    }
});

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature === razorpay_signature) {
            await Order.findOneAndUpdate({ razorpay_order_id }, { status: 'Paid' });
            res.json({ success: true });

            // Background Task
            (async () => {
                try {
                    const ord = await Order.findOne({ razorpay_order_id }); // DEFINING 'ord'
                    const pdfBuffer = await generateInvoiceBuffer(ord);
                    
                    const deliveryDate = new Date();
                    deliveryDate.setDate(deliveryDate.getDate() + 5);
                    const deliveryString = deliveryDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

                    const emailHtml = `<h3>Order Success</h3><p>Dear ${ord.shippingAddress.name}, your order <b>${ord.razorpay_order_id}</b> is successful. Delivery expected before <b>${deliveryString}</b>.</p>`;

                    await transporter.sendMail({
                        from: `"Precifast Sales" <${myEmail}>`,
                        to: ord.userEmail,
                        subject: `Order Success: ${ord.razorpay_order_id}`,
                        html: emailHtml,
                        attachments: [{ filename: `Invoice_${ord.razorpay_order_id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
                    });

                    await deductStockForOrder(ord.items);
                    await addOrderToSheet(ord);
                } catch (err) { console.error("Razorpay BG Error:", err.message); }
            })();
        } else {
            res.status(400).json({ success: false });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// --- PAY LATER CREATION (FAST RESPONSE) ---
app.post('/create-pay-later', async (req, res) => {
    try {
        const { amount, email, shippingAddress, items } = req.body;
        
        // 1. Calculate Due Date (45 days from now)
        const due = new Date(); 
        due.setDate(due.getDate() + 45);
        
        // Generate a custom Order ID for Net-45
        const ordId = "PF-NET45-" + Math.floor(100000 + Math.random() * 900000);
        
        // 2. Create the Order Object (Note the variable name: newOrder)
        const newOrder = new Order({
            razorpay_order_id: ordId, 
            amount, 
            userEmail: email, 
            status: "Pending (Net 45)", 
            paymentMethod: "Pay Later", 
            dueDate: due, 
            shippingAddress,
            items: items.map(i => ({ 
                productId: i.productId || i._id, 
                productCode: i.productCode, 
                name: i.name, 
                qty: Number(i.qty), 
                price: Number(i.price), 
                size: i.size, 
                length: i.length, 
                af: i.af, 
                wtpc: i.wtpc,
                quality: i.quality
            }))
        });
        
        // Save to MongoDB
        await newOrder.save();
        
        // Send success response to the frontend immediately
        res.json({ success: true, orderId: ordId });

        // 3. START BACKGROUND TASKS
        (async () => {
            try {
                // Generate the PDF (Must await!)
                const pdfBuffer = await generateInvoiceBuffer(newOrder); 

                // Calculate delivery date string for email
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + 5);
                const deliveryString = deliveryDate.toLocaleDateString('en-IN', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                });

                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #eee; padding: 20px; border-radius: 10px; max-width: 600px;">
                        <h2 style="color: #ff9900;">Order Confirmation - Success</h2>
                        <p>Dear <strong>${newOrder.shippingAddress.name}</strong>,</p>
                        <p>Your Corporate Net-45 order has been recorded and is being prepared for dispatch.</p>
                        
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #ff9900;">
                            <h3 style="margin-top: 0; font-size: 16px;">Consignment Details</h3>
                            <p><strong>Order ID:</strong> ${newOrder.razorpay_order_id}</p>
                            <p><strong>Payment Mode:</strong> Corporate Net-45 (Due in 45 Days)</p>
                            <p><strong>Estimated Delivery:</strong> <span style="color: #25d366; font-weight: bold;">Before ${deliveryString}</span></p>
                        </div>

                        <p>Please find your <strong>Official Tax Invoice</strong> attached as a PDF.</p>
                        <hr style="border: 0; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #888; text-align: center;">Precifast Pvt Ltd | BETAMCHERLA facility</p>
                    </div>
                `;

                // Send the Email
                await transporter.sendMail({
                    from: `"Precifast Accounts" <${myEmail}>`,
                    to: email, 
                    subject: `Net-45 Order Approved: ${newOrder.razorpay_order_id}`,
                    html: emailHtml,
                    attachments: [{
                        filename: `Precifast_Invoice_${newOrder.razorpay_order_id}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }]
                });

                // Update Sheets and Stock
                await addOrderToSheet(newOrder);
                await deductStockForOrder(newOrder.items);

                console.log(`✅ Net-45 processing complete for ${newOrder.razorpay_order_id}`);

            } catch (bgError) {
                console.error("🚨 Net-45 Background Task Error:", bgError.message);
            }
        })();

    } catch (e) { 
        console.error("🚨 Create Pay Later Route Error:", e.message);
        res.status(500).json({ success: false, error: e.message }); 
    }
});
// --- ADMIN INVOICE DOWNLOAD ROUTE ---
// --- ADMIN INVOICE DOWNLOAD ROUTE ---
app.get('/api/admin/invoice/:id', async (req, res) => {
    try {
        // 1. Verify the Admin Token
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized Admin" });

        const jwt = require('jsonwebtoken');
        // 👇 FIXED: Using your exact master key from the login route
        const masterKey = 'PRECIFAST_MASTER_ADMIN_KEY_2026';
        const decoded = jwt.verify(token, masterKey);

        // 👇 FIXED: Using Mongoose (Order) instead of raw MongoDB (db.collection)
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // 3. Generate QR Code Data (Excluding Weight)
        const QRCode = require('qrcode');
        const qrText = order.items.map(i =>
            `Code: ${i.productCode || 'N/A'}\nBolt: ${i.name}\nSize: ${i.size}\nQty: ${i.qty}`
        ).join('\n---\n');

        const qrDataUrl = await QRCode.toDataURL(qrText);

        // 4. Generate the PDF Buffer
        const pdfBuffer = await generateInvoiceBuffer(order, qrDataUrl);

        // 5. Send the PDF directly to the Admin's browser
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Precifast_Admin_Copy_${order.razorpay_order_id}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("🚨 Admin Invoice Error:", error);
        res.status(500).json({ error: "Server failed to generate invoice." });
    }
});
// --- 8. Admin, Products, and Other Routes ---

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});


// --- GENERATE PAYMENT FOR EXISTING PENDING ORDERS ---
app.post('/api/user/orders/:id/generate-payment', verifyUser, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: "Order not found" });

        // Generate a fresh, active Razorpay Order ID for this exact amount
        const rzpOrder = await razorpay.orders.create({
            amount: Math.round(order.amount * 100),
            currency: "INR",
            receipt: `retry_${Date.now()}`
        });

        // Overwrite the old "PF-NET45" or expired ID with the new valid Razorpay ID
        order.razorpay_order_id = rzpOrder.id;
        await order.save();

        res.json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            orderId: rzpOrder.id,
            amount: order.amount,
            email: order.userEmail,
            phone: order.shippingAddress ? order.shippingAddress.phone : ""
        });
    } catch (err) {
        console.error("Generate Payment Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/products', verifyAdmin, uploadProduct.single('image'), async (req, res) => {
    try {
        const newProduct = new Product({
            productCode: req.body.productCode || '',
            sector: req.body.sector || '',
            name: req.body.name || 'Unnamed Bolt',
            quality: req.body.quality || '',
            size: req.body.size || '',
            length: req.body.length || '',             // <--- ADD THIS
            af: req.body.af || '',                     // <--- ADD THIS
            wtpc: req.body.wtpc || '',                 // <--- ADD THIS
            weight: req.body.weight || req.body.wtpc || '',
            stockQuantity: Number(req.body.stockQuantity) || 0,
            price: Number(req.body.price) || 0,
            desc: req.body.desc || '',
            img: req.file ? `/uploads/${req.file.filename}` : ''
        });
        await newProduct.save();
        res.json({ success: true, message: "Product added!" });
    } catch (error) {
        console.error("Manual Upload Error:", error);
        res.status(500).json({ success: false, message: "Upload failed" });
    }
});
app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product removed" });
    } catch (error) {
        res.status(500).json({ error: "Delete failed" });
    }
});

app.get('/api/orders', verifyAdmin, async (req, res) => {
    try {
        // Sort by newest first
        const orders = await Order.find({}).sort({ createdAt: -1 });
        console.log(`Admin fetched ${orders.length} orders.`);
        res.json(orders);
    } catch (error) {
        console.error("Order Fetch Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
});

app.put('/api/admin/orders/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { status: status }, { returnDocument: 'after' });
        if (!order) return res.status(404).json({ error: "Order not found" });

        await updateOrderStatusInSheet(order.razorpay_order_id, status);

        const userEmail = (order.shippingAddress && order.shippingAddress.email) ? order.shippingAddress.email : order.userEmail;
        const userName = order.shippingAddress ? order.shippingAddress.name : "Valued Customer";
        const customerPhone = order.shippingAddress ? order.shippingAddress.phone : null;

        let mailOptions = {
            from: `"Precifast Support" <${myEmail}>`,
            to: userEmail,
            subject: `Update on your Precifast Order: ${order.razorpay_order_id}`,
            text: `Hello ${userName},\n\nYour order status has been updated to: ${status}.`,
            attachments: []
        };

        if (status === 'Confirmed') {
            mailOptions.text = `Great news ${userName}!\n\nYour order is now Confirmed and processing for shipment.\n\nPlease find your official Tax Invoice attached.`;
            const pdfBuffer = generateInvoiceBuffer(order);
            mailOptions.attachments.push({
                filename: `Precifast_Invoice_${order.razorpay_order_id}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            });
            if (customerPhone) sendSMS(customerPhone, `Precifast: Order ${order.razorpay_order_id} Confirmed.`);
        } else if (status === 'Shipped') {
            mailOptions.text = `Hello ${userName},\n\nYour order ${order.razorpay_order_id} has been Shipped!`;
            if (customerPhone) sendSMS(customerPhone, `Precifast: Order ${order.razorpay_order_id} SHIPPED!`);
        } else if (status === 'Delivered') {
            mailOptions.text = `Yay! ${userName},\n\nYour order has been successfully Delivered.`;
            if (customerPhone) sendSMS(customerPhone, `Precifast: Order ${order.razorpay_order_id} Delivered successfully.`);
        } else if (status === 'Paid') {
            mailOptions.text = `Hello ${userName},\n\nWe have received payment for Invoice ${order.razorpay_order_id}.`;
            if (customerPhone) sendSMS(customerPhone, `Precifast: Payment of Rs.${order.amount} received for ${order.razorpay_order_id}.`);
        }

        await transporter.sendMail(mailOptions);
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ error: "Failed to update status" });
    }
});

app.post('/api/admin/orders/:id/remind', verifyAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        const daysLeft = Math.ceil((new Date(order.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        await transporter.sendMail({
            from: `"Precifast Accounts" <${myEmail}>`,
            to: order.userEmail,
            subject: `ACTION REQUIRED: Outstanding Invoice ${order.razorpay_order_id}`,
            text: `Hello ${order.shippingAddress.name},\n\nReminder: Your Net-45 invoice for INR ${order.amount} is due.\nDays Remaining: ${daysLeft} days.\nPlease process payment soon.`
        });
        res.json({ success: true, message: "Reminder Emailed Successfully" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/apply', uploadResume.single('resume'), async (req, res) => {
    try {
        const newApp = new Application({
            name: req.body.name, email: req.body.email, phone: req.body.phone, degree: req.body.degree,
            university: req.body.university, gradYear: req.body.gradYear, role: req.body.role,
            yearsExp: req.body.yearsExp, skills: req.body.skills,
            resumeFilePath: req.file ? `/uploads/resumes/${req.file.filename}` : null
        });
        await newApp.save();
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ success: false, error: "Database error" }); }
});

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        await transporter.sendMail({
            from: myEmail,
            to: myEmail,
            subject: `New Contact Form Message from ${name}`,
            html: `<h2>New Inquiry</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Message:</strong> ${message}</p>`
        });
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to send message" }); }
});

app.post('/api/capture-lead', async (req, res) => {
    try {
        const { email } = req.body;
        await new Lead({ email }).save();
        try {
            await transporter.sendMail({
                from: myEmail, to: myEmail, subject: '🚀 New B2B Lead Captured!', text: `New catalog request: ${email}`
            });
        } catch (emailErr) { console.error("Email warning:", emailErr.message); }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to capture lead" }); }
});

app.get('/api/leads', verifyAdmin, async (req, res) => {
    try {
        const leads = await Lead.find({}).sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ success: false, error: "Error fetching leads" });
    }
});

// ==========================================
// 👤 USER DASHBOARD & PROFILE ROUTES
// ==========================================

// Add these new fields to User Schema if they aren't there yet
userSchema.add({
    name: String,
    phone: String,
    profileImg: String,
    hasEditedProfile: { type: Boolean, default: false }
});

// Profile Image Upload Setup
const avatarDir = path.join(__dirname, 'public', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
const uploadAvatar = multer({ dest: avatarDir });

// 1. Get Profile Details
app.get('/api/user/profile', verifyUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        res.json({ email: user.email, name: user.name, phone: user.phone, profileImg: user.profileImg, hasEditedProfile: user.hasEditedProfile });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// 2. Upload Avatar Image
app.post('/api/user/profile-image', verifyUser, uploadAvatar.single('profileImg'), async (req, res) => {
    try {
        const imgUrl = `/uploads/avatars/${req.file.filename}`;
        await User.findByIdAndUpdate(req.user.userId, { profileImg: imgUrl });
        res.json({ success: true, imgUrl });
    } catch (e) { res.status(500).json({ error: "Upload failed" }); }
});

// 3. Request OTP to Edit Profile (Once only)
app.post('/api/user/profile-update-request', verifyUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user.hasEditedProfile) return res.status(400).json({ error: "Profile can only be edited once." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60000);
        await user.save();

        await transporter.sendMail({
            from: `"Precifast Security" <${myEmail}>`,
            to: user.email,
            subject: 'Profile Update OTP',
            text: `Your OTP to update your profile details is: ${otp}.`
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to send OTP" }); }
});

// 4. Verify OTP and Save Profile Permanently
app.post('/api/user/profile-verify', verifyUser, async (req, res) => {
    try {
        const { otp, name, phone } = req.body;
        const user = await User.findById(req.user.userId);

        if (user && user.otp === otp && user.otpExpiry > new Date()) {
            user.name = name;
            user.phone = phone;
            user.hasEditedProfile = true; // LOCKS THE PROFILE
            user.otp = undefined;
            await user.save();
            res.json({ success: true });
        } else {
            res.status(400).json({ error: "Invalid OTP" });
        }
    } catch (e) { res.status(500).json({ error: "Update failed" }); }
});

// 5. Get User's Specific Orders
app.get('/api/user/orders', verifyUser, async (req, res) => {
    try {
        // Fetch only orders belonging to the logged-in email
        const orders = await Order.find({ userEmail: req.user.email }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) { res.status(500).json({ error: "Failed to fetch orders" }); }
});

// 6. Download Official Invoice PDF
app.get('/api/user/invoice/:id', verifyUser, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        // Security check: Make sure they only download their own invoice!
        if (!order || order.userEmail !== req.user.email) {
            return res.status(403).send("Unauthorized");
        }

        // Use your existing PDF generator function!
        const pdfBuffer = generateInvoiceBuffer(order);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Precifast_Invoice_${order.razorpay_order_id}.pdf`);
        res.send(pdfBuffer);
    } catch (e) { res.status(500).send("Error generating invoice"); }
});

// 🤖 WAKE UP THE INVENTORY ROBOT
async function deductStockForOrder(items) {
    try {
        for (let item of items) {
            // Subtract the ordered quantity from the live database stock
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stockQuantity: -item.qty }
            });
            console.log(`📉 Stock deducted: -${item.qty} for ${item.name}`);
        }
    } catch (err) {
        console.error("🚨 Failed to deduct stock:", err);
    }
}

// --- Run Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});




// ==========================================
// 📊 ADMIN DASHBOARD DATA ROUTES
// ==========================================



// 2. Get All B2B Leads for Admin

//import data from csv excel


app.post('/api/products/bulk', verifyAdmin, async (req, res) => {
    try {
        const products = req.body.products;
        if (!products || !products.length) return res.status(400).json({ error: "No products provided" });

        // Insert all products into the database at once
        await Product.insertMany(products);

        res.json({ success: true, count: products.length });
    } catch (error) {
        console.error("Bulk Import Error:", error);
        res.status(500).json({ error: "Failed to import products" });
    }
});

// Update specific Product Image, Price, and Stock
app.put('/api/products/:id/details', verifyAdmin, uploadProduct.single('image'), async (req, res) => {
    try {
        const updateFields = {};

        if (req.body.price !== undefined) updateFields.price = Number(req.body.price);
        if (req.body.stockQuantity !== undefined) updateFields.stockQuantity = Number(req.body.stockQuantity);

        // If an image was uploaded, save the new path
        if (req.file) {
            updateFields.img = `/uploads/${req.file.filename}`;
        }

        await Product.findByIdAndUpdate(req.params.id, updateFields);
        res.json({ success: true, message: "Product details updated" });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, error: "Update failed" });
    }
});

// 3. Update Order Status Manually (Admin)
app.put('/api/admin/orders/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { returnDocument: 'after' }
        );

        if (!updatedOrder) return res.status(404).json({ success: false, message: "Order not found" });

        // Optional: Send status update email to customer here

        res.json({ success: true, message: "Status updated" });
    } catch (error) {
        console.error("Failed to update status:", error);
        res.status(500).json({ success: false, message: "Update failed" });
    }
});

const cron = require('node-cron');

// --- NET-45 AUTOMATED REMINDER BOT ---
// Runs every day at 09:00 AM
cron.schedule('0 9 * * *', async () => {
    console.log("🤖 Running daily Net-45 payment check...");
    
    try {
        const today = new Date();
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(today.getDate() + 5);

        // Find orders that are:
        // 1. Pending (Net 45)
        // 2. Due exactly 5 days from now
        const upcomingInvoices = await Order.find({
            paymentMethod: "Pay Later",
            status: { $ne: "Paid" },
            dueDate: {
                $gte: new Date(fiveDaysFromNow.setHours(0,0,0,0)),
                $lte: new Date(fiveDaysFromNow.setHours(23,59,59,999))
            }
        });

        for (let order of upcomingInvoices) {
            const emailHtml = `
                <div style="font-family: Arial; border: 1px solid #ff4444; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #d32f2f;">Payment Reminder: Net-45 Invoice</h2>
                    <p>Dear <strong>${order.shippingAddress.name}</strong>,</p>
                    <p>This is a friendly reminder from <strong>Precifast Pvt Ltd</strong> regarding your outstanding invoice <strong>${order.razorpay_order_id}</strong>.</p>
                    
                    <div style="background: #fff5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Amount Due:</strong> ₹${order.amount.toLocaleString('en-IN')}</p>
                        <p><strong>Due Date:</strong> <span style="color: #ff4444; font-weight: bold;">${new Date(order.dueDate).toLocaleDateString('en-IN')}</span></p>
                        <p><strong>Days Remaining:</strong> 5 Days</p>
                    </div>

                    <p>Please ensure the payment is processed via your corporate portal or bank transfer to avoid consignment delays.</p>
                    <hr style="border:0; border-top:1px solid #eee;">
                    <p style="font-size: 12px; color: #888;">Precifast Pvt Ltd | Accounts Receivable</p>
                </div>
            `;

            await transporter.sendMail({
                from: `"Precifast Accounts" <${process.env.EMAIL_USER}>`,
                to: order.userEmail,
                subject: `URGENT: Payment Due in 5 Days - Invoice ${order.razorpay_order_id}`,
                html: emailHtml
            });

            console.log(`📧 Automated reminder sent to ${order.userEmail} for Invoice ${order.razorpay_order_id}`);
        }
    } catch (err) {
        console.error("🚨 Cron Job Error:", err.message);
    }
});