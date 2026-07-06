#!/usr/bin/env bash
#
# demo-db.sh — 一键拉起 / 停止本地演示数据库（临时 Postgres + 种子数据）
#
# 仅用于本地预览参与者 H5 页面，数据放在 /tmp，重启电脑即消失。
# 不影响你的真实数据库；.env.local 只在缺失时才会被写入。
#
# 用法：
#   scripts/demo-db.sh up      # 初始化+启动+建库+写 .env.local+推 schema+灌种子数据
#   scripts/demo-db.sh seed    # 仅重灌种子数据（重置计数等）
#   scripts/demo-db.sh status  # 查看数据库运行状态
#   scripts/demo-db.sh down    # 停止数据库（保留数据目录）
#   scripts/demo-db.sh reset   # 彻底重来（删数据目录后 up）
#
# 之后运行 `pnpm dev`，用手机视口打开：
#   /c/CK01  签到   /v/VT01  投票   /l/LT01  抽奖   /f/FM01  表单
#   联动演示：再开对应 /<type>/<code>/display 大屏页。

set -euo pipefail

# ── 配置 ──
PGDIR="${SCANSIGN_PGDIR:-/tmp/scansign_pg}"
PGPORT="${SCANSIGN_PGPORT:-55432}"
PGDB="${SCANSIGN_PGDB:-scansign}"
PGSOCK="/tmp"
DATABASE_URL="postgres://postgres@localhost:${PGPORT}/${PGDB}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── 定位 Postgres 二进制 ──
find_pgbin() {
  if command -v pg_ctl >/dev/null 2>&1; then dirname "$(command -v pg_ctl)"; return; fi
  for d in /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin \
           /opt/homebrew/opt/postgresql/bin /usr/local/opt/postgresql/bin; do
    if [ -x "$d/pg_ctl" ]; then echo "$d"; return; fi
  done
  echo ""; return
}
PGBIN="$(find_pgbin)"
if [ -z "$PGBIN" ]; then
  echo "✗ 找不到 Postgres（pg_ctl）。请先安装：brew install postgresql@18" >&2
  exit 1
fi
export PATH="$PGBIN:$PATH"

psql_demo() { psql -h "$PGSOCK" -p "$PGPORT" -U postgres -d "$PGDB" "$@"; }

is_running() { pg_ctl -D "$PGDIR" status >/dev/null 2>&1; }

start_pg() {
  if [ ! -f "$PGDIR/PG_VERSION" ]; then
    echo "▶ 初始化数据目录 $PGDIR ..."
    mkdir -p "$PGDIR"
    initdb -D "$PGDIR" -U postgres --auth=trust >/tmp/scansign_pg_init.log 2>&1
  fi
  if is_running; then
    echo "✓ 数据库已在运行（端口 $PGPORT）"
  else
    echo "▶ 启动 Postgres（端口 $PGPORT）..."
    pg_ctl -D "$PGDIR" -o "-p $PGPORT -k $PGSOCK" -l /tmp/scansign_pg.log start >/dev/null 2>&1
    sleep 2
  fi
  # 建库（若不存在）
  if ! psql -h "$PGSOCK" -p "$PGPORT" -U postgres -lqt | cut -d'|' -f1 | grep -qw "$PGDB"; then
    psql -h "$PGSOCK" -p "$PGPORT" -U postgres -c "create database \"$PGDB\";" >/dev/null
    echo "✓ 已创建数据库 $PGDB"
  fi
}

write_env() {
  if [ -f .env.local ]; then
    echo "• 已存在 .env.local，未改动（如需连本演示库，请确认其中 DATABASE_URL=$DATABASE_URL）"
  else
    cat > .env.local <<EOF
DATABASE_URL=$DATABASE_URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=dev-local-secret
ADMIN_PHONE=13800000000
OPS_SUPER_USER_PHONE=13800000000
EOF
    echo "✓ 已写入 .env.local（指向本演示库）"
  fi
}

push_schema() {
  echo "▶ 同步表结构（drizzle push）..."
  DATABASE_URL="$DATABASE_URL" pnpm db:push >/tmp/scansign_dbpush.log 2>&1 \
    && echo "✓ 表结构已同步" \
    || { echo "✗ db:push 失败，见 /tmp/scansign_dbpush.log"; tail -8 /tmp/scansign_dbpush.log; exit 1; }
}

