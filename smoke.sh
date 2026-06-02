#!/usr/bin/env bash

BASE_URL="https://ibrahim-anate-lendsqr-be-test.onrender.com"
TS=$(date +%s)

EMAIL_A="smoke.a.$TS@example.com"
PHONE_A="0801$((RANDOM%9000000+1000000))"
EMAIL_B="smoke.b.$TS@example.com"
PHONE_B="0802$((RANDOM%9000000+1000000))"
PASS="SecurePass123!"

echo "---- 1) Health ----"
curl -s "$BASE_URL/health"; echo; echo

echo "---- 2) Register User A ----"
REG_A=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Smoke User A\",
    \"email\": \"$EMAIL_A\",
    \"phone\": \"$PHONE_A\",
    \"password\": \"$PASS\"
  }")
echo "$REG_A"; echo

echo "---- 3) Register User B ----"
REG_B=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Smoke User B\",
    \"email\": \"$EMAIL_B\",
    \"phone\": \"$PHONE_B\",
    \"password\": \"$PASS\"
  }")
echo "$REG_B"; echo

echo "---- 4) Login User A ----"
LOGIN_A=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL_A\",
    \"password\": \"$PASS\"
  }")
echo "$LOGIN_A"; echo

TOKEN_A=$(printf '%s' "$LOGIN_A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.token||'')}catch{console.log('')}})")
REFRESH_A=$(printf '%s' "$LOGIN_A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.refreshToken||'')}catch{console.log('')}})")

if [ -z "$TOKEN_A" ]; then
  echo "No token returned for User A login. Stop here."
  exit 1
fi

echo "---- 5) Fund User A wallet ----"
curl -s -X POST "$BASE_URL/api/wallet/fund" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 5000 }'
echo; echo

echo "---- 6) User A balance ----"
curl -s "$BASE_URL/api/wallet/balance" \
  -H "Authorization: Bearer $TOKEN_A"
echo; echo

echo "---- 7) Send from A -> B ----"
curl -s -X POST "$BASE_URL/api/wallet/send" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipientPhone\": \"$PHONE_B\",
    \"amount\": 1000,
    \"description\": \"smoke transfer\"
  }"
echo; echo

echo "---- 8) Transactions ----"
curl -s "$BASE_URL/api/transactions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN_A"
echo; echo

echo "---- 9) Refresh token ----"
curl -s -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{ \"refreshToken\": \"$REFRESH_A\" }"
echo; echo

echo "Smoke test sequence completed."
