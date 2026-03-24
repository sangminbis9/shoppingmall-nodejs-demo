const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// views
app.set('views', path.join(__dirname, 'views'));

// static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// mysql pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

const db = pool.promise();
app.locals.db = pool;

// 시작 시 DB 연결 테스트
(async () => {
  try {
    const conn = await db.getConnection();
    console.log('MySQL에 성공적으로 연결되었습니다.');
    conn.release();
  } catch (err) {
    console.error('MySQL 연결 오류:', err);
  }
})();

// 홈 라우터
const productDisplay = require('./productDisplay');
app.use('/', productDisplay);

// --------------------
// helper functions
// --------------------
const NO_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="24" fill="#9ca3af">No Image</text>
  </svg>
`)}`;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toFolderName(name = '') {
  return String(name).trim().replace(/\s+/g, '_');
}

function getFolderPath(productName) {
  return path.join(__dirname, 'uploads', toFolderName(productName));
}

function getImageFileNames(productName) {
  const folderPath = getFolderPath(productName);

  if (!fs.existsSync(folderPath)) {
    return [];
  }

  return fs.readdirSync(folderPath)
    .filter(file => /\.(png|jpg|jpeg|webp|gif)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function getDisplayImages(product) {
  const folderName = toFolderName(product.name);
  const files = getImageFileNames(product.name);

  let orderedFiles = [...files];

  if (product.image && files.includes(product.image)) {
    orderedFiles = [product.image, ...files.filter(file => file !== product.image)];
  }

  const urls = orderedFiles.map(file => `/uploads/${folderName}/${file}`);
  return urls.length > 0 ? urls : [NO_IMAGE];
}

function getPrimaryImage(product) {
  return getDisplayImages(product)[0];
}

function buildImageSlide(product, onlyFirst = false) {
  const images = getDisplayImages(product);
  const targets = onlyFirst ? [images[0]] : images;

  return targets
    .map(image => `<div><img src="${image}" alt="${escapeHtml(product.name)}"></div>`)
    .join('');
}

function normalizeProductId(productId) {
  const parsed = Number(productId);
  return Number.isNaN(parsed) ? null : parsed;
}

// --------------------
// multer 설정
// --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawName = req.body.name || 'unnamed_product';
    const folderName = toFolderName(rawName);
    const uploadDir = path.join(__dirname, 'uploads', folderName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    files: 15
  }
});

// --------------------
// routes
// --------------------

// 상품 등록
app.post('/submit', upload.array('images', 15), async (req, res) => {
  try {
    const { name, category, color, gender, price } = req.body;
    const views = 0;

    if (!name || !category || !color || !gender || !price) {
      return res.status(400).send('필수 값이 누락되었습니다.');
    }

    const formattedPrice = parseFloat(String(price).replace(/[₩,]/g, ''));
    const representativeImage = req.files && req.files.length > 0
      ? req.files[0].filename
      : null;

    await db.query(
      'INSERT INTO producttable (name, image, category, color, gender, views, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, representativeImage, category, color, gender, views, formattedPrice]
    );

    console.log('사용자 데이터가 성공적으로 삽입되었습니다.');
    res.send('데이터가 성공적으로 저장되었습니다.');
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).send('데이터 저장 중 오류가 발생했습니다.');
  }
});

