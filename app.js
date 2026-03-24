const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');

// 환경 변수를 로드합니다.
dotenv.config();

// Express 앱을 생성합니다.
const app = express();
const port = process.env.PORT || 3000;

// body-parser 미들웨어를 추가합니다.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// 뷰 엔진 설정
app.set('views', path.join(__dirname, 'views')); // 템플릿 파일들이 위치할 디렉토리 설정

// 데이터베이스 연결 설정
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
app.locals.db = pool;

// 시작할 때 연결 테스트
pool.getConnection((err, conn) => {
  if (err) {
    console.error('MySQL 연결 오류:', err);
  } else {
    console.log('MySQL에 성공적으로 연결되었습니다.');
    conn.release();
  }
});

const productDisplay = require('./productDisplay');
app.use('/', productDisplay);

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 사용자가 입력한 이름에서 공백을 언더스코어(_)로 대체.
    const name = req.body.name.replace(/\s+/g, '_');
    const uploadDir = path.join(__dirname, 'uploads', name); // 사용자가 입력한 이름으로 디렉토리 경로를 설정.
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true }); // 디렉토리가 존재하지 않으면 생성.
    }
    cb(null, uploadDir); // 파일 저장 경로를 설정.
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // 입력 받은 그대로의 파일명을 설정.
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    files: 15 // 최대 파일 개수를 15개로 제한.
  }
});

// 사용자가 폼을 제출할 때 POST 요청 처리
app.post('/submit', upload.array('images', 15), (req, res) => {
  const { name, category, color, gender, price } = req.body;
  const views = 0; // views 값을 0으로 고정.
  
  const images = req.files;

  // 이미지가 저장된 디렉토리 경로 설정
  const imageDir = path.join(__dirname, 'uploads', name);

  // 입력 받은 가격에서 화폐 기호 및 쉼표를 제거하고 숫자 형식으로 변환.
  const formattedPrice = parseFloat(price.replace(/[₩,]/g, ''));

  // MySQL에 데이터 삽입
  connection.query('INSERT INTO producttable (name, image, category, color, gender, views, price) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, imageDir, category, color, gender, views, formattedPrice], (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
    } else {
      console.log('사용자 데이터가 성공적으로 삽입되었습니다.');
      res.send('데이터가 성공적으로 저장되었습니다.');
    }
  });
});

app.post('/product-detail', (req, res) => {
  const { productId } = req.body;

  // 해당 상품의 조회수 1 증가시키는 쿼리
  const updateQuery = 'UPDATE producttable SET views = views + 1 WHERE id = ?';
  connection.query(updateQuery, [productId], (error, results, fields) => {
    if (error) {
      console.error('Error updating views:', error);
      res.status(500).send('상품 조회수 업데이트에 실패했습니다.');
      return;
    }
  });

  // 해당 상품의 상세 정보를 MySQL에서 가져와서 HTML 형식으로 구성
  const query = 'SELECT * FROM producttable WHERE id = ?';
  connection.query(query, [productId], (error, results, fields) => {
      if (error || results.length === 0) {
          res.status(404).send('상품을 찾을 수 없습니다.');
          return;
      }

      const product = results[0];
      const folderPath = path.join(__dirname, 'uploads', product.name.replace(/\s+/g, '_'));
      const images = fs.readdirSync(folderPath).map(image => path.join('/uploads', product.name.replace(/\s+/g, '_'), image));

      const firstImage = images[0];
      let image1 = `<div><img src="${firstImage}" alt="${product.name}"></div>`;

      let imageSlide = image1;
      // 나머지 이미지를 포함하여 표시
      images.slice(1).forEach(image => {
        imageSlide += `<div><img src="${image}" alt="${product.name}"></div>`;
      });

      const formattedPrice = product.price.toLocaleString();

      const html = `
          <div class="back-navigator">
            <button id="back-button" class="back-button">&#8592;</button>
          </div>
          <div class="content-container">
            <div class="slider">${image1}</div>
            <br>
              <header>
                  <div>
                      <span style="font-size: 15px;">${product.name}</span>
                      <span style="float: right;"><button id="add-to-cart-button" data-product-id="${product.id}">+</button></span>
                  </div>
                  <h2><b>${formattedPrice}원</b></h2>
              </header>
              <!-- 탭 네비게이터 -->
              <div class="detail-navigator">
                  <span class="tab active" data-section="image-container" onclick="showDetailSection('image-container')">상품사진</span>
                  <span class="tab" data-section="detail" onclick="showDetailSection('detail')">상품정보</span>
                  <span class="tab" data-section="order-info" onclick="showDetailSection('order-info')">주문정보</span>
              </div>
              <!-- 상품사진 섹션 -->
              <div id="image-container" class="image-container">
                <div>${imageSlide}</div>
              </div>
              <!-- 상품정보 섹션 -->
              <div id="detail" class="detail">
                  <p><b>카테고리:</b> ${product.category}</p>
                  <p><b>색상:</b> ${product.color}</p>
                  <p><b>성별:</b> ${product.gender}</p>
                  <p><b>조회수:</b> ${product.views}</p>
              </div>
              <!-- 주문정보 섹션 -->
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
                    <li>전자상거래법 제17조3항에 따라 재화 등의 내용이 표시, 광고의 내용과 다르거나 계약 내용과 다르게 이행된 경우 그 재화등을 공급받은 날부터 3개월 이내, 그
                        사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회를 할 수 있습니다.</li>
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
                    <li>모니터 해상도의 차이로 인해 색상이나 이미지가 실제와 달라, 고객이 단순 변심으로 교환/반품을 무료로 요청하는 경우· 제조사의 사정 (신모델 출시 등) 및
                        부품 가격 변동 등에 의해 무료 교환/반품으로 요청하는 경우</li>
                    <li>※ 각 상품별로 아래와 같은 사유로 취소/반품이 제한될 수 있습니다.</li>
                </ul>
              </div>
          </div>
      `;
      res.send(html);
  });
});


