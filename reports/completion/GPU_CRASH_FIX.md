# GPU CRASH FIX - STATUS_STACK_BUFFER_OVERRUN

## Проблема
Код ошибки: -1073740791 = 0xC0000409 (STATUS_STACK_BUFFER_OVERRUN)
Проявление: черное окно, DevTools открывается, но рендер крашится

## Решение
Добавлены настройки GPU в main.ts:

```typescript
// GPU crash fix - disable hardware acceleration to prevent STATUS_STACK_BUFFER_OVERRUN
app.disableHardwareAcceleration();

// Alternative GPU settings for stability
app.commandLine.appendSwitch('use-angle', 'd3d11');
app.commandLine.appendSwitch('enable-logging');
app.commandLine.appendSwitch('v', '1');
```

## Альтернативные настройки
Если нужно частичное GPU ускорение:
- `app.commandLine.appendSwitch('use-angle', 'opengl')` - OpenGL backend
- `app.commandLine.appendSwitch('use-angle', 'swiftshader')` - Software renderer
- `app.commandLine.appendSwitch('disable-gpu-compositing')` - отключить только композитинг

## Дата внедрения
$(date +%Y-%m-%d)

## Файлы изменены
- backend/main.ts
