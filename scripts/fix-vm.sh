#!/bin/bash
# Sync2B Safeguard — Script de diagnóstico e correção para a VM
# Uso: bash scripts/fix-vm.sh [--reset-volumes]
# --reset-volumes: destrói e recria o volume do PostgreSQL (perde dados do cofre)

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
err()  { echo -e "${RED}[ERRO]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

RESET_VOLUMES=false
for arg in "$@"; do
  [[ "$arg" == "--reset-volumes" ]] && RESET_VOLUMES=true
done

echo ""
echo "============================================================"
echo "  Sync2B Safeguard — Diagnóstico + Correção"
echo "============================================================"
echo ""

# ── 1. Estado dos containers ─────────────────────────────────────
info "1. Estado dos containers:"
docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null
echo ""

# ── 2. Logs recentes da API ──────────────────────────────────────
info "2. Últimas 50 linhas de log da API:"
docker compose logs --tail=50 api 2>/dev/null || docker-compose logs --tail=50 api 2>/dev/null
echo ""

# ── 3. Health check manual ───────────────────────────────────────
info "3. Health check da API:"
if docker exec safeguard-api node -e "require('http').get('http://localhost:3000/healthz',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log(d);process.exit(r.statusCode===200?0:1)})}).on('error',e=>{console.error(e.message);process.exit(1)})" 2>/dev/null; then
  ok "API respondendo em /healthz"
else
  err "API NÃO está respondendo no health check"
fi
echo ""

# ── 4. Variáveis de ambiente da API ─────────────────────────────
info "4. Variáveis de ambiente críticas da API:"
docker exec safeguard-api sh -c 'echo "DATABASE_URL=$DATABASE_URL" && echo "JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET:0:20}..." && echo "CORS_ORIGINS=$CORS_ORIGINS" && echo "NODE_ENV=$NODE_ENV"' 2>/dev/null || warn "Container safeguard-api não encontrado"
echo ""

# ── 5. Conectividade com o banco ─────────────────────────────────
info "5. Conectividade API → PostgreSQL:"
docker exec safeguard-api node -e "
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query('SELECT version()').then(r => { console.log('OK:', r.rows[0].version); p.end(); process.exit(0); }).catch(e => { console.error('ERRO:', e.message); process.exit(1); });
" 2>/dev/null && ok "Conectividade DB OK" || err "Falha na conectividade com o banco"
echo ""

# ── 6. Estado do usuário admin no banco ──────────────────────────
info "6. Usuário admin no banco:"
docker exec safeguard-postgres psql -U safeguard -d safeguard -c "
SELECT u.id, u.email, u.role, u.is_active, u.otp_enabled,
       u.failed_login_attempts, u.locked_until,
       o.slug AS org_slug, o.is_active AS org_active,
       LEFT(u.password_hash, 20) || '...' AS hash_preview
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.email = 'eduardo@sync2b.com';
" 2>/dev/null || warn "Não foi possível conectar ao PostgreSQL"
echo ""

# ── 7. Verificar tabelas existentes ─────────────────────────────
info "7. Tabelas no banco:"
docker exec safeguard-postgres psql -U safeguard -d safeguard -c "\dt" 2>/dev/null || warn "Não foi possível listar tabelas"
echo ""

# ── 8. Verificar rate limit no Redis ────────────────────────────
info "8. Chaves de rate limit no Redis:"
docker exec safeguard-redis redis-cli KEYS "rl:auth:*" 2>/dev/null | head -20 || warn "Redis não disponível"
echo ""

# ── 9. CORREÇÃO ──────────────────────────────────────────────────
echo "============================================================"
echo "  APLICANDO CORREÇÃO"
echo "============================================================"
echo ""

if [ "$RESET_VOLUMES" = true ]; then
  warn "ATENÇÃO: --reset-volumes vai DESTRUIR todos os dados do cofre!"
  warn "Pressione Ctrl+C nos próximos 5 segundos para cancelar..."
  sleep 5
  info "Parando containers e removendo volumes..."
  docker compose down -v 2>/dev/null || docker-compose down -v 2>/dev/null
  ok "Volumes removidos"
else
  info "Parando containers (preservando volumes)..."
  docker compose down 2>/dev/null || docker-compose down 2>/dev/null
fi

# ── Limpar chaves de rate limit no Redis (se o volume existe) ────
info "Limpando rate limit do Redis (se volume existir)..."
docker run --rm --network safeguard_default redis:7-alpine redis-cli -h redis KEYS "rl:auth:*" 2>/dev/null | \
  xargs -r docker run --rm --network safeguard_default redis:7-alpine redis-cli -h redis DEL 2>/dev/null \
  && ok "Rate limit limpo" || warn "Redis não disponível para limpeza (normal se volume foi removido)"

# ── Rebuild forçado ──────────────────────────────────────────────
info "Rebuilding imagens sem cache..."
docker compose build --no-cache api frontend 2>/dev/null || docker-compose build --no-cache api frontend 2>/dev/null
ok "Build concluído"

# ── Subir tudo ──────────────────────────────────────────────────
info "Subindo todos os containers..."
docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null

# ── Aguardar API ficar healthy ───────────────────────────────────
info "Aguardando API ficar healthy (timeout: 90s)..."
TIMEOUT=90
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' safeguard-api 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "healthy" ]; then
    ok "API está healthy!"
    break
  fi
  echo -n "."
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done
echo ""

if [ "$STATUS" != "healthy" ]; then
  err "API não ficou healthy em ${TIMEOUT}s. Logs:"
  docker compose logs --tail=30 api 2>/dev/null
fi

# ── Teste de login ───────────────────────────────────────────────
echo ""
info "10. Testando login com curl:"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"eduardo@sync2b.com","password":"Sync2B@2026"}' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "200" ]; then
  ok "LOGIN FUNCIONANDO! POST /api/v2/auth/login → 200 OK"
else
  err "Login ainda falhando. Status: $HTTP_CODE"
  echo ""
  warn "Verificando logs da API para detalhes:"
  docker compose logs --tail=20 api 2>/dev/null
fi

echo ""
echo "============================================================"
echo "  DIAGNÓSTICO CONCLUÍDO"
echo "============================================================"
