# Boykot Penguen Tarayıcı Eklentisi

Boykot Penguen, kullanıcıların boykot edilen markaları ve alan adlarını tanımlamasına ve uyarılar almasına yardımcı olan bir tarayıcı eklentisidir. Kullanıcıların boykot listelerini yönetmelerine de olanak tanır.

## Özellikler

- 🔍 Boykot edilen marka veya sitelerin tespiti
- 🎨 Kalıcı banner olarak veya süreli bildirimler şeklinde gösterme
- 🔄 Abone olunan listelerin otomatik güncellemeleri
- 📋 Kolay boykot listesi yönetme
- 📜 Manifest v3 uyumlu
- 🛡️ Site geçmişi işlemez veya kullanıcı verisi toplamaz

## Kullanım

Henüz Firefox ve Chrome'un kendi uzantı sayfalarına eklenmediği için manuel kurulum gerekmektedir. Releases bölümünden derlenmiş versiyonu indirebilir veya projeyi klonlayıp [Kurulum](#kurulum) kısmını takip ederek kendiniz projeyi derleyebilirsiniz. Tarayıcıya eklemek için [tarayıcı](#tarayıcıya-eklemek) kısmına bakabilirsiniz.

### Liste Yönetimi

1. Eklenti popupını açın
2. Liste sekmesinde mevcut listelerin listesini ve aktifliğini görebilirsiniz.
3. Manage List ile liste yönetimini açabilirsiniz.
4. Mevcut listelerinizi JSON formatında dışarı aktarabilir ya da sizinle paylaşılan dosyaları mevcut listenize ekleyebilirsiniz.
5. Mevcut listeleri değiştirebilir, yenilerini ekleyebilirsiniz.
6. Auto-update ayarlarını değiştirebilir. Farklı adreslerden listeleri ekleyebilirsiniz.

### Auto-update Ayarları

- Otomatik güncelleme seçeneğini aktif/deaktif etme
- Güncelleme aralığını seçme (6 saat ile 1 hafta arasında)
- Birden farklı adres üzerinden liste ekleme

### Bildirimler

- Banner veya alert olarak bildirim alabilme
- Banner rengi ve pozisyonun ayarlanabilmesi
- Alert süresinin değiştirilebilmesi

## Kurulum

[Git](https://git-scm.com/) ve [pnpm'in](https://pnpm.io/installation) kurulu olması gerekiyor.

1. Repoyu klonlayın:

```bash
git clone https://github.com/boykotpenguen/Boykot-Penguen.git
```

2. Projenin bağımlılıklarını yükleyin:

```bash
pnpm install
```

3. Eklentiyi derleyin:

Farklı tarayıcı seçenekleri için [Mevcut Scripler](#mevcut-scriptler) kısmına bakın.

```bash
pnpm build:ff
```

### Tarayıcıya Eklemek

#### Firefox

- Firefox tarayıcınızda `about:debugging#/runtime/this-firefox` adresine gidin
- "Geçici eklenti yükle..."ye tıklayın.
- Yüklenecek klasör içerisindeki `manifest.json` seçin

#### Chrome

- Chrome tarayıcınızda `chrome://extensions/` adresine gidin
- "Geliştirici modu"nu açın
- "Paketlenmemiş öğe yükle" butonuna tıklayın
- Yüklenecek klasörü seçin

## Geliştirme

### Proje Yapısı

```
src/
├── 
├── content.tsx        # Sayfayı editleyen script
├── popup.tsx          # Eklenti popup sayfası
├── options.tsx        # Liste yönetimi sayfası
└── *.module.css       # Stiller
    background/      
    └── index.ts       # Eklenti background scripti
    util/
    ├── autoUpdate.ts       # Auto-update functionality
    ├── brandDetector.ts    # Brand and domain detection functionality
    ├── storage.ts          # Local storage
    └── types.ts            # TypeScript type definitions
```

### Mevcut Scriptler

- `pnpm dev` - Chrome için test amaçlı
- `pnpm build:chrome`
- `pnpm build:ff`
- `pnpm build:edge` - Test edilmedi
- `pnpm build:brave` - Test edilmedi
- `pnpm build:opera` - Test edilmedi
- `pnpm package:chrome`
- `pnpm package:ff`
- `pnpm package:edge` - Test edilmedi
- `pnpm package:brave` - Test edilmedi
- `pnpm package:opera` - Test edilmedi

## Katkıda Bulunma

Çalışma alanım web alanım olmadığı için birçok yanlış yaklaşım veya bug olabilir. Kodun bir kısmında AI'dan yardım aldığım için olmasını da bekliyorum. Bir sorun gördüğünüzde Issue veya Pull Request açarsanız sevinirim. Aynı şekilde eklenmesini istediğiniz yeni bir özellik varsa da Issue açabilirsiniz.

## Tech

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Plasmo](https://www.plasmo.com/)

## Lisans

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