app.get('/session-check', (req, res) => {
  if (req.session.username) {
      res.json({ loggedIn: true, username: req.session.username });
  } else {
      res.json({ loggedIn: false });
  }
});

// 사용자가 회원가입 폼을 제출할 때 POST 요청 처리
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  // 사용자명이 이미 데이터베이스에 있는지 확인.
  connection.query('SELECT * FROM login WHERE id = ?', [username], (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
      throw error;
    }

    if (results.length > 0) {
      // 이미 동일한 사용자명이 데이터베이스에 있는 경우
      res.status(400).send({ message: '이미 사용 중인 사용자명입니다.' });
    } else {
      // 사용자명이 데이터베이스에 없는 경우 회원가입을 처리.
      connection.query('INSERT INTO login (id, pw) VALUES (?, ?)', [username, password], (error, results, fields) => {
        if (error) {
          console.error('쿼리 실행 오류: ', error);
          throw error;
        }
    
        console.log('새로운 사용자가 성공적으로 등록되었습니다.');
        res.send({ message: '회원가입 완료!' });
      });
    }
  });
});

// POST /login 요청을 처리하는 핸들러를 추가.
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // MySQL 쿼리 실행하여 사용자 정보 조회
  connection.query('SELECT * FROM login WHERE id = ? AND pw = ?', [username, password], (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
      res.status(500).json({ message: '로그인 중 오류가 발생했습니다.' });
    } else {
      if (results.length > 0) {
        // 사용자 정보가 데이터베이스에 있다면 로그인 성공
        // 세션에 사용자 정보를 저장합니다.
        req.session.username = username;
        res.json({ message: '로그인 성공!' });
      } else {
        // 사용자 정보가 데이터베이스에 없다면 로그인 실패
        res.status(400).json({ message: '로그인 실패. 사용자명 또는 비밀번호가 올바르지 않습니다.' });
      }
    }
  });
});
// 사용자가 로그아웃할 때 세션을 파기합니다.
app.post('/logout', (req, res) => {
  // 세션을 파기합니다.
  req.session.destroy(err => {
    if (err) {
      console.error('세션 파기 중 오류 발생:', err);
      res.status(500).json({ message: '로그아웃 실패!' });
    } else {
      console.log('로그아웃 성공!');
      res.status(200).json({ message: '로그아웃 성공!' });
    }
  });
});

app.post('/change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  // 이전 비밀번호와 새 비밀번호가 모두 제공되었는지 확인
  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ message: '이전 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
  }

  // 데이터베이스에서 사용자의 현재 비밀번호를 가져옵니다.
  connection.query('SELECT pw FROM login WHERE id = ?', [username], (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
      return res.status(500).json({ message: '비밀번호 변경 중 오류가 발생했습니다.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const currentPassword = results[0].pw;

    // 이전 비밀번호가 사용자의 현재 비밀번호와 일치하는지 확인
    if (oldPassword !== currentPassword) {
      return res.status(400).json({ message: '이전 비밀번호가 올바르지 않습니다.' });
    }

    // 새로운 비밀번호를 데이터베이스에 업데이트.
    connection.query('UPDATE login SET pw = ? WHERE id = ?', [newPassword, username], (error, results, fields) => {
      if (error) {
        console.error('쿼리 실행 오류: ', error);
        return res.status(500).json({ message: '비밀번호 변경 중 오류가 발생했습니다.' });
      }
      return res.status(200).json({ message: '비밀번호가 변경되었습니다!' });
    });
  });
});