// 상품 상세
app.post('/product-detail', async (req, res) => {
  try {
    const productId = normalizeProductId(req.body.productId);

    if (!productId) {
      return res.status(400).send('잘못된 상품 ID입니다.');
    }

    await db.query(
      'UPDATE producttable SET views = views + 1 WHERE id = ?',
      [productId]
    );

    const [results] = await db.query(
      'SELECT * FROM producttable WHERE id = ?',
      [productId]
    );

    if (results.length === 0) {
      return res.status(404).send('상품을 찾을 수 없습니다.');
    }

    const product = results[0];
    const imageSlide = buildImageSlide(product, false);
    const firstImage = getPrimaryImage(product);
    const formattedPrice = Number(product.price).toLocaleString();

    const html = `
      <div class="back-navigator">
        <button id="back-button" class="back-button">&#8592;</button>
      </div>
      <div class="content-container">
        <div class="slider"><div><img src="${firstImage}" alt="${escapeHtml(product.name)}"></div></div>
        <br>
        <header>
          <div>
            <span style="font-size: 15px;">${escapeHtml(product.name)}</span>
            <span style="float: right;"><button id="add-to-cart-button" data-product-id="${product.id}">+</button></span>
          </div>
          <h2><b>${formattedPrice}원</b></h2>
        </header>

        <div class="detail-navigator">
          <span class="tab active" data-section="image-container" onclick="showDetailSection('image-container')">상품사진</span>
          <span class="tab" data-section="detail" onclick="showDetailSection('detail')">상품정보</span>
          <span class="tab" data-section="order-info" onclick="showDetailSection('order-info')">주문정보</span>
        </div>

        <div id="image-container" class="image-container">
          <div>${imageSlide}</div>
        </div>

        <div id="detail" class="detail">
          <p><b>카테고리:</b> ${escapeHtml(product.category)}</p>
          <p><b>색상:</b> ${escapeHtml(product.color)}</p>
          <p><b>성별:</b> ${escapeHtml(product.gender)}</p>
          <p><b>조회수:</b> ${product.views}</p>
        </div>

        <div id="order-info" class="order-info">
          <h3>배송/교환/환불 정보</h3>
          <hr>
          <h4>배송정보</h4>
          <ul>
            <li>배송 방법 : 택배</li>
            <li>배송 지역 : 전국지역</li>
            <li>배송 비용 : 무료 : 주문 금액에 상관없이 배송비는 무료입니다.</li>
            <li>배송 기간 : 1일 ~ 7일</li>
            <li>배송 안내 :</li>
            <li>- 산간벽지나 도서지방은 별도의 추가 금액없이 무료배송 입니다.</li>
            <li>계좌이체로 주문하신 상품은 입금 확인 후 배송해 드립니다. 다만, 상품종류에 따라서 상품의 배송이 다소 지연될 수 있습니다.</li>
          </ul>

          <br>
          <table>
            <tr>
              <th>배송 택배사</th>
              <th>서울통운</th>
            </tr>
            <tr>
              <th>반품 택배사</th>
              <th>서울통운</th>
            </tr>
            <tr>
              <th>반품 배송비</th>
              <th>편도 3,000원</th>
            </tr>
            <tr>
              <th>반송지 주소</th>
              <th>(12345) 서울 서울구 서울로 123 지층 (주)서울컴퍼니(서울컨셉)</th>
            </tr>
          </table>
          <br>

          <h4>교환환불</h4>
          <ul>
            <li>[교환/반품 정보]</li>
            <li>반품 및 교환은 상품 수령 후 7일 이내에 신청하실 수 있습니다.</li>
            <li>전자상거래법 제17조3항에 따라 재화 등의 내용이 표시, 광고의 내용과 다르거나 계약 내용과 다르게 이행된 경우 그 재화등을 공급받은 날부터 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회를 할 수 있습니다.</li>
            <li>미성년자가 법정대리인의 동의 없이 구매계약을 체결한 경우 미성년자와 법정대리인은 구매계약을 취소할 수 있습니다.</li>
            <li>환불요청 시 자동회수 접수가 진행되지 않아 구매하신 스토어측으로 문의해주셔야 합니다.</li>
            <li>반품 주소지는 업체마다 상이하므로 문의 후 개별 접수해야합니다.· 동일 업체이더라도 상품별 반품비용이 상이할 수 있습니다.</li>
            <li>반품 시 수령한 택배사가 아닌, 타택배 또는 수령 택배사를 통하여 신규 접수할 경우 추가 비용이 발생할 수 있습니다.</li>
            <li>교환중인 상품이 품절인 경우 반품으로 처리될 수 있으며, 반품배송비가 발생할 수 있습니다.</li>
            <li>[교환/반품 제한사항]</li>
            <li>반품 가능한 기간을 초과한 경우· 주문/제작 상품의 경우, 상품의 제작이 이미 진행된 경우</li>
            <li>상품 포장을 개봉하여 사용 또는 설치 완료되어 상품의 가치가 훼손된 경우 (단, 내용 확인을 위한 포장 개봉의 경우는 예외)</li>
            <li>고객의 사용, 시간경과, 일부 소비에 의하여 상품의 가치가 현저히 감소한 경우</li>
            <li>세트상품 일부 사용, 구성품을 분실하였거나 취급 부주의로 인한 파손/고장/오염으로 재판매 불가한 경우</li>
            <li>모니터 해상도의 차이로 인해 색상이나 이미지가 실제와 달라, 고객이 단순 변심으로 교환/반품을 무료로 요청하는 경우· 제조사의 사정 (신모델 출시 등) 및 부품 가격 변동 등에 의해 무료 교환/반품으로 요청하는 경우</li>
            <li>※ 각 상품별로 아래와 같은 사유로 취소/반품이 제한될 수 있습니다.</li>
          </ul>
        </div>
      </div>
    `;

    res.send(html);
  } catch (error) {
    console.error('상품 정보를 가져오는 중 오류 발생:', error);
    res.status(500).send('상품 정보를 가져오는데 실패했습니다.');
  }
});

