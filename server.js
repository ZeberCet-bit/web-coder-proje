const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- BULUT VERİ TABANI BAĞLANTISI ---
// DİKKAT: Kendi MongoDB linkinizi buraya yapıştırın!
const MONGO_URI = "mongodb+srv://ZeberCet:1q3e1Q3E@cluster0.t0ob1co.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('Bulut Arşivine (MongoDB) başarıyla bağlanıldı.'))
    .catch(err => console.error('Bulut bağlantı hatası:', err));

// --- ŞABLONLAR (SCHEMAS) ---
const accountSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, created_at: { type: Date, default: Date.now }});
const AccountModel = mongoose.model('Account', accountSchema);

const productSchema = new mongoose.Schema({ title: { type: String, required: true }, price: { type: Number, required: true }, description: { type: String }, imageUrl: { type: String }, stock: { type: Number, default: 10 }, added_at: { type: Date, default: Date.now }});
const ProductModel = mongoose.model('Product', productSchema);

// YENİ: SİPARİŞ ŞABLONU
const orderSchema = new mongoose.Schema({ username: { type: String, required: true }, items: Array, totalPrice: Number, status: { type: String, default: "Hazırlanıyor" }, date: { type: Date, default: Date.now }});
const OrderModel = mongoose.model('Order', orderSchema);

// --- İŞLEVLER (APIs) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Üyelik
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await new AccountModel({ username, password: hashedPassword }).save();
        res.json({ message: "Kayıt başarılı!" });
    } catch (error) { res.status(400).json({ error: "Bu kullanıcı adı alınmış veya hata oluştu." }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'KurucuAdmin' && password === 'webcoder2026!') return res.json({ message: "Hoş geldiniz Yönetici!", username: "KurucuAdmin" });
    try {
        const user = await AccountModel.findOne({ username });
        if (!user) return res.status(400).json({ error: "Kullanıcı bulunamadı." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) res.json({ message: `Hoş geldiniz, ${user.username}!`, username: user.username });
        else res.status(400).json({ error: "Şifre hatalı." });
    } catch (error) { res.status(500).json({ error: "Sunucu hatası." }); }
});

// Ürünler
app.get('/api/products', async (req, res) => {
    try { res.json(await ProductModel.find().sort({ added_at: -1 })); } 
    catch (err) { res.status(500).json({ error: "Hata." }); }
});

app.post('/api/add-product', async (req, res) => {
    try { await new ProductModel(req.body).save(); res.json({ message: "Ürün eklendi!" }); } 
    catch (err) { res.status(400).json({ error: "Hata." }); }
});

// YENİ: SİPARİŞ OLUŞTURMA VE PROFİL GEÇMİŞİ GETİRME
app.post('/api/checkout', async (req, res) => {
    const { username, items, totalPrice } = req.body;
    try {
        await new OrderModel({ username, items, totalPrice }).save();
        res.json({ message: "Siparişiniz başarıyla alındı ve veri tabanına işlendi!" });
    } catch (err) { res.status(500).json({ error: "Sipariş oluşturulamadı." }); }
});

app.get('/api/orders/:username', async (req, res) => {
    try {
        const orders = await OrderModel.find({ username: req.params.username }).sort({ date: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: "Geçmiş alınamadı." }); }
});

app.listen(PORT, () => console.log(`Yayında: http://localhost:${PORT}`));