app.get('/search', (req, res) => {
  const searchTerm = req.query.query;
  const query = 'SELECT * FROM producttable WHERE name LIKE ? OR category LIKE ? OR color LIKE ?';
  const values = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

  connection.query(query, values, (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
      res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
    } else {
      res.json(results);
    }
  });
});

app.get('/popular-products', (req, res) => {
  connection.query('SELECT * FROM producttable ORDER BY views DESC', (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
      res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
    } else {
      let html = ``;
      results.forEach((product, index) => {
        const folderPath = path.join(__dirname, 'uploads', product.name.replace(/\s+/g, '_'));
        const images = fs.readdirSync(folderPath).map(image => path.join('/uploads', product.name.replace(/\s+/g, '_'), image));

        let imageSlide = '';
        images.forEach(image => {
          imageSlide += `<div><img src="${image}" alt="${product.name}"></div>`;
        });

        html += `                  
          <div class="product" data-id="${product.id}">
            <div class="slider" onclick="event.stopPropagation();">${imageSlide}</div>
            <h4>${product.name}</h4>
            <p>Price: ₩${product.price.toLocaleString()}</p>
            <p>Views: ${product.views}</p>
          </div>`;
      });
      res.send(html);
    }
  });
});

app.get('/category-page', (req, res) => {
  connection.query('SELECT DISTINCT category FROM producttable', (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
      res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
    } else {
      let html = `
        <h2>카테고리</h2>
        <div class="category-grid">`;

      results.forEach(category => {
        html += `<div class="category-item">${category.category}</div>`;
      });

      html += `</div>`;

      res.send(html);
    }
  });
});

app.get('/products-by-category/:category', (req, res) => {
  const category = req.params.category;
  connection.query('SELECT * FROM producttable WHERE category = ?', [category], (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
      res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
    } else {
      let html = `<h2>${category}</h2>`;
      results.forEach((product, index) => {
        const folderPath = path.join(__dirname, 'uploads', product.name.replace(/\s+/g, '_'));
        const images = fs.readdirSync(folderPath).map(image => path.join('/uploads', product.name.replace(/\s+/g, '_'), image));

        let imageSlide = '';
        images.forEach(image => {
          imageSlide += `<div><img src="${image}" alt="${product.name}"></div>`;
        });

        html += `                  
            <div class="product" data-id="${product.id}">
              <div class="slider" onclick="event.stopPropagation();">${imageSlide}</div>
              <h4>${product.name}</h4>
              <p>Price: ₩${product.price.toLocaleString()}</p>
            </div>`;
      });

      res.send(html);
    }
  });
});

app.post('/add-to-cart', (req, res) => {
  const { productId, username } = req.body;
  console.log(username);

  console.log('Received request to add product to cart:', { productId, username });

  const query = 'SELECT cart FROM login WHERE id = ?';
  connection.query(query, [username], (error, results) => {
      if (error) {
          console.error('쿼리 실행 오류:', error);
          res.status(500).json({ message: '장바구니를 확인하는 중 오류가 발생했습니다.' });
          return;
      }

      if (results.length === 0) {
          res.status(404).json({ message: '로그인을 먼저 해주세요.' });
          return;
      }

      let cartItems = [];
      if (results[0].cart) {
          cartItems = JSON.parse(results[0].cart);
      }

      if (cartItems.includes(productId)) {
          console.log('상품이 이미 장바구니에 있습니다:', productId);
          res.status(400).json({ message: '이미 장바구니에 있는 상품입니다.' });
          return;
      }

      cartItems.push(productId);
      const updatedCart = JSON.stringify(cartItems);

      console.log('Updated cart:', updatedCart);

      const addToCartQuery = 'UPDATE login SET cart = ? WHERE id = ?';
      connection.query(addToCartQuery, [updatedCart, username], (addToCartError) => {
          if (addToCartError) {
              console.error('쿼리 실행 오류:', addToCartError);
              res.status(500).json({ message: '상품을 장바구니에 추가하는 중 오류가 발생했습니다.' });
          } else {
              res.json({ message: '상품이 장바구니에 추가되었습니다.' });
          }
      });
  });
});

