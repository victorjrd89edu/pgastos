# FinanzasApp - Gestor de Finanzas Personales

Aplicación completa para gestionar tus finanzas personales: ingresos, gastos y ahorros con estadísticas detalladas.

## Características

### Funcionalidades Principales
- 🔐 **Autenticación JWT**: Sistema seguro de registro e inicio de sesión
- 👥 **Sistema de Roles**: Administrador y usuarios con permisos diferenciados
- 💰 **Gestión de Transacciones**: Ingresos, gastos y ahorros
- 🏷️ **Categorías Personalizables**: Crea, edita y elimina categorías para organizar tus transacciones
- 📊 **Estadísticas Detalladas**: Visualiza tus finanzas con gráficos interactivos
- 🎨 **Diseño Moderno**: Interfaz atractiva con gradientes suaves y animaciones
- 📱 **Responsive**: Funciona perfectamente en móvil y desktop

### Características Técnicas
- **Backend Escalable**: FastAPI + MongoDB con arquitectura async
- **Frontend Moderno**: React 19 + TailwindCSS + shadcn/ui
- **Seguridad**: Passwords hasheadas con bcrypt, tokens JWT
- **Base de Datos**: MongoDB con índices optimizados
- **API RESTful**: Endpoints documentados y consistentes

## Stack Tecnológico

### Backend
- **FastAPI**: Framework web moderno y rápido
- **MongoDB**: Base de datos NoSQL con Motor (async driver)
- **JWT**: JSON Web Tokens para autenticación
- **Bcrypt**: Hash seguro de contraseñas
- **Python 3.10+**

### Frontend
- **React 19**: Biblioteca de UI con hooks
- **React Router**: Navegación SPA
- **Axios**: Cliente HTTP
- **shadcn/ui**: Componentes UI accesibles
- **TailwindCSS**: Utilidad CSS
- **Recharts**: Gráficos interactivos
- **Sonner**: Notificaciones toast

## Estructura del Proyecto

```
/app
├── backend/
│   ├── server.py           # API FastAPI
│   ├── requirements.txt    # Dependencias Python
│   └── .env               # Variables de entorno
├── frontend/
│   ├── src/
│   │   ├── App.js         # Componente principal
│   │   ├── pages/         # Páginas de la aplicación
│   │   │   ├── AuthPage.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Transactions.js
│   │   │   ├── Categories.js
│   │   │   └── Statistics.js
│   │   └── components/    # Componentes reutilizables
│   │       ├── Layout.js
│   │       └── ui/        # Componentes UI (shadcn)
│   ├── package.json       # Dependencias Node
│   └── .env              # Variables de entorno
└── README.md
```

## Instalación Local

### Prerrequisitos
- Python 3.10 o superior
- Node.js 18 o superior
- MongoDB 5.0 o superior
- Yarn (recomendado) o npm

### 1. Clonar el repositorio
```bash
git clone <tu-repositorio>
cd app
```

### 2. Configurar Backend

```bash
cd backend

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (.env):
# MONGO_URL="mongodb://localhost:27017"
# DB_NAME="finanzas_app"
# JWT_SECRET_KEY="tu-clave-super-secreta"
# CORS_ORIGINS="*"
```

### 3. Configurar Frontend

```bash
cd ../frontend

# Instalar dependencias
yarn install

# Configurar variables de entorno (.env):
# REACT_APP_BACKEND_URL="http://localhost:8001"
```

### 4. Iniciar Servicios

#### Iniciar MongoDB
```bash
# Asegúrate de que MongoDB está corriendo
mongod --dbpath /path/to/data
```

#### Iniciar Backend
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Iniciar Frontend
```bash
cd frontend
yarn start
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Documentación API**: http://localhost:8001/docs

## Despliegue en VPS (Hostinger u otro)

### Opción 1: Despliegue Manual con Nginx + Supervisor

#### 1. Preparar el servidor
```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y python3-pip python3-venv nginx supervisor mongodb

# Instalar Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar yarn
npm install -g yarn
```

#### 2. Subir el código
```bash
# Clonar o subir tu repositorio
cd /var/www
git clone <tu-repositorio> finanzas-app
cd finanzas-app
```

#### 3. Configurar Backend
```bash
cd /var/www/finanzas-app/backend

# Crear entorno virtual e instalar dependencias
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configurar .env
nano .env
# Configurar:
MONGO_URL="mongodb://localhost:27017"
DB_NAME="finanzas_app"
JWT_SECRET_KEY="tu-clave-super-secreta-cambiar-en-produccion"
CORS_ORIGINS="https://tudominio.com"
```

#### 4. Configurar Frontend
```bash
cd /var/www/finanzas-app/frontend