seed() {
  echo "▶ 灌入种子数据（幂等，会重置计数）..."
  psql_demo -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
set search_path to tool;

-- 清掉旧演示数据（按已知 id，避免影响你手工建的活动）
delete from "LotteryWinner" where "lotteryId"='lt1';
delete from "LotteryParticipant" where "lotteryId"='lt1';
delete from "LotteryPrize" where "lotteryId"='lt1';
delete from "Lottery" where id='lt1';
delete from "VoteRecord" where "voteId"='vt1';
delete from "VoteOption" where "voteId"='vt1';
delete from "Vote" where id='vt1';
delete from "CheckinRecord" where "checkinId"='ck1';
delete from "Checkin" where id='ck1';
delete from "FormResponse" where "formId"='fm1';
delete from "Form" where id='fm1';

insert into "User"(id,email,password,nickname,role,"createdAt","updatedAt")
 values ('u1','admin@demo.local','x','管理员','ADMIN',now(),now()) on conflict (id) do nothing;

insert into "Checkin"(id, code, title, description, status, config, display, "totalCount","todayCount","createdAt","updatedAt","userId")
values ('ck1','CK01','年会现场签到','扫码即可完成签到','ACTIVE',
  '{"fields":{"name":true,"phone":true,"department":true},"allowRepeat":false,"departments":[{"id":"d1","name":"技术部"},{"id":"d2","name":"市场部"}]}',
  '{"wallStyle":"bubble"}', 42, 42, now(), now(), 'u1');

insert into "Vote"(id, code, title, description, status, "voteType","maxChoices", config, display, "createdAt","updatedAt","userId")
values ('vt1','VT01','最佳员工评选','为你心中的最佳员工投票','ACTIVE','SINGLE',1,
  '{"requirePhone":false,"allowChange":true,"showResult":{"realtime":true,"afterVote":true}}','{"chartType":"bar"}', now(), now(), 'u1');
insert into "VoteOption"(id,"voteId",title,description,"sortOrder","voteCount") values
 ('vo1','vt1','张三','技术部',0,12),('vo2','vt1','李四','市场部',1,8),('vo3','vt1','王五','运营部',2,5);

insert into "Lottery"(id, code, title, description, status, "lotteryType", prizes, config, display, "participantCount","createdAt","updatedAt","userId")
values ('lt1','LT01','年会幸运大抽奖','签到即可参与抽奖','ACTIVE','WHEEL','[]','{"mode":"wheel","requirePhone":true,"requireName":true}','{}', 88, now(), now(), 'u1');
insert into "LotteryPrize"(id,"lotteryId",name,description,quantity,remaining,probability,"sortOrder") values
 ('lp1','lt1','一等奖 iPhone','',1,1,0.1,0),('lp2','lt1','二等奖 耳机','',3,3,0.3,1),('lp3','lt1','三等奖 保温杯','',5,5,0.6,2);

insert into "Form"(id, code, title, description, status, fields, config, display, "responseCount","createdAt","updatedAt","userId")
values ('fm1','FM01','活动报名表','请填写报名信息','ACTIVE',
  '[{"id":"f_name","type":"text","label":"姓名","required":true}]',
  '{"fields":[{"id":"f_name","type":"text","label":"姓名","required":true,"placeholder":"请输入姓名"},{"id":"f_meal","type":"radio","label":"餐饮偏好","required":true,"options":[{"value":"meat","label":"荤"},{"value":"veg","label":"素"}]},{"id":"f_rating","type":"rating","label":"期待值","ratingConfig":{"max":5}},{"id":"f_note","type":"textarea","label":"备注"}],"rules":{"requirePhone":true},"submit":{"showPreview":true,"buttonText":"提交报名","successMessage":"报名成功，期待您的参与！"}}',
  '{}', 15, now(), now(), 'u1');
SQL
  echo "✓ 种子数据就绪：CK01 签到 / VT01 投票 / LT01 抽奖 / FM01 表单"
}

print_urls() {
  cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
演示库已就绪。请（重新）运行：  pnpm dev
手机视口打开：
  签到  http://localhost:3000/c/CK01
  投票  http://localhost:3000/v/VT01
  抽奖  http://localhost:3000/l/LT01
  表单  http://localhost:3000/f/FM01
第二屏联动：另开 http://localhost:3000/l/LT01/display 等大屏页
停止数据库：  scripts/demo-db.sh down
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
}

case "${1:-up}" in
  up)
    start_pg
    write_env
    push_schema
    seed
    print_urls
    ;;
  seed)
    start_pg
    seed
    ;;
  status)
    if is_running; then echo "✓ 运行中（端口 ${PGPORT} ，数据目录 ${PGDIR} ）"; else echo "✗ 未运行"; fi
    ;;
  down)
    if is_running; then
      pg_ctl -D "$PGDIR" stop -m fast >/dev/null 2>&1 && echo "✓ 已停止"
    else
      echo "• 数据库本就未运行"
    fi
    ;;
  reset)
    is_running && pg_ctl -D "$PGDIR" stop -m fast >/dev/null 2>&1 || true
    rm -rf "$PGDIR"
    echo "✓ 已删除数据目录，重新拉起..."
    start_pg; write_env; push_schema; seed; print_urls
    ;;
  *)
    echo "用法: scripts/demo-db.sh {up|seed|status|down|reset}" >&2
    exit 1
    ;;
esac
