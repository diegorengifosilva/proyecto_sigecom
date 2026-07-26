# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SIGECOM 5 is an ERP system for commercial management (cotizaciones, aperturas, logística) for V&C Corp. It is a full-stack app: Django REST API backend + React SPA frontend.

## Development Commands

### Backend (Django)
Run from the repo root with the `env` virtualenv active:
```powershell
# Activate virtualenv (Windows)
.\env\Scripts\Activate.ps1

# Run development server (port 8000)
python manage.py runserver

# Run Django shell
python manage.py shell

# Collect static files for production
python manage.py collectstatic --noinput
```

### Frontend (Vite + React)
Run from the `frontend/` directory:
```powershell
cd frontend

npm run dev        # Dev server on port 5173 (proxies /api to localhost:8000)
npm run build      # Production build to frontend/dist/
npm run lint       # ESLint
npm run preview    # Preview the production build locally
```

### Running both simultaneously
Open two terminals: one for `python manage.py runserver`, another for `cd frontend && npm run dev`.

## Architecture

### Backend structure
```
backend/          - Django project config (settings, urls, wsgi, authentication, db_router)
cotizaciones_api/ - Main business module: cotizaciones, aperturas, suministros, servicios
logistica_api/    - Logistics module
core/             - Shared master data models (Cliente, Representante, TipoCotizacion, etc.)
users/            - Custom user model (Usuario)
manage.py
requirements.txt
```

### Frontend structure
```
frontend/src/
  App.jsx                  - Root router (React Router v7, all routes under /sigecom/*)
  context/                 - AuthContext (JWT), KeyboardContext
  services/api.js          - Axios instance with JWT Bearer interceptor + 401 auto-refresh
  dashboard/
    layout/                - DashboardLayout (collapsible sidebar + breadcrumbs), GlobalNavbar
    comercial/             - Commercial module: Cotizaciones, Aperturas, Oportunidades, Programacion
    Tablas/                - Master data views (EstructuraComercial, CatalogoMarcas, etc.)
    Suministros/           - Supply item modals and brand tables (Rittal, Rockwell, etc.)
    Servicios/             - Service item modals
    board/                 - Configurable dashboard widgets (KPI, Bar, Line, Pie)
    logistica/             - Logistics dashboard
  hook/                    - Custom hooks: useCotizacionClientes, useCotizacionSuministros, useCotizacionServicios, useCotizacionAcciones
  modal/                   - CotizacionNuevaModal
```

### API routing
All backend endpoints are prefixed under `/api/`:
- `/api/users/` — users module
- `/api/core/` — shared master data
- `/api/cotizaciones/` — cotizaciones_api module
- `/api/` — logistica_api module
- Catch-all `re_path(r'^.*$')` serves the React SPA (`frontend/dist/index.html`)

### Auth flow
- Custom JWT: `CustomJWTAuthentication` in `backend/authentication.py` looks up users by `usuario` field (not Django's default `id`)
- Tokens stored in `localStorage` as `access_token` and `refresh_token`
- Axios interceptor in `services/api.js` automatically attaches `Bearer` header and handles 401 → refresh → retry

### Database
- Single MySQL database (`proyecto_sigecom` on `127.0.0.1:3306`)
- `backend/db_router.py` (`VCRouter`): routes all reads/writes to `default`, **disables all migrations** (`allow_migrate` returns `False`)
- Most models use `managed = False` — they map to existing MySQL tables; Django does not control their schema
- Only a few managed models exist: `Notificacion`, `ObjetivoAnual`, `ObjetivoAnualArea`
- Custom MySQL datetime converter in `settings.py` handles MySQL zero-date values (`0000-00-00`) that PyMySQL cannot parse natively

### Key Django settings
- `AUTH_USER_MODEL = "users.Usuario"` — custom user without Django's standard `AbstractUser`
- `LANGUAGE_CODE = 'es-pe'`, `TIME_ZONE = 'America/Lima'`
- `CORS_ALLOW_ALL_ORIGINS = True` (development)
- Static files served by WhiteNoise; frontend build output (`frontend/dist`) is listed in `STATICFILES_DIRS`
- `VITE_API_URL` env var controls the API base URL (defaults to `http://localhost:8000/api/`)

### Frontend key patterns
- `@/` path alias resolves to `frontend/src/`
- TanStack Query (`@tanstack/react-query`) used for server state; custom hooks in `hook/` encapsulate query logic
- Notifications use `react-toastify` (global `<ToastContainer>`)
- Tailwind CSS + `lucide-react` icons throughout; Radix UI primitives for dialogs/dropdowns/tabs
- `echarts-for-react` and `recharts` for charts on the dashboard
- PWA enabled via `vite-plugin-pwa`
