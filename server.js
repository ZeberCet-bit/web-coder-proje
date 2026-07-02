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
// DİKKAT: Kendi MongoDB bağlantı linkinizi buraya yapıştırın!
const MONGO_URI = "mongodb+srv://ZeberCet:1q3e1Q3E@cluster0.t0ob1co.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Bulut Arşivine (MongoDB) başarıyla bağlanıldı.');
        ornekUrunleriYukle(); // Veri tabanı boşsa örnek tişörtleri yükle
    })
    .catch(err => console.error('Bulut bağlantı hatası:', err));

// --- MONGODB VERİ ŞABLONLARI (SCHEMAS) ---
const accountSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, created_at: { type: Date, default: Date.now }});
const AccountModel = mongoose.model('Account', accountSchema);

const productSchema = new mongoose.Schema({ title: { type: String, required: true }, price: { type: Number, required: true }, description: { type: String }, imageUrl: { type: String }, category: { type: String, default: "T-Shirt" }, stock: { type: Number, default: 50 }, added_at: { type: Date, default: Date.now }});
const ProductModel = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({ username: { type: String, required: true }, items: Array, totalPrice: Number, status: { type: String, default: "Sipariş Alındı" }, date: { type: Date, default: Date.now }});
const OrderModel = mongoose.model('Order', orderSchema);

// --- OTOMATİK ÖRNEK ÜRÜN YÜKLEYİCİ (SEEDER) ---
async function ornekUrunleriYukle() {
    try {
        const count = await ProductModel.countDocuments();
        if(count === 0) {
            const ornekUrunler = [
                {
                    title: "Véstis Classic Oversize Tee",
                    price: 599,
                    description: "Ağır gramajlı %100 premium pamuklu kumaş. Siberpunk esintili minimalist göğüs nakışlı logo tasarımı. Rahat kesim.",
                    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
                    category: "Oversize"
                },
                {
                    title: "Neon Cyber Gothic T-Shirt",
                    price: 649,
                    description: "Karanlık sokak modası (streetwear) ruhunu yansıtan yüksek çözünürlüklü dijital arka baskı. Yıkamaya dayanıklı özel seri.",
                    imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop",
                    category: "Grafik Baskılı"
                },
                {
                    title: "Vintage Acid Wash Tee",
                    price: 699,
                    description: "Özel asit yıkama efekti verilmiş eskitme kumaş. Zamansız, salaş ve dökümlü retro tarz sevenler için özel üretim.",
                    imageUrl: "https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=600&auto=format&fit=crop",
                    category: "Vintage"
                }
            ];
            await ProductModel.insertMany(ornekUrunler);
            console.log('Premium Örnek Tişörtler mağaza raflarına başarıyla dizildi!');
        }
    } catch (err) { console.error('Örnek ürünler yüklenirken hata:', err); }
}

// --- İŞLEVSEL GEÇİTLER (APIs) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'magaza.html')));

// Kullanıcı Kayıt & Giriş
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if(!username || !password) return res.status(400).json({ error: "Alanlar boş bırakılamaz." });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await new AccountModel({ username, password: hashedPassword }).save();
        res.json({ message: "Hesabınız başarıyla oluşturuldu!" });
    } catch (error) { res.status(400).json({ error: "Bu kullanıcı adı zaten sistemde kayıtlı." }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'KurucuAdmin' && password === 'webcoder2026!') return res.json({ message: "Yönetici İstasyonuna Hoş Geldiniz!", username: "KurucuAdmin" });
    try {
        const user = await AccountModel.findOne({ username });
        if (!user) return res.status(400).json({ error: "Kullanıcı bulunamadı." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) res.json({ message: `Giriş başarılı. Hoş geldiniz, ${user.username}!`, username: user.username });
        else res.status(400).json({ error: "Hatalı şifre girdiniz." });
    } catch (error) { res.status(500).json({ error: "Sunucu hatası." }); }
});

// Ürün Yönetimi
app.get('/api/products', async (req, res) => {
    try { res.json(await ProductModel.find().sort({ added_at: -1 })); } 
    catch (err) { res.status(500).json({ error: "Ürünler getirilemedi." }); }
});

app.post('/api/add-product', async (req, res) => {
    try { await new ProductModel(req.body).save(); res.json({ message: "Yeni ürün başarıyla eklendi!" }); } 
    catch (err) { res.status(400).json({ error: "Ürün ekleme başarısız." }); }
});

// Sipariş İşlemleri
app.post('/api/checkout', async (req, res) => {
    const { username, items, totalPrice } = req.body;
    try {
        await new OrderModel({ username, items, totalPrice }).save();
        res.json({ message: "Siparişiniz başarıyla alındı ve veri tabanına işlendi!" });
    } catch (err) { res.status(500).json({ error: "Sipariş işlenirken hata." }); }
});

app.get('/api/orders/:username', async (req, res) => {
    try { res.json(await OrderModel.find({ username: req.params.username }).sort({ date: -1 })); } 
    catch (err) { res.status(500).json({ error: "Sipariş geçmişi alınamadı." }); }
});

app.listen(PORT, () => console.log(`Véstis Sunucusu ${PORT} Portunda Aktif.`));