// 세션 체크
app.get('/session-check', (req, res) => {
  if (req.session.username) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// 회원가입
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [results] = await db.query(
      'SELECT * FROM login WHERE id = ?',
      [username]
    );

    if (results.length > 0) {
      return res.status(400).send({ message: '이미 사용 중인 사용자명입니다.' });
    }

    await db.query(
      'INSERT INTO login (id, pw) VALUES (?, ?)',
      [username, password]
    );

    console.log('새로운 사용자가 성공적으로 등록되었습니다.');
    res.send({ message: '회원가입 완료!' });
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).send({ message: '회원가입 중 오류가 발생했습니다.' });
  }
});

// 로그인
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [results] = await db.query(
      'SELECT * FROM login WHERE id = ? AND pw = ?',
      [username, password]
    );

    if (results.length > 0) {
      req.session.username = username;
      return res.json({ message: '로그인 성공!' });
    }

    res.status(400).json({ message: '로그인 실패. 사용자명 또는 비밀번호가 올바르지 않습니다.' });
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).json({ message: '로그인 중 오류가 발생했습니다.' });
  }
});

// 로그아웃
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('세션 파기 중 오류 발생:', err);
      return res.status(500).json({ message: '로그아웃 실패!' });
    }

    console.log('로그아웃 성공!');
    res.status(200).json({ message: '로그아웃 성공!' });
  });
});

// 비밀번호 변경
app.post('/change-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ message: '이전 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
    }

    const [results] = await db.query(
      'SELECT pw FROM login WHERE id = ?',
      [username]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const currentPassword = results[0].pw;

    if (oldPassword !== currentPassword) {
      return res.status(400).json({ message: '이전 비밀번호가 올바르지 않습니다.' });
    }

    await db.query(
      'UPDATE login SET pw = ? WHERE id = ?',
      [newPassword, username]
    );

    res.status(200).json({ message: '비밀번호가 변경되었습니다!' });
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).json({ message: '비밀번호 변경 중 오류가 발생했습니다.' });
  }
});

// 검색
app.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.query || '';
    const query = 'SELECT * FROM producttable WHERE name LIKE ? OR category LIKE ? OR color LIKE ?';
    const values = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

    const [results] = await db.query(query, values);
    res.json(results);
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
  }
});

// 인기 상품
app.get('/popular-products', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT * FROM producttable ORDER BY views DESC'
    );

    let html = '';
    results.forEach(product => {
      const imageSlide = buildImageSlide(product, false);

      html += `
        <div class="product" data-id="${product.id}">
          <div class="slider" onclick="event.stopPropagation();">${imageSlide}</div>
          <h4>${escapeHtml(product.name)}</h4>
          <p>Price: ₩${Number(product.price).toLocaleString()}</p>
          <p>Views: ${product.views}</p>
        </div>
      `;
    });

    res.send(html);
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
  }
});

// 카테고리 페이지
app.get('/category-page', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT DISTINCT category FROM producttable'
    );

    let html = `
      <h2>카테고리</h2>
      <div class="category-grid">
    `;

    results.forEach(category => {
      html += `<div class="category-item">${escapeHtml(category.category)}</div>`;
    });

    html += `</div>`;
    res.send(html);
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
  }
});

