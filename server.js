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
// DİKKAT: Aşağıdaki tırnak içine, kendi MongoDB şifreli linkinizi yapıştırmayı UNUTMAYIN!
const MONGO_URI = "mongodb+srv://ZeberCet:1q3e1Q3E@cluster0.t0ob1co.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('Bulut Arşivine (MongoDB) başarıyla bağlanıldı.'))
    .catch(err => console.error('Bulut bağlantı hatası:', err));

// --- 1. ESKİ KAYIT DEFTERİ ŞABLONLARI ---
const dataSchema = new mongoose.Schema({ name: { type: String, required: true }, created_at: { type: Date, default: Date.now }});
const DataModel = mongoose.model('UserRecord', dataSchema);

const accountSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, created_at: { type: Date, default: Date.now }});
const AccountModel = mongoose.model('Account', accountSchema);

// --- 2. YENİ E-TİCARET ÜRÜN ŞABLONU ---
const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, default: "Ürün açıklaması bulunmuyor." },
    imageUrl: { type: String, default: "https://via.placeholder.com/150" },
    stock: { type: Number, default: 10 },
    added_at: { type: Date, default: Date.now }
});
const ProductModel = mongoose.model('Product', productSchema);

// --- İŞLEVLER ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// (Eski üyelik işlevleri arka planda çalışmaya devam ediyor)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Boş alan bırakılamaz." });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAccount = new AccountModel({ username, password: hashedPassword });
        await newAccount.save();
        res.json({ message: "Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz..." });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Bu kullanıcı adı alınmış." });
        res.status(500).json({ error: "Sunucu hatası." });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'KurucuAdmin' && password === 'webcoder2026!') return res.json({ message: "Hoş geldiniz Kurucu Yönetici!", username: "KurucuAdmin" });
    try {
        const user = await AccountModel.findOne({ username: username });
        if (!user) return res.status(400).json({ error: "Böyle bir kullanıcı bulunamadı." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) res.json({ message: `Hoş geldiniz, ${user.username}!`, username: user.username });
        else res.status(400).json({ error: "Şifre hatalı." });
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası." });
    }
});

// --- YENİ E-TİCARET İŞLEVLERİ ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await ProductModel.find().sort({ added_at: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Ürünler getirilirken hata oluştu." });
    }
});

app.post('/api/add-product', async (req, res) => {
    const { title, price, description, imageUrl, stock } = req.body;
    try {
        const newProduct = new ProductModel({ title, price, description, imageUrl, stock });
        await newProduct.save();
        res.json({ message: "Ürün mağaza raflarına başarıyla eklendi!" });
    } catch (err) {
        res.status(400).json({ error: "Ürün eklenemedi." });
    }
});

app.listen(PORT, () => console.log(`Web siteniz http://localhost:${PORT} adresinde yayında.`));