# Instalar dependencias
yarn install

# Configurar .env
nano .env
# Configurar:
REACT_APP_BACKEND_URL="https://tudominio.com"

# Construir para producción
yarn build
```

#### 5. Configurar Supervisor (Backend)
```bash
sudo nano /etc/supervisor/conf.d/finanzas-backend.conf
```

Contenido:
```ini
[program:finanzas-backend]
command=/var/www/finanzas-app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/var/www/finanzas-app/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/finanzas-backend.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start finanzas-backend
```

#### 6. Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/finanzas-app
```

Contenido:
```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Frontend
    location / {
        root /var/www/finanzas-app/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/finanzas-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Configurar SSL con Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

### Opción 2: Despliegue con Docker (Recomendado)

#### 1. Crear Dockerfile para Backend
```dockerfile
# backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

#### 2. Crear Dockerfile para Frontend
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. Crear docker-compose.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: finanzas-mongodb
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: finanzas_app

  backend:
    build: ./backend
    container_name: finanzas-backend
    restart: always
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=finanzas_app
      - JWT_SECRET_KEY=tu-clave-super-secreta
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    container_name: finanzas-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

#### 4. Desplegar con Docker
```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

## Exportar código para pruebas locales

Para extraer todo el código y desplegarlo en tu VPS:

```bash
# En tu máquina local, crear un archivo con todo el proyecto
tar -czf finanzas-app.tar.gz app/

# Subir a tu VPS
scp finanzas-app.tar.gz usuario@tu-servidor:/home/usuario/

# En el VPS, descomprimir
ssh usuario@tu-servidor
cd /home/usuario
tar -xzf finanzas-app.tar.gz
cd app
```

Luego sigue las instrucciones de despliegue según la opción que prefieras.

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Categorías
- `GET /api/categories` - Listar categorías del usuario
- `POST /api/categories` - Crear categoría
- `PUT /api/categories/{id}` - Actualizar categoría
- `DELETE /api/categories/{id}` - Eliminar categoría

### Transacciones
- `GET /api/transactions` - Listar transacciones
- `POST /api/transactions` - Crear transacción
- `GET /api/transactions/{id}` - Obtener transacción
- `PUT /api/transactions/{id}` - Actualizar transacción
- `DELETE /api/transactions/{id}` - Eliminar transacción

### Estadísticas
- `GET /api/statistics` - Obtener estadísticas financieras

### Admin
- `GET /api/admin/users` - Listar todos los usuarios (solo admin)

## Usuarios por Defecto

Al registrarse, cada usuario recibe 8 categorías predefinidas:
- **Ingresos**: Salario, Freelance
- **Gastos**: Alimentación, Transporte, Vivienda, Entretenimiento
- **Ahorros**: Ahorro de emergencia, Inversiones

## Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT con expiración (7 días)
- ✅ Validación de datos con Pydantic
- ✅ CORS configurado
- ✅ Variables de entorno para secretos
- ✅ Protección de rutas por autenticación
- ✅ Separación de datos por usuario

## Mantenimiento

### Backup de MongoDB
```bash
mongodump --db finanzas_app --out /backup/$(date +%Y%m%d)
```

### Restaurar backup
```bash
mongorestore --db finanzas_app /backup/20250123/finanzas_app
```

### Ver logs
```bash
# Supervisor
sudo tail -f /var/log/finanzas-backend.log

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker
docker-compose logs -f
```

## Solución de Problemas

### Backend no inicia
```bash
# Verificar MongoDB
sudo systemctl status mongodb

# Verificar logs
sudo tail -f /var/log/finanzas-backend.log

# Reiniciar servicio
sudo supervisorctl restart finanzas-backend
```

### Frontend no carga
```bash
# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx

# Reconstruir frontend
cd /var/www/finanzas-app/frontend
yarn build
```

### Error de CORS
Verificar que CORS_ORIGINS en backend/.env incluye tu dominio:
```
CORS_ORIGINS="https://tudominio.com,http://localhost:3000"
```

## Futuras Mejoras

- 🤖 Integración con agentes de IA para análisis financiero
- 📧 Notificaciones por email
- 📱 App móvil nativa
- 🔄 Sincronización con bancos
- 📊 Más tipos de gráficos y reportes
- 🌍 Soporte multi-idioma
- 🎯 Metas de ahorro con progreso
- 📅 Recordatorios de pagos

## Licencia

MIT License - Libre para uso personal y comercial

## Soporte

Para reportar bugs o solicitar features, crear un issue en el repositorio.

---

**Desarrollado con ❤️ usando FastAPI, React y MongoDB**