// 카테고리별 상품
app.get('/products-by-category/:category', async (req, res) => {
  try {
    const category = req.params.category;

    const [results] = await db.query(
      'SELECT * FROM producttable WHERE category = ?',
      [category]
    );

    let html = `<h2>${escapeHtml(category)}</h2>`;

    results.forEach(product => {
      const imageSlide = buildImageSlide(product, false);

      html += `
        <div class="product" data-id="${product.id}">
          <div class="slider" onclick="event.stopPropagation();">${imageSlide}</div>
          <h4>${escapeHtml(product.name)}</h4>
          <p>Price: ₩${Number(product.price).toLocaleString()}</p>
        </div>
      `;
    });

    res.send(html);
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
  }
});

// 장바구니 추가
app.post('/add-to-cart', async (req, res) => {
  try {
    const { username } = req.body;
    const productId = normalizeProductId(req.body.productId);

    if (!username || !productId) {
      return res.status(400).json({ message: '잘못된 요청입니다.' });
    }

    const [results] = await db.query(
      'SELECT cart FROM login WHERE id = ?',
      [username]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: '로그인을 먼저 해주세요.' });
    }

    let cartItems = [];
    if (results[0].cart) {
      cartItems = JSON.parse(results[0].cart);
    }

    cartItems = cartItems.map(Number);

    if (cartItems.includes(productId)) {
      return res.status(400).json({ message: '이미 장바구니에 있는 상품입니다.' });
    }

    cartItems.push(productId);

    await db.query(
      'UPDATE login SET cart = ? WHERE id = ?',
      [JSON.stringify(cartItems), username]
    );

    res.json({ message: '상품이 장바구니에 추가되었습니다.' });
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).json({ message: '상품을 장바구니에 추가하는 중 오류가 발생했습니다.' });
  }
});

// 장바구니 조회
app.get('/user-cart', async (req, res) => {
  try {
    const username = req.session.username;

    if (!username) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const [results] = await db.query(
      'SELECT cart FROM login WHERE id = ?',
      [username]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const cart = results[0].cart ? JSON.parse(results[0].cart).map(Number) : [];

    if (cart.length === 0) {
      return res.send('<p style="text-align:center; margin-top:40%; font-size:20px">장바구니가 비었습니다.</p>');
    }

    const placeholders = cart.map(() => '?').join(',');
    const [products] = await db.query(
      `SELECT * FROM producttable WHERE id IN (${placeholders})`,
      cart
    );

    const productMap = new Map(products.map(product => [Number(product.id), product]));

    let html = '<h2>장바구니</h2>';

    cart.forEach(productId => {
      const product = productMap.get(productId);
      if (!product) return;

      const firstImage = getPrimaryImage(product);

      html += `
        <div class="product" data-id="${product.id}" style="display: flex; width: 90%; align-items: center;">
          <span class="slider" style="width: 20%; display: flex;" onclick="event.stopPropagation();">
            <div><img src="${firstImage}" alt="${escapeHtml(product.name)}"></div>
          </span>
          <div style="flex-grow: 1;">
            <h3 style="padding-left: 10px;">${escapeHtml(product.name)}</h3>
            <p>Price: ₩${Number(product.price).toLocaleString()}</p>
          </div>
          <button class="remove-btn" id="remove-btn" data-id="${product.id}"><b>x</b></button>
        </div>
      `;
    });

    res.send(html);
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    res.status(500).json({ message: '장바구니 정보를 가져오는 중 오류가 발생했습니다.' });
  }
});

// 장바구니 제거
app.post('/remove-from-cart', async (req, res) => {
  try {
    const { username } = req.body;
    const productId = normalizeProductId(req.body.productId);

    if (!username || !productId) {
      return res.status(400).json({ message: '잘못된 요청입니다.' });
    }

    const [results] = await db.query(
      'SELECT cart FROM login WHERE id = ?',
      [username]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    let cart = results[0].cart ? JSON.parse(results[0].cart).map(Number) : [];
    cart = cart.filter(id => id !== productId);

    await db.query(
      'UPDATE login SET cart = ? WHERE id = ?',
      [JSON.stringify(cart), username]
    );

    res.json({ message: '상품을 성공적으로 제거했습니다.' });
  } catch (error) {
    console.error('장바구니 업데이트 오류:', error);
    res.status(500).json({ message: '장바구니 정보를 업데이트하는 중 오류가 발생했습니다.' });
  }
});

// 세션 제거
app.post('/destroy-session', (req, res) => {
  if (req.session.username) {
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 파괴 중 오류 발생:', err);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});