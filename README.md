# AudioFix — Revenge Plugin

Блокирует переключение Bluetooth-наушников из A2DP (высокое качество) в HFP/SCO (телефонный режим) при входе в голосовой канал Discord.

## Что делает

- Блокирует `startBluetoothSco()` — предотвращает переключение профиля A2DP → HFP
- Блокирует `setBluetoothScoOn()` — избыточный SCO-вызов
- Перехватывает `setMode(MODE_IN_COMMUNICATION)` и не даёт ему выполниться
- Блокирует `setCommunicationDevice()` для BT SCO устройств (Android 12+)
- Сканирует все NativeModules на случай переименования в новых версиях Discord

## Как задеплоить (GitHub Pages)

1. Создай репозиторий на GitHub (например `my-revenge-plugins`)
2. Скопируй папку `AudioFix/` в корень репозитория
3. В Settings → Pages выбери источник: ветку `main`, папку `/` (root)
4. После деплоя вставь в Revenge → Plugins → Add:

```
https://ТВО_ЛОГИН.github.io/my-revenge-plugins/AudioFix
```

## Отладка

Открой Metro console в Revenge Dev Tools, фильтруй по `[AudioFix]`.

- `Patched AudioManager.startBluetoothSco → no-op` — патч применён ✅
- `Total patches applied: 0` — Discord сменил имена модулей, нужно обновить `AUDIO_MODULE_CANDIDATES` в `index.js`

## Файлы

| Файл | Назначение |
|------|-----------|
| `index.js` | Скомпилированный плагин (загружается Revenge) |
| `index.ts` | Исходник на TypeScript |
| `manifest.json` | Метаданные плагина |
