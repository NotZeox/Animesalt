#!/bin/bash

# Comprehensive API Test Script
# Tests all main endpoints of the Anime Salt API

BASE_URL="http://127.0.0.1:4000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "   Anime Salt API - Comprehensive Test"
echo "========================================"
echo ""

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_success="${3:-true}"
    
    echo -n "Testing $name... "
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        success=$(echo "$body" | grep -o '"success":true' || echo "")
        if [ -n "$success" ]; then
            echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
            return 0
        else
            echo -e "${YELLOW}⚠ PARTIAL${NC} (HTTP $200 but success:false)"
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        return 1
    fi
}

# Counters
passed=0
failed=0
total=0

# Home endpoints
echo "=== HOME ENDPOINTS ==="
test_endpoint "GET /api/home" "$BASE_URL/api/home" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/top-ten" "$BASE_URL/api/top-ten" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/health" "$BASE_URL/api/health" && ((passed++)) || ((failed++))
((total++))
echo ""

# Info endpoints
echo "=== INFO ENDPOINTS ==="
test_endpoint "GET /api/info" "$BASE_URL/api/info?id=naruto-shippuden" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/random" "$BASE_URL/api/random" && ((passed++)) || ((failed++))
((total++))
echo ""

# Episodes endpoints
echo "=== EPISODES ENDPOINTS ==="
test_endpoint "GET /api/episodes" "$BASE_URL/api/episodes?id=naruto-shippuden" && ((passed++)) || ((failed++))
((total++))
echo ""

# Stream endpoints
echo "=== STREAM ENDPOINTS ==="
test_endpoint "GET /api/stream" "$BASE_URL/api/stream?id=naruto-shippuden&episode=1" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/servers" "$BASE_URL/api/servers?id=naruto-shippuden&episode=1" && ((passed++)) || ((failed++))
((total++))
echo ""

# Movie endpoints
echo "=== MOVIE ENDPOINTS ==="
test_endpoint "GET /api/movie" "$BASE_URL/api/movie?id=your-name" && ((passed++)) || ((failed++))
((total++))
echo ""

# Search endpoints
echo "=== SEARCH ENDPOINTS ==="
test_endpoint "GET /api/search" "$BASE_URL/api/search?q=naruto" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/search/suggest" "$BASE_URL/api/search/suggest?q=nar" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/top-search" "$BASE_URL/api/top-search" && ((passed++)) || ((failed++))
((total++))
echo ""

# Category endpoints
echo "=== CATEGORY ENDPOINTS ==="
test_endpoint "GET /api/series" "$BASE_URL/api/series?page=1" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/movies" "$BASE_URL/api/movies?page=1" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/category/cartoon" "$BASE_URL/api/category/cartoon?page=1" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/category/letter/A" "$BASE_URL/api/category/letter/A?page=1" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/categories" "$BASE_URL/api/categories" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/letters" "$BASE_URL/api/letters" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/genres" "$BASE_URL/api/genres" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/networks" "$BASE_URL/api/networks" && ((passed++)) || ((failed++))
((total++))
test_endpoint "GET /api/languages" "$BASE_URL/api/languages" && ((passed++)) || ((failed++))
((total++))
echo ""

# Schedule endpoint
echo "=== SCHEDULE ENDPOINT ==="
test_endpoint "GET /api/schedule" "$BASE_URL/api/schedule" && ((passed++)) || ((failed++))
((total++))
echo ""

# Summary
echo "========================================"
echo "           TEST SUMMARY"
echo "========================================"
echo -e "Total Tests: $total"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
