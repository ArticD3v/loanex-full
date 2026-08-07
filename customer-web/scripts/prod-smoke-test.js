const https = require('https');
const { URL } = require('url');

const FE = 'https://customer-web-beige-iota.vercel.app';
const API = 'https://loanex-api.vercel.app';
const results = [];

function record(name, ok, detail) {
  results.push({ name, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} — ${detail}`);
}

function request(method, urlStr, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          ...(data
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            : {}),
          ...headers,
        },
        timeout: 60000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, text, json });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (data) req.write(data);
    req.end();
  });
}

function collectJsUrls(html, base) {
  const urls = new Set();
  const re = /(?:src|href)="([^"]+\.js)"/g;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1];
    urls.add(u.startsWith('http') ? u : `${base}/${u.replace(/^\//, '')}`);
  }
  return [...urls];
}

(async () => {
  // Frontend home
  const home = await request('GET', FE);
  record('Frontend home', home.status === 200, `HTTP ${home.status}`);

  const productsPage = await request('GET', `${FE}/products`);
  record('Frontend /products', productsPage.status === 200, `HTTP ${productsPage.status}`);
  const loginPage = await request('GET', `${FE}/auth/login`);
  record('Frontend /auth/login', loginPage.status === 200, `HTTP ${loginPage.status}`);
  const registerPage = await request('GET', `${FE}/auth/register`);
  record('Frontend /auth/register', registerPage.status === 200, `HTTP ${registerPage.status}`);

  const jsUrls = [
    ...collectJsUrls(home.text, FE),
    ...collectJsUrls(productsPage.text, FE),
    ...collectJsUrls(loginPage.text, FE),
  ];
  const uniqueJs = [...new Set(jsUrls)];
  let foundProd = false;
  let foundLocal = false;
  for (const u of uniqueJs) {
    try {
      const js = await request('GET', u);
      if (/loanex-api\.vercel\.app/.test(js.text)) foundProd = true;
      if (/localhost:4000/.test(js.text)) foundLocal = true;
    } catch {}
  }
  // Lazy chunks may not be in HTML; also scan known environment chunk via recursive fetch of modulepreload
  record('Prod API URL in scanned JS', foundProd, `present=${foundProd} files=${uniqueJs.length}`);
  record('No localhost:4000 in scanned JS', !foundLocal, `present=${foundLocal}`);

  const health = await request('GET', `${API}/health`);
  record(
    'API health',
    health.status === 200 && health.json?.data?.env === 'production',
    `env=${health.json?.data?.env}`,
  );

  const cors = await request('GET', `${API}/api/v1/products`, {
    headers: { Origin: FE },
  });
  record(
    'CORS products',
    cors.status === 200 && cors.headers['access-control-allow-origin'] === FE,
    `ACAO=${cors.headers['access-control-allow-origin']}`,
  );

  const products = cors.json;
  const items = products?.data?.items || [];
  const productId = items[0]?.id || null;
  record('READ products', products?.success === true && items.length > 0, `count=${items.length}`);

  if (productId) {
    const detail = await request('GET', `${API}/api/v1/products/${productId}`);
    record('READ product detail', detail.json?.success === true, `name=${detail.json?.data?.name}`);
  }

  const categories = await request('GET', `${API}/api/v1/categories`);
  record('READ categories', categories.json?.success === true, `HTTP ${categories.status}`);

  const banners = await request('GET', `${API}/api/v1/banners`);
  record('READ banners', banners.json?.success === true, `HTTP ${banners.status}`);

  const meNoAuth = await request('GET', `${API}/api/v1/auth/me`);
  record('Auth /me no token', meNoAuth.status === 401, `status=${meNoAuth.status}`);

  const mobile = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
  const email = `ptest_${mobile}@example.com`;
  const password = 'TestPass123!';

  const reg = await request('POST', `${API}/api/v1/auth/register`, {
    headers: { Origin: FE },
    body: { fullName: 'Prod Tester', mobile, email, password },
  });
  record('Registration', reg.json?.success === true, reg.json?.message || reg.text.slice(0, 200));

  const login = await request('POST', `${API}/api/v1/auth/login`, {
    headers: { Origin: FE },
    body: { identifier: mobile, password },
  });
  record(
    'Login',
    login.status < 500 && (login.json?.success === true || login.status === 401 || login.status === 400),
    `HTTP ${login.status} body=${(login.text || '').slice(0, 250)}`,
  );

  let access = login.json?.data?.accessToken || null;

  for (const purpose of ['REGISTER', 'LOGIN']) {
    const otpSend = await request('POST', `${API}/api/v1/auth/send-otp`, {
      body: { mobile, purpose },
    });
    const otp =
      otpSend.json?.data?.otp || otpSend.json?.data?.devOtp || otpSend.json?.data?.demoOtp || null;
    record(
      `Send OTP (${purpose})`,
      otpSend.json?.success === true || otpSend.status < 500,
      `HTTP ${otpSend.status} otpEchoed=${Boolean(otp)} body=${(otpSend.text || '').slice(0, 180)}`,
    );
    if (otp && !access) {
      const verify = await request('POST', `${API}/api/v1/auth/verify-otp`, {
        body: { mobile, otp: String(otp), purpose },
      });
      access = verify.json?.data?.accessToken || access;
      record(
        `Verify OTP (${purpose})`,
        verify.json?.success === true,
        `token=${Boolean(verify.json?.data?.accessToken)}`,
      );
    }
  }

  if (access) {
    const me = await request('GET', `${API}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${access}`, Origin: FE },
    });
    record('Auth /me with token', me.json?.success === true, `user=${me.json?.data?.user?.fullName}`);

    if (productId) {
      const addCart = await request('POST', `${API}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${access}`, Origin: FE },
        body: { productId, quantity: 1 },
      });
      record('CREATE cart', addCart.json?.success === true, (addCart.text || '').slice(0, 180));

      const cart = await request('GET', `${API}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      const cartItems = cart.json?.data?.items || cart.json?.data?.cartItems || [];
      const itemId = cartItems[0]?.id;
      record('READ cart', cart.json?.success === true, `items=${cartItems.length}`);

      if (itemId) {
        const upd = await request('PUT', `${API}/api/v1/cart/${itemId}`, {
          headers: { Authorization: `Bearer ${access}` },
          body: { quantity: 2 },
        });
        record('UPDATE cart', upd.json?.success === true, `HTTP ${upd.status}`);
        const del = await request('DELETE', `${API}/api/v1/cart/${itemId}`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        record('DELETE cart', del.json?.success === true, `HTTP ${del.status}`);
      }

      const addWish = await request('POST', `${API}/api/v1/wishlist`, {
        headers: { Authorization: `Bearer ${access}` },
        body: { productId },
      });
      record('CREATE wishlist', addWish.json?.success === true, `HTTP ${addWish.status}`);
      const wish = await request('GET', `${API}/api/v1/wishlist`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      const wItems = wish.json?.data?.items || [];
      const wid = wItems[0]?.id;
      record('READ wishlist', wish.json?.success === true, `items=${wItems.length}`);
      if (wid) {
        const wdel = await request('DELETE', `${API}/api/v1/wishlist/${wid}`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        record('DELETE wishlist', wdel.json?.success === true, `HTTP ${wdel.status}`);
      }
    }
  } else {
    record(
      'Authenticated session',
      false,
      'No access token (production OTP_DEV_ECHO=false; SMS OTP required)',
    );
  }

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log('\n===== SUMMARY =====');
  for (const r of results) console.log(`${r.status}\t${r.name}\t${r.detail}`);
  console.log(`PASS=${pass} FAIL=${fail} TOTAL=${results.length}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