// 장바구니 정보를 가져오고 각 상품의 정보를 포함한 HTML을 클라이언트에게 보내는 엔드포인트
app.get('/user-cart', (req, res) => {
  // 현재 로그인된 사용자의 username을 세션에서 가져옵니다.
  const username = req.session.username;

  // username을 이용하여 로그인 테이블에서 해당 사용자의 장바구니 정보를 가져옵니다.
  const query = 'SELECT cart FROM login WHERE id = ?';
  connection.query(query, [username], (error, results) => {
      if (error) {
          console.error('쿼리 실행 오류:', error);
          res.status(500).json({ message: '장바구니 정보를 가져오는 중 오류가 발생했습니다.' });
          return;
      }

      if (results.length === 0) {
          console.error('사용자를 찾을 수 없습니다:', username);
          res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
          return;
      }

      // 사용자의 장바구니 정보를 JSON 형식으로 가져옵니다.
      const cart = results[0].cart ? JSON.parse(results[0].cart) : [];

      if (cart.length === 0) {
        // 장바구니가 비어 있을 경우
        const emptyCartMessage = '<p style="text-align:center; margin-top:40%; font-size:20px">장바구니가 비었습니다.</p>';
        res.send(emptyCartMessage);
        return;
      }

      // 장바구니에 담긴 각 상품의 정보를 가져와서 HTML을 생성합니다.
      let html = '<h2>장바구니</h2>';
      cart.forEach((productId, index) => {
          const productQuery = 'SELECT * FROM producttable WHERE id = ?';
          connection.query(productQuery, [productId], (productError, productResults) => {
              if (productError) {
                  console.error('상품 정보를 가져오는 중 오류 발생:', productError);
                  return;
              }

              if (productResults.length === 0) {
                  console.error('상품을 찾을 수 없습니다:', productId);
                  return;
              }

              const product = productResults[0];
              const folderPath = path.join(__dirname, 'uploads', product.name.replace(/\s+/g, '_'));
              const images = fs.readdirSync(folderPath).map(image => path.join('/uploads', product.name.replace(/\s+/g, '_'), image));

              const firstImage = images[0];
              let image1 = `<div><img src="${firstImage}" alt="${product.name}"></div>`;

              html += `
                  <div class="product" data-id="${product.id}" style="display: flex; width: 90%; align-items: center;">
                      <span class="slider" style="width: 20%; display: flex;" onclick="event.stopPropagation();">${image1}</span>
                      <div style="flex-grow: 1;">
                        <h3 style="padding-left: 10px;">${product.name}</h3>
                        <p>Price: ₩${product.price.toLocaleString()}</p>
                      </div>
                      <button class="remove-btn" id="remove-btn" data-id="${product.id}"><b>x</b></button>
                  </div>
              `;

              // 모든 상품 정보를 가져왔을 때 클라이언트에게 HTML을 보냅니다.
              if (index === cart.length - 1) {
                  res.send(html);
              }
          });
      });
  });
});

app.post('/remove-from-cart', (req, res) => {
  // 클라이언트로부터 받은 username과 productId
  const { username, productId } = req.body;

  // username을 이용하여 로그인 테이블에서 해당 사용자의 장바구니 정보를 가져옵니다.
  const query = 'SELECT cart FROM login WHERE id = ?';
  connection.query(query, [username], (error, results) => {
      if (error) {
          console.error('쿼리 실행 오류:', error);
          res.status(500).json({ message: '장바구니 정보를 가져오는 중 오류가 발생했습니다.' });
          return;
      }

      if (results.length === 0) {
          console.error('사용자를 찾을 수 없습니다:', username);
          res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
          return;
      }

      // 사용자의 장바구니 정보를 JSON 형식으로 가져옵니다.
      let cart = results[0].cart ? JSON.parse(results[0].cart) : [];

      // 장바구니에서 해당 제품의 ID를 찾아 제거합니다.
      const index = cart.indexOf(productId);
      if (index !== -1) {
          cart.splice(index, 1);
      }

      // 변경된 장바구니 정보를 다시 로그인 테이블에 업데이트합니다.
      const updateQuery = 'UPDATE login SET cart = ? WHERE id = ?';
      connection.query(updateQuery, [JSON.stringify(cart), username], (updateError, updateResults) => {
          if (updateError) {
              console.error('장바구니 업데이트 오류:', updateError);
              res.status(500).json({ message: '장바구니 정보를 업데이트하는 중 오류가 발생했습니다.' });
              return;
          }
          
          res.json({ message: '상품을 성공적으로 제거했습니다.' });
      });
  });
});



app.post('/destroy-session', (req, res) => {
  if (req.session.username) {
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 파괴 중 오류 발생:', err);
        res.status(500).json({ success: false });
      } else {
        res.json({ success: true });
      }
    });
  } else {
    res.json({ success: true });
  }
});

// 서버를 시작.
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
