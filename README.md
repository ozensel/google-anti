# google-anti

**ICON Yazılım** tarafından geliştirilen, React Native ve Expo tabanlı mobil uygulama projesi.

## Teknolojiler

- React Native ve Expo
- React Navigation
- Supabase
- i18n-js ve Expo Localization

## Proje yapısı

- `App.js`: uygulamanın ana bileşeni
- `index.js`: uygulama giriş noktası
- `src/`: uygulama kaynakları
- `assets/`: görsel ve diğer statik dosyalar
- `supabase/`: Supabase ile ilgili dosyalar
- `supabase_migration.sql`: veritabanı geçiş betiği

## Geliştirme

Bağımlılıkları yüklemek için:

```bash
npm install
```

Geliştirme sunucusunu başlatmak için:

```bash
npm start
```

Diğer mevcut komutlar: `npm run android`, `npm run ios`, `npm run web`.
Platforma göre Android veya iOS geliştirme araçları gerekebilir.

## Lisans

Bu proje [ICON Yazılım Kişisel ve Ticari Olmayan Kullanım Lisansı](LICENSE) ile sunulmaktadır.

- Kişisel kullanım, öğrenme ve kendini geliştirme için kullanmak ve değiştirmek ücretsizdir.
- Ticari kullanım için ICON Yazılım’dan önceden yazılı izin alınmalıdır.
- Ticari olmayan kaynak kodu paylaşımlarında lisans ve telif bildirimi korunmalıdır.

Bu, projeye özel bir lisanstır; MIT lisansı değildir. Üçüncü taraf bileşenlerin kendi lisansları geçerlidir.
