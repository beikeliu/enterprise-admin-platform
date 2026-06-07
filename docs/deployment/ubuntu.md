# Ubuntu Deployment

Production deployment currently uses:

- PostgreSQL 16 on `127.0.0.1:5432`
- NestJS API managed by systemd on `127.0.0.1:3001`
- Static React build served by Nginx under `/enterprise-admin/`
- API proxy exposed by Nginx under `/enterprise-admin-api/`

Public URLs:

```txt
https://kekezs.cn/enterprise-admin/
https://kekezs.cn/enterprise-admin-api/
```

Default demo account:

```txt
admin / admin123
```

## Server Paths

```txt
/opt/enterprise-admin-platform
/opt/enterprise-admin-platform/.env
/var/www/html/enterprise-admin
/etc/systemd/system/enterprise-admin-api.service
/etc/nginx/snippets/enterprise-admin.conf
```

## Deploy Steps

```bash
cd /opt/enterprise-admin-platform
set -a
. ./.env
set +a
pnpm install --frozen-lockfile
pnpm exec prisma db push
pnpm db:seed
pnpm build
sudo rm -rf /var/www/html/enterprise-admin
sudo mkdir -p /var/www/html/enterprise-admin
sudo cp -a apps/admin-web/dist/. /var/www/html/enterprise-admin/
sudo chown -R www-data:www-data /var/www/html/enterprise-admin
sudo systemctl restart enterprise-admin-api.service
sudo nginx -t
sudo systemctl reload nginx
```

## Health Checks

```bash
systemctl is-active enterprise-admin-api.service
curl -s -X POST https://kekezs.cn/enterprise-admin-api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```
