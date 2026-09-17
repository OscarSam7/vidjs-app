# Guía de Despliegue en Producción | Vidjs Night Experience OS

Esta guía proporciona las instrucciones paso a paso para desplegar **Vidjs** en servidores de producción utilizando contenedores Docker o plataformas PaaS/Serverless en la nube.

---

## Índice
1. [Requisitos Previos](#1-requisitos-previos)
2. [Opción A: Despliegue en VPS con Docker Compose & SSL (Recomendado)](#2-opción-a-despliegue-en-vps-con-docker-compose--ssl-recomendado)
3. [Opción B: Despliegue en Railway / Render](#3-opción-b-despliegue-en-railway--render)
4. [Opción C: Despliegue en Vercel + PostgreSQL Serverless](#4-opción-c-despliegue-en-vercel--postgresql-serverless)
5. [Monitoreo & Healthcheck en Caliente](#5-monitoreo--healthcheck-en-caliente)

---

## 1. Requisitos Previos

Antes de comenzar el despliegue, asegúrate de tener:
* Un nombre de dominio apuntando a la IP de tu servidor (ej: `app.tubar.com` o `play.vidjs.com`).
* Una clave secreta JWT aleatoria de 32+ caracteres. Puedes generarla con:
  ```bash
  openssl rand -base64 32
  ```

---

## 2. Opción A: Despliegue en VPS con Docker Compose & SSL (Recomendado)

Esta opción es ideal para un servidor dedicado (DigitalOcean Droplet, Hetzner, AWS EC2, Linode o VPS similar con Ubuntu 22.04 / 24.04).

### Paso 1: Instalar Docker y Docker Compose en el servidor
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Instalar Docker oficial
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Paso 2: Subir el proyecto y configurar variables
```bash
git clone https://github.com/tu-usuario/vidjs.git /var/www/vidjs
cd /var/www/vidjs

# Copiar plantilla de entorno
cp .env.example .env
nano .env
```
Ajusta los valores en `.env`:
```env
DATABASE_URL="postgresql://vidjs_user:TuPasswordSuperSegura@db:5432/vidjs_production?schema=public"
JWT_SECRET="tu_clave_secreta_generada_con_openssl"
NEXTAUTH_URL="https://app.tubar.com"
PORT=3000
NODE_ENV="production"
```

### Paso 3: Iniciar los contenedores con Docker Compose
```bash
# Construir e iniciar en segundo plano
docker compose up -d --build

# Verificar que los contenedores estén saludables
docker compose ps
```

### Paso 4: Configurar Nginx como Reverse Proxy con SSL
Crea el archivo de configuración en `/etc/nginx/sites-available/vidjs`:
```nginx
server {
    server_name app.tubar.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Soporte para Server-Sent Events (SSE) de ultra-baja latencia
        proxy_set_header X-Accel-Buffering no;
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Habilitar y obtener certificado HTTPS gratuito:
```bash
sudo ln -s /etc/nginx/sites-available/vidjs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Emitir certificado SSL automático
sudo certbot --nginx -d app.tubar.com
```

¡Listo! Tu plataforma estará en vivo y protegida por HTTPS con HTTP/2 y streaming SSE nativo.

---

## 3. Opción B: Despliegue en Railway / Render

1. Crea una cuenta en [Railway.app](https://railway.app) o [Render.com](https://render.com).
2. Selecciona **"New Project" $\to$ "Deploy from GitHub repo"** y elige tu repositorio.
3. Añade un servicio de **PostgreSQL** desde el panel.
4. En las variables de entorno de la aplicación, asigna:
   * `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   * `JWT_SECRET`: (Tu clave secreta)
   * `NEXTAUTH_URL`: (La URL pública generada por Railway)
   * `NODE_ENV`: `production`
5. Railway detectará automáticamente el `Dockerfile` multi-etapa y compilará la versión standalone.

---

## 4. Opción C: Despliegue en Vercel + PostgreSQL Serverless

Si prefieres la arquitectura serverless:
1. Conecta tu repositorio en [Vercel](https://vercel.com).
2. Crea una base de datos PostgreSQL serverless gratuita en [Neon.tech](https://neon.tech) o [Supabase](https://supabase.com).
3. Añade las variables de entorno en el panel de Vercel:
   * `DATABASE_URL`: `postgres://...`
   * `JWT_SECRET`: `...`
4. Ejecuta `npx prisma db push` apuntando a tu base de datos remota para inicializar las tablas.
5. Vercel desplegará automáticamente con soporte global CDN.

---

## 5. Monitoreo & Healthcheck en Caliente

Vidjs expone un endpoint de salud listo para integrarse con balanceadores de carga (AWS ALB, Cloudflare Health Checks, Uptime Kuma o Datadog):

* **URL**: `GET /api/v1/health`
* **Respuesta Exitosa (HTTP 200)**:
  ```json
  {
    "status": "healthy",
    "uptimeSeconds": 3482,
    "timestamp": "2026-09-17T18:40:00.000Z",
    "environment": "production",
    "database": {
      "status": "connected",
      "tenants": 1,
      "latencyMs": 4
    },
    "memory": {
      "rssMb": 85.2,
      "heapUsedMb": 42.1,
      "heapTotalMb": 58.6
    },
    "service": "vidjs-night-experience-os",
    "version": "0.1.0"
  }
  ```
* **Respuesta de Falla (HTTP 503)**:
  Se emite automáticamente si la base de datos se interrumpe, permitiendo a los balanceadores redirigir tráfico o reiniciar el contenedor de manera automática.
