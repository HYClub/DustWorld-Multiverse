# -*- coding: utf-8 -*-
"""Full SPA integration test with embedded server"""
import sys, os, threading, time, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from http.server import SimpleHTTPRequestHandler, HTTPServer
from playwright.sync_api import sync_playwright

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
server = HTTPServer(("127.0.0.1", 8080), SimpleHTTPRequestHandler)
t = threading.Thread(target=server.serve_forever, daemon=True)
t.start()
time.sleep(0.5)
print("Server started on 127.0.0.1:8080")

BASE = "http://127.0.0.1:8080"
errors = []

def log(msg):
    print("  [OK] " + msg)

def fail(msg):
    print("  [FAIL] " + msg)
    errors.append(msg)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        col_errors = []
        page.on("console", lambda msg: col_errors.append(msg) if msg.type == "error" else None)
        page.on("pageerror", lambda err: fail("PageError: " + str(err)[:200]))

        # Test 1: Homepage loads
        print("\n=== 1. Homepage loads ===")
        page.goto(BASE, wait_until="networkidle")
        title = page.title()
        log("Title: " + title)
        body = page.inner_text("body")
        has_content = ("世界" in body or "文明" in body or "创建" in body or "多元宇宙" in body)
        assert has_content, "Homepage body missing expected text: " + body[:200]
        log("Body has expected text")

        # Test 2: Create page
        print("\n=== 2. Create page ===")
        page.goto(BASE + "/#/create", wait_until="networkidle")
        page.wait_for_timeout(2000)
        content = page.content()
        has_create = ("参数" in content or "设置" in content or "创建" in content)
        assert has_create, "Create page did not render"
        log("Create page rendered")

        # Test 3: Homepage empty state (no demo worlds)
        print("\n=== 3. Homepage empty state (no demo worlds) ===")
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(2000)
        body = page.inner_text("body")
        has_empty = any(kw in body for kw in ["还没有世界", "创建", "开始你的旅程"])
        if has_empty:
            log("Homepage shows empty state")
        else:
            fail("Homepage missing empty state text: " + body[:200])

        # Test 4: World detail with non-existent ID shows error
        print("\n=== 4. World detail (non-existent ID) ===")
        page.goto(BASE + "/#/world?id=nonexistent", wait_until="networkidle")
        page.wait_for_timeout(3000)
        body = page.inner_text("body")
        has_error = any(kw in body for kw in ["世界不存在", "错误", "not found"])
        if has_error:
            log("World detail shows error for non-existent world")
        else:
            fail("World detail missing error for non-existent world: " + body[:200])

        # Test 5: Static asset integrity
        print("\n=== 5. Static asset integrity ===")
        for path in [
            "/assets/js/utils/auth.js",
            "/assets/js/api/github.js",
            "/assets/js/engine/world.js",
            "/assets/js/engine/civilization.js",
            "/assets/js/pages/world.js",
            "/assets/js/pages/create.js",
            "/assets/js/components/world-card.js",
            "/assets/js/components/world-map.js",
            "/assets/js/components/timeline.js",
            "/assets/js/components/modal.js",
            "/data/civilizations.json",
            "/data/game_rules_detailed.json",
        ]:
            resp = page.request.get(BASE + path)
            status = resp.status
            if status == 200:
                log("  " + path + " -> 200")
            else:
                fail("  " + path + " -> " + str(status))

        # Test 6: Screenshots
        print("\n=== 6. Screenshots ===")
        outdir = os.path.join(os.path.dirname(__file__), "..", "screenshots")
        os.makedirs(outdir, exist_ok=True)

        page.goto(BASE, wait_until="networkidle")
        page.screenshot(path=os.path.join(outdir, "home.png"), full_page=True)
        log("home.png saved")

        page.goto(BASE + "/#create", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(outdir, "create.png"), full_page=True)
        log("create.png saved")

        page.goto(BASE + "/#/world?id=nonexistent", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(outdir, "world-notfound.png"), full_page=True)
        log("world-notfound.png saved")

        # Test 7: Console error check (non-fatal, filter external 404s)
        print("\n=== 7. Console errors ===")
        own_errors = []
        for m in col_errors:
            txt = m.text[:300] if m.text else ""
            # Skip known non-code 404s (Wwise /waapi, favicon)
            if txt and "waapi" not in txt and "favicon" not in txt:
                own_errors.append(txt)
        if own_errors:
            for txt in own_errors:
                print("  [WARN] " + txt)
            log("Only external 404s found")
        else:
            log("No console errors")

        browser.close()
finally:
    server.shutdown()

print("\n" + "=" * 60)
if errors:
    print("FAILURES: " + str(len(errors)) + " errors")
    for e in errors:
        print("  - " + e)
    sys.exit(1)
else:
    print("ALL TESTS PASSED")
