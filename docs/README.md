# Cinecalidad Stremio Addon - Página de Configuración

Esta es la página web oficial para configurar el addon de Cinecalidad para Stremio.

## 🌐 URL de la Página

La página está disponible en GitHub Pages: `https://rxb3rth.github.io/cinecalidad-stremio-addon/`

## 📋 Información del Addon

- **Tipo**: Addon de películas y series en español
- **Calidad**: HD / Full HD
- **Idioma**: Español (Latino y Castellano)
- **Plataforma**: Stremio

## 🚀 Características de la Página

### ✨ Funcionalidades Principales

- **Instalación con un clic**: Botón directo para instalar en Stremio
- **Configuración manual**: Instrucciones paso a paso
- **Copia automática**: URLs se copian al portapapeles fácilmente
- **Estado en vivo**: Verificación de disponibilidad en tiempo real
- **Responsive**: Compatible con móviles y desktop
- **PWA Ready**: Puede funcionar como aplicación web

### 🎨 Diseño

- **Tema oscuro**: Inspirado en Stremio y Netflix
- **Animaciones suaves**: Transiciones modernas
- **Iconos emoji**: Fácil reconocimiento visual
- **Tipografía clara**: Legible en todos los dispositivos
- **Colores accesibles**: Alto contraste para mejor legibilidad

### 📱 Compatibilidad

- ✅ Chrome/Edge/Safari (escritorio y móvil)
- ✅ Firefox (escritorio y móvil)
- ✅ Dispositivos iOS y Android
- ✅ Smart TVs con navegador
- ✅ Tablets y dispositivos táctiles

## 🛠️ Configuración de GitHub Pages

Para activar GitHub Pages en tu repositorio:

1. Ve a **Settings** > **Pages** en tu repositorio de GitHub
2. En **Source**, selecciona "Deploy from a branch"
3. Selecciona la rama `main` 
4. Selecciona la carpeta `/docs`
5. Haz clic en **Save**

La página estará disponible en: `https://[usuario].github.io/[repositorio]/`

## 📁 Estructura de Archivos

```
docs/
├── index.html          # Página principal
├── styles/
│   └── main.css        # Estilos CSS
├── js/
│   └── main.js         # Funcionalidad JavaScript
└── assets/
    └── logo.png        # Logo del addon (desde repositorio)
```

## 🔧 Personalización

### Configurar URLs del Addon

Para personalizar las URLs del addon, edita el archivo `docs/js/main.js`:

```javascript
const CONFIG = {
    SERVER_URL: 'https://tu-addon.com',
    MANIFEST_URL: 'https://tu-addon.com/manifest.json',
    // ...
};
```

### Modificar Colores

Los colores se pueden cambiar en `docs/styles/main.css` usando las variables CSS:

```css
:root {
    --primary-color: #e50914;      /* Color principal */
    --secondary-color: #221f1f;    /* Color secundario */
    --background-primary: #141414; /* Fondo principal */
    /* ... más variables */
}
```

### Agregar Analytics

Para agregar seguimiento de analytics, modifica la función `trackEvent` en `docs/js/main.js`:

```javascript
function trackEvent(eventName, properties = {}) {
    // Google Analytics
    gtag('event', eventName, properties);
    
    // O Plausible
    plausible(eventName, { props: properties });
}
```

## 📊 Funcionalidades Avanzadas

### Verificación de Estado en Tiempo Real

- Verifica cada 30 segundos si el addon está disponible
- Indicador visual del estado (en línea/desconectado/verificando)
- Reintentos automáticos cuando la conexión se restaura

### Copia al Portapapeles

- API moderna de clipboard con fallback para navegadores antiguos
- Notificaciones toast para confirmar la copia
- Shortcuts de teclado (Ctrl+C para copiar URL)

### Experiencia Móvil

- Detección automática de dispositivos móviles
- Instrucciones específicas para instalación en móvil
- Diálogo adaptativo para diferentes plataformas

### Accesibilidad

- Navegación por teclado completa
- Indicadores de estado screenreader-friendly
- Alto contraste de colores
- Texto escalable

## 🚀 Despliegue

### GitHub Pages (Recomendado)

1. Haz push de la carpeta `docs/` a tu repositorio
2. Activa GitHub Pages en la configuración del repositorio
3. La página estará disponible automáticamente

### Netlify

1. Conecta tu repositorio a Netlify
2. Configura el directorio de build como `docs`
3. Despliega automáticamente

### Vercel

1. Importa tu repositorio en Vercel
2. Configura el directorio raíz como `docs`
3. Despliega con un clic

## 📝 Mantenimiento

### Actualizar URLs del Addon

Si cambias las URLs de tu addon, actualiza:
- `CONFIG.SERVER_URL` y `CONFIG.MANIFEST_URL` en `js/main.js`
- Los enlaces en `index.html`

### Verificar Enlaces

Periódicamente verifica que:
- El addon esté funcionando correctamente
- Los enlaces de instalación funcionen
- La página sea accesible desde diferentes dispositivos

## 🤝 Contribuciones

Para contribuir al diseño de la página:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Realiza tus cambios en la carpeta `docs/`
4. Envía un pull request

## 📄 Licencia

Esta página está bajo la misma licencia que el proyecto principal.

---

**¿Necesitas ayuda?** Abre un issue en el repositorio de GitHub.
