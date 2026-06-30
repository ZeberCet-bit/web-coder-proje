const express = require('express');
const mongoose = require('mongoose'); // Yeni bulut yöneticimiz
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- BULUT VERİ TABANI BAĞLANTISI ---
// Aşağıdaki tırnak içindeki linki SİLİP, MongoDB'den kopyaladığınız kendi linkinizi yapıştırın.
// Linkin içindeki <password> kısmını silip, kendi belirlediğiniz şifreyi yazmayı unutmayın.
const MONGO_URI = "mongodb+srv://ZeberCet:If5CoOYDBsfIvWK1@cluster0.t0ob1co.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('Bulut Arşivine (MongoDB) başarıyla bağlanıldı.'))
    .catch(err => console.error('Bulut bağlantı hatası:', err));

// --- YENİ KAYIT DEFTERİ ŞABLONLARI (SCHEMAS) ---
const dataSchema = new mongoose.Schema({
    name: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});
const DataModel = mongoose.model('UserRecord', dataSchema);

const accountSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});
const AccountModel = mongoose.model('Account', accountSchema);

// --- İŞLEVLER ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.post('/api/add-user', async (req, res) => {
    try {
        const newData = new DataModel({ name: req.body.name });
        await newData.save(); // Veriyi buluta kaydet
        res.json({ message: "Arşive başarıyla işlendi!" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await DataModel.find().sort({ created_at: -1 }); // Buluttan getir
        res.json(users);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

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

    // Gizli Yönetici Geçidi
    if (username === 'KurucuAdmin' && password === 'webcoder2026!') {
        return res.json({ message: "Hoş geldiniz Kurucu Yönetici!", username: "KurucuAdmin" });
    }

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

app.listen(PORT, () => console.log(`Web siteniz http://localhost:${PORT} adresinde yayında.`));