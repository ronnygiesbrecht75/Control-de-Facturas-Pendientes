# Control de Pagos - v1.5.0

[![Versión](https://img.shields.io/badge/version-1.5.0-blue.svg)](https://github.com/ronnygiesbrecht75/Control-de-Facturas-Pendientes/releases)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC.svg)](https://tailwindcss.com/)
[![Electron](https://img.shields.io/badge/Electron-42-47848F.svg)](https://www.electronjs.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.0-119EFF.svg)](https://capacitorjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg)](https://firebase.google.com/)

Sistema integral y multiplataforma (**Web**, **Windows Desktop** y **Android Móvil**) desarrollado para la gestión, seguimiento y liquidación de facturas, cobranzas, pagos y clientes con formato paraguayo oficial y moneda en **Guaraníes (PYG)**.

---

## 🌟 Características Principales

- 📋 **Gestión de Facturas por Categorías**:
  - Facturas (Comercial Walter)
  - Otras Facturas
  - Facturas Cristian
  - Formato oficial paraguayo: `Sucursal (001) - Caja (009) - Número (0000000)`.
- 🚚 **Módulo Móvil para Repartidores**:
  - Vista adaptada para teléfonos y tablets.
  - Búsqueda instantánea de facturas por número.
  - Registro ágil de cobros en calle mediante teclado numérico con salto automático con tecla Enter.
- 💵 **Gestión Completa de Métodos de Pago**:
  - Efectivo
  - Transferencia Bancaria (con banco y número de comprobante)
  - Cheque al día (con banco y número de cheque)
  - Cheque diferido (con fecha de emisión, fecha de cobro y alertas de vencimiento)
- 🔄 **Sincronización Híbrida en Tiempo Real**:
  - Conexión directa a **Firebase Firestore** para sincronización simultánea entre computadoras de escritorio y teléfonos móviles.
  - Persistencia offline en **localStorage** para operar sin interrupciones incluso sin conexión a internet.
- 📊 **Exportación y Reportes**:
  - Generación de reportes imprimibles en **PDF (A4)** con membrete oficial, totales en Guaraníes y detalle de saldos.
  - Exportación de listados a formato **Excel (CSV)**.
  - Copias de seguridad completas del sistema en formato **JSON** (exportar e importar).
- 🔒 **Seguridad y Control de Acceso**:
  - Módulo multi-usuario con roles diferenciados (**Administrador**, **Cobrador**, **Visualizador**).
  - Permisos granulares por sección.
  - Bloqueo por PIN/Contraseña y soporte biométrico en dispositivos compatibles.
- ⚙️ **Panel de Ajustes Desacoplado**:
  - Columna de categorías fija e independiente para navegación rápida sin perder contexto.
  - Área de configuración con scroll independiente.
- 🚀 **Actualizador Automático Integrado**:
  - Comprobación y descarga de nuevas versiones directamente desde los lanzamientos de GitHub (**Releases**).
  - Enlaces directos para instalador de Windows (`.exe`) y paquete de Android (`.apk`).

---

## 💻 Tecnologías Utilizadas

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) + [Motion](https://motion.dev/)
- **Backend / Servidor**: [Express](https://expressjs.com/) (Node.js) con bundling optimizado mediante [esbuild](https://esbuild.github.io/)
- **Base de Datos**: [Firebase Firestore](https://firebase.google.com/docs/firestore) y [Firebase Auth](https://firebase.google.com/docs/auth)
- **Escritorio**: [Electron](https://www.electronjs.org/) + [Electron Builder](https://www.electron.build/)
- **Móvil**: [Capacitor 7](https://capacitorjs.com/) (Android)
- **Generación de Documentos**: [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** v20 o superior recomendado (mínimo v18)
- **npm** v10 o superior
- **Git**

### 1. Clonar el repositorio
```bash
git clone https://github.com/ronnygiesbrecht75/Control-de-Facturas-Pendientes.git
cd Control-de-Facturas-Pendientes
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto tomando como referencia `.env.example`:
```env
# Configuración opcional de Gemini AI
GEMINI_API_KEY=tu_clave_aqui

# URL de la aplicación
APP_URL=http://localhost:3000
```

### 4. Iniciar en modo desarrollo
```bash
npm run dev
```
La aplicación estará disponible inmediatamente en `http://localhost:3000`.

---

## 🛠️ Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo en el puerto 3000 con Vite y tsx. |
| `npm run build` | Compila la aplicación cliente en `dist/` y el servidor en `dist/server.cjs`. |
| `npm run start` | Inicia el servidor de producción compilado. |
| `npm run lint` | Ejecuta la verificación estática de tipos con TypeScript (`tsc --noEmit`). |
| `npm run preview` | Previsualiza la compilación de producción con Vite. |
| `npm run electron:start` | Abre la aplicación en una ventana de escritorio con Electron. |
| `npm run electron:build:win` | Genera el instalador ejecutable de Windows (`.exe`) en la carpeta `dist-electron/`. |

---

## 📱 Compilación para Android (.apk)

La aplicación está lista para sincronizarse y compilarse con Capacitor:

1. Compila la aplicación web:
   ```bash
   npm run build
   ```
2. Agrega y sincroniza la plataforma Android:
   ```bash
   npx cap sync android
   ```
3. Abre el proyecto en Android Studio:
   ```bash
   npx cap open android
   ```
4. O compila directamente el APK con Gradle:
   ```bash
   cd android && ./gradlew assembleDebug
   ```
   El archivo `.apk` resultante se encontrará en `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🤖 Automatización con GitHub Actions

El repositorio incluye flujos de trabajo listos para CI/CD en `.github/workflows`:

1. **`build-apk.yml`**: Compila automáticamente el APK de depuración para Android en cada push a las ramas principales y lo deja disponible en la pestaña *Actions* de GitHub.
2. **`release.yml`**: Al crear o empujar una etiqueta de versión (ej. `v1.5.0`) o ejecutar manualmente el flujo, compila tanto el instalador de Windows (`.exe`) como el APK de Android (`.apk`) y los publica automáticamente en un **GitHub Release** listo para ser descargado por los usuarios desde la app.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **Apache-2.0**.
