# FJU Cuenca

Red social para la comunidad FJU (Federacion de Juventudes Unidas) de Cuenca.

## Requisitos

- Node.js + npm

## Correr en local

```bash
npm install
npm start
```

## Variables de entorno (opcional)

Estas variables habilitan el boton "Avisar al admin (WhatsApp)" en las pantallas:

- Verifica tu correo
- Cuenta pendiente

En local crea un archivo `.env` (no se sube al repo) y agrega:

```bash
REACT_APP_ADMIN_WA_PHONE=5939XXXXXXXX
REACT_APP_ADMIN_WA_NAME=Pastor
```

Notas:

- `REACT_APP_ADMIN_WA_PHONE` debe ir sin `+` y sin espacios (formato internacional).
- En Vercel: Project Settings -> Environment Variables.

