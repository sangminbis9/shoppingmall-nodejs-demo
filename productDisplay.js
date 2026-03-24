const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

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

function formatPrice(value) {
  const num = Number(value || 0);
  return num.toLocaleString('ko-KR');
}

function getImageUrls(product) {
  const folderName = toFolderName(product.name);
  const folderPath = path.join(__dirname, 'uploads', folderName);

  let files = [];
  if (fs.existsSync(folderPath)) {
    files = fs.readdirSync(folderPath)
      .filter(file => /\.(png|jpg|jpeg|webp|gif)$/i.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  if (files.length === 0) {
    return [NO_IMAGE];
  }

  // product.image가 실제 폴더 안에 있을 때만 대표 이미지로 맨 앞으로 보냄
  if (product.image && files.includes(product.image)) {
    files = [product.image, ...files.filter(file => file !== product.image)];
  }

  return files.map(file =>
    '/uploads/' + encodeURIComponent(folderName) + '/' + encodeURIComponent(file)
  );
}

function buildImageSlide(product, onlyFirst = false) {
  const images = getImageUrls(product);
  const targets = onlyFirst ? [images[0]] : images;

  return targets.map(image => {
    return `<div><img src="${image}" alt="${escapeHtml(product.name)}"></div>`;
  }).join('');
}

function renderProductCard(product, options = {}) {
  const showViews = options.showViews === true;
  const imageSlide = buildImageSlide(product, false);

  return `
    <div class="product" data-id="${product.id}">
      <div class="slider" onclick="event.stopPropagation();">${imageSlide}</div>
      <h4>${escapeHtml(product.name)}</h4>
      <p>Price: ₩${formatPrice(product.price)}</p>
      ${showViews ? `<p>Views: ${Number(product.views || 0)}</p>` : ''}
    </div>
  `;
}

function renderPage(products) {
  const productCards = products.map(product => renderProductCard(product)).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Product Page</title>
      <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel/slick/slick.css"/>
      <style>
        body {
          width: 50%;
          margin: 0 auto;
        }
        .hidden {
          display: none;
        }
        .product h4 {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .product-container, .ranking-container, .insert-container {
          text-align: center;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          padding-top: 50px;
          padding-left: 16px;
        }
        .category-container {
          margin: 0 auto;
          text-align: center;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          padding-top: 50px;
          padding-left: 16px;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .category-item {
          border: 1px solid #ccc;
          padding: 10px;
          cursor: pointer;
        }
        .product {
          border: 1px solid #ccc;
          padding: 16px;
          margin: 16px;
          text-align: center;
          position: relative;
          width: calc(44% - 32px);
          display: inline-block;
          vertical-align: top;
          margin-bottom: 32px;
          cursor: pointer;
        }
        .product-detail-container {
          width: 50%;
          margin: 0 auto;
          min-height: 100vh;
          background-color: white;
        }
        .back-navigator {
          width: 50%;
          position: fixed;
          top: 0;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          background-color: white;
          border-bottom: 1px solid rgb(214, 214, 214);
          border-right: 1px solid rgb(214, 214, 214);
          border-left: 1px solid rgb(214, 214, 214);
          padding: 12px 20px;
          box-sizing: border-box;
          z-index: 10000;
        }
        .content-container {
          padding-top: 72px;
        }
        .back-navigator button {
          background-color: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }
        .detail-navigator {
          border-top: 6px solid rgb(246, 246, 246);
          border-bottom: 1px solid rgb(214, 214, 214);
          padding: 10px;
        }
        .detail,
        .image-container,
        .order-info {
          font-size: 14px;
          display: none;
          text-align: left;
          font-family: 'Courier New', Courier, monospace;
        }
        .image-container img {
          width: 100%;
        }
        .slider {
          width: 100%;
        }
        .slider img {
          width: 100%;
          height: auto;
          cursor: pointer;
        }
        .slick-prev, .slick-next {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          font-size: 20px;
          padding: 10px;
          cursor: pointer;
          z-index: 999;
        }
        .slick-prev {
          left: 10px;
        }
        .slick-next {
          right: 10px;
        }
        .home-container, .category-container, .search-container, .cart-container, .mypage-container {
          font-size: 14px;
          display: none;
          text-align: left;
          font-family: 'Courier New', Courier, monospace;
        }
        .navigator {
          position: fixed;
          top: 0;
          left: 25%;
          width: 50%;
          background-color: white;
          border-bottom: 1px solid rgb(214, 214, 214);
          color: black;
          text-align: center;
          padding: 12px 0;
          z-index: 9999;
        }
        .navigator-bottom {
          position: fixed;
          bottom: 0;
          width: 50%;
          background-color: white;
          border-top: 1px solid rgb(214, 214, 214);
          color: black;
          text-align: center;
          padding: 12px 0;
          z-index: 9999;
        }
        .tab {
          cursor: pointer;
          padding: 10px 20px;
          display: inline-block;
          margin-right: 5px;
        }
        .tab.active {
          font-weight: bold;
          border-bottom: 2px solid black;
        }
        .dropdown-content {
          display: block;
          position: relative;
          margin: 0 auto;
          text-align: left;
          background-color: #f9f9f9;
          box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
          z-index: 1;
          max-height: 200px;
          overflow-y: auto;
          width: 60%;
          border-top: none;
        }
        .dropdown-content a {
          color: black;
          padding: 12px 16px;
          text-decoration: none;
          display: block;
        }
        .dropdown-content a:hover {
          background-color: #f1f1f1;
        }
        .search-container {
          position: relative;
          text-align: center;
          margin: 20px 0;
        }
        #search-form {
          position: relative;
          margin: 0 auto;
          width: 100%;
        }
        #search-input {
          width: 60%;
          box-sizing: border-box;
          border: 2px solid #ccc;
          border-radius: 8px;
          font-size: 16px;
          margin-top: 10%;
          padding: 12px 20px 12px 40px;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
        #username, #password, #new-username, #new-password,
        #oldPassword, #newPassword, #confirmPassword {
          width: 60%;
          height: 50px;
          border: 1px solid #ccc;
          border-radius: 5px;
          padding: 5px 10px;
          font-size: 16px;
          margin-bottom: 5%;
        }
        #name, #category, #color, #price, #gender {
          width: 60%;
          height: 50px;
          border: 1px solid #ccc;
          border-radius: 5px;
          padding: 5px 10px;
          font-size: 16px;
          margin-bottom: 2%;
        }
        #gender {
          width: 63%;
        }
        #login-button, #register-button, #logout-button,
        #changePassword-button, #change-button, #insert-button {
          width: 63%;
          height: 50px;
          border: 1px solid #ccc;
          border-radius: 5px;
          padding: 5px 10px;
          margin-bottom: 5%;
        }
        #login-button {
          background-color: #E6CEFD;
        }
        #register-button {
          background-color: #B8BEFF;
        }
        #logout-button {
          background-color: #FFDAE1;
        }
        #login-form, #register-form, #logout-form, #change-form {
          margin-top: 5%;
          text-align: center;
          border: 1px solid #ccc;
          padding: 10% 0px;
        }
        .remove-btn {
          float: right;
          background-color: #FDBC9B;
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto;
          cursor: pointer;
        }
        #add-to-cart-button {
          float: right;
          font-size: 20px;
          background-color: #A1CAFF;
          color: black;
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding-top: 3px;
          margin-right: 20px;
          cursor: pointer;
        }
        input[type=file]::file-selector-button {
          width: 100%;
          height: 50px;
          background: #fff;
          border: 1px solid rgb(77,77,77);
          border-radius: 10px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="main" id="main">
        <div id="home-container" class="home-container">
          <div class="navigator">
            <span class="tab" data-section="product-container" onclick="showSubSection('product-container')">홈</span>
            <span class="tab" data-section="ranking-container" onclick="showSubSection('ranking-container')">인기목록</span>
            <span class="tab" data-section="insert-container" onclick="showSubSection('insert-container')">상품등록</span>
          </div>

          <br><br>

          <div class="product-container hidden" id="product-container">
            ${productCards}
          </div>

          <div class="ranking-container hidden" id="ranking-container"></div>

          <div class="insert-container hidden" id="insert-container">
            <form id="insert-form" action="/submit" method="POST" enctype="multipart/form-data">
              <input type="text" id="name" name="name" placeholder="상품명"><br>
              <input type="file" id="images" name="images" multiple><br><br>
              <input type="text" id="category" name="category" placeholder="카테고리"><br>
              <input type="text" id="color" name="color" placeholder="색상"><br>
              <select id="gender" name="gender">
                <option value="남">남</option>
                <option value="여">여</option>
                <option value="남여공용">남여공용</option>
              </select><br>
              <input type="hidden" id="views" name="views" value="0">
              <input type="text" id="price" name="price" placeholder="가격"><br><br>
              <input id="insert-button" type="submit" value="상품등록">
            </form>
          </div>
        </div>

        <div class="category-container" id="category-container"></div>

        <div class="search-container" id="search-container">
          <form id="search-form">
            <input type="text" id="search-input" placeholder="검색어를 입력하세요" required>
          </form>
          <div id="search-results" class="dropdown-content"></div>
        </div>

        <div class="cart-container" id="cart-container">cart-container</div>

        <div class="mypage-container" id="mypage-container">
          <div id="login-form">
            <h2>로그인</h2>
            <form id="loginForm" action="/login" method="POST">
              <input type="text" id="username" name="username" placeholder="User" required>
              <input type="password" id="password" name="password" placeholder="Password" required>
              <button id="login-button" type="submit">로그인</button>
            </form>
            <p>계정이 없으신가요? <a href="#" id="show-register-form">회원가입하기</a></p>
          </div>

          <div id="register-form" class="hidden">
            <h2>회원가입</h2>
            <form id="registerForm" action="/register" method="POST">
              <input type="text" id="new-username" name="username" placeholder="User" required>
              <input type="password" id="new-password" name="password" placeholder="Password" required>
              <button id="register-button" type="submit">회원가입</button>
            </form>
            <p>이미 계정이 있으신가요? <a href="#" id="show-login-form">로그인하러 가기</a></p>
          </div>

          <div id="logout-form" class="hidden">
            <h2><span id="usernameDisplay"></span></h2>
            <form id="changePassword" action="/logout" method="POST">
              <button id="changePassword-button" type="submit">비밀번호 변경</button>
            </form>
            <form id="logoutForm" action="/logout" method="POST">
              <button id="logout-button" type="submit">로그아웃</button>
            </form>
          </div>

          <div id="change-form" class="hidden">
            <h2>비밀번호 변경</h2>
            <form id="changeForm" action="/login" method="POST">
              <input type="text" id="oldPassword" name="oldPassword" placeholder="Old Password" required>
              <input type="text" id="newPassword" name="newPassword" placeholder="New Password" required>
              <input type="text" id="confirmPassword" name="confirmPassword" placeholder="Confirm New Password" required>
              <button id="change-button" type="submit">비밀번호 변경</button>
            </form>
            <p><a href="#" id="back-login-form">돌아가기</a></p>
          </div>
        </div>

        <div class="navigator-bottom">
          <span class="tab active" data-section="home-container" onclick="showSection('home-container')">홈</span>
          <span class="tab" data-section="category-container" onclick="showSection('category-container')">카테고리</span>
          <span class="tab" data-section="search-container" onclick="showSection('search-container')">검색</span>
          <span class="tab" id="cart-tab" data-section="cart-container" onclick="showSection('cart-container')">장바구니</span>
          <span class="tab" data-section="mypage-container" onclick="showSection('mypage-container')">로그인</span>
        </div>
      </div>

      <div class="product-detail-container hidden" id="product-detail-container"></div>

      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/slick-carousel/slick/slick.min.js"></script>
      <script>
        function initSliders(scope) {
          $(scope).find('.slider').not('.slick-initialized').slick({
            infinite: true,
            slidesToShow: 1,
            slidesToScroll: 1,
            prevArrow: '<button type="button" class="slick-prev"><</button>',
            nextArrow: '<button type="button" class="slick-next">></button>'
          });
        }

        function refreshAuthUI() {
          $.ajax({
            url: '/session-check',
            method: 'GET',
            success: function(response) {
              if (response.loggedIn) {
                localStorage.setItem('username', response.username);
                $('#usernameDisplay').text(response.username);
                $('#login-form').addClass('hidden');
                $('#register-form').addClass('hidden');
                $('#change-form').addClass('hidden');
                $('#logout-form').removeClass('hidden');
              } else {
                localStorage.removeItem('username');
                $('#logout-form').addClass('hidden');
                $('#change-form').addClass('hidden');
                $('#register-form').addClass('hidden');
                $('#login-form').removeClass('hidden');
              }
            },
            error: function(err) {
              console.error('세션 확인 실패:', err);
            }
          });
        }

        function openProductDetail(productId) {
          $.ajax({
            type: 'POST',
            url: '/product-detail',
            data: { productId: productId },
            success: function(response) {
              $('#product-detail-container').html(response);
              $('#main').addClass('hidden');
              $('#product-detail-container').removeClass('hidden');
              showDetailSection('image-container');
              window.scrollTo(0, 0);
              initSliders($('#product-detail-container'));
            },
            error: function() {
              alert('상품 정보를 불러오는 중 오류가 발생했습니다.');
            }
          });
        }

        function loadPopularProducts() {
          fetch('/popular-products')
            .then(function(response) { return response.text(); })
            .then(function(html) {
              var rankingContainer = document.querySelector('#ranking-container');
              rankingContainer.innerHTML = html;
              initSliders($(rankingContainer));
            })
            .catch(function(error) {
              console.error('인기 목록 요청 오류:', error);
            });
        }

        function loadCategoryPage() {
          fetch('/category-page')
            .then(function(response) { return response.text(); })
            .then(function(html) {
              document.querySelector('#category-container').innerHTML = html;
            })
            .catch(function(error) {
              console.error('카테고리 페이지 요청 오류:', error);
            });
        }

        function loadProductsByCategory(category) {
          fetch('/products-by-category/' + encodeURIComponent(category))
            .then(function(response) { return response.text(); })
            .then(function(html) {
              var categoryContainer = document.querySelector('#category-container');
              categoryContainer.innerHTML = html;
              initSliders($(categoryContainer));
            })
            .catch(function(error) {
              console.error('상품 목록 요청 오류:', error);
            });
        }

        function loadCart() {
          $.ajax({
            url: '/session-check',
            method: 'GET',
            success: function(response) {
              if (!response.loggedIn) {
                $('#cart-container').html('<p style="text-align:center; margin-top:40%; font-size:20px">로그인 후 이용해주세요.</p>');
                return;
              }

              $.ajax({
                url: '/user-cart',
                method: 'GET',
                success: function(html) {
                  $('#cart-container').html(html);
                  initSliders($('#cart-container'));
                },
                error: function(err) {
                  console.error('장바구니 로드 오류:', err);
                }
              });
            },
            error: function(err) {
              console.error('세션 확인 오류:', err);
            }
          });
        }

        function displaySearchDropdown(results) {
          var searchResultsDropdown = $('#search-results');
          searchResultsDropdown.empty();

          if (!results || results.length === 0) {
            searchResultsDropdown.append('<p><a>검색 결과가 없습니다.</a></p>');
            return;
          }

          var resultList = $('<ul></ul>');
          results.forEach(function(result) {
            var listItem = $('<p></p>').html(
              '<a href="#" class="product-link" data-id="' + result.id + '">' + result.name + '</a>'
            );
            resultList.append(listItem);
          });
          searchResultsDropdown.append(resultList);
        }

        function showSubSection(subsectionId) {
          document.querySelectorAll('#home-container .product-container, #home-container .ranking-container, #home-container .insert-container')
            .forEach(function(section) {
              section.style.display = 'none';
            });

          document.getElementById(subsectionId).style.display = 'block';

          document.querySelectorAll('#home-container .navigator .tab').forEach(function(tab) {
            tab.classList.remove('active');
          });

          var activeTab = document.querySelector('#home-container .navigator [data-section="' + subsectionId + '"]');
          if (activeTab) activeTab.classList.add('active');
        }

        function showSection(sectionId) {
          document.querySelectorAll('.home-container, .category-container, .search-container, .cart-container, .mypage-container')
            .forEach(function(section) {
              section.style.display = 'none';
            });

          document.getElementById(sectionId).style.display = 'block';

          document.querySelectorAll('.navigator-bottom .tab').forEach(function(tab) {
            tab.classList.remove('active');
          });

          var activeTab = document.querySelector('.navigator-bottom [data-section="' + sectionId + '"]');
          if (activeTab) activeTab.classList.add('active');
        }

        function showDetailSection(sectionId) {
          document.querySelectorAll('#product-detail-container .detail, #product-detail-container .image-container, #product-detail-container .order-info')
            .forEach(function(section) {
              section.style.display = 'none';
            });

          var target = document.getElementById(sectionId);
          if (target) target.style.display = 'block';

          document.querySelectorAll('#product-detail-container .detail-navigator .tab').forEach(function(tab) {
            tab.classList.remove('active');
          });

          var activeTab = document.querySelector('#product-detail-container .detail-navigator [data-section="' + sectionId + '"]');
          if (activeTab) activeTab.classList.add('active');
        }

        $(document).ready(function() {
          initSliders($(document));
          showSection('home-container');
          showSubSection('product-container');
          refreshAuthUI();

          $('#price').on('input', function(event) {
            var input = event.target.value.replace(/[^0-9]/g, '');
            if (input.length > 0) {
              event.target.value = '₩' + Number(input).toLocaleString('ko-KR');
            } else {
              event.target.value = '';
            }
          });

          $('#insert-form').on('submit', function(event) {
            event.preventDefault();
            var formData = new FormData(this);

            $.ajax({
              type: 'POST',
              url: '/submit',
              data: formData,
              contentType: false,
              processData: false,
              success: function(response) {
                alert(response);
                location.reload();
              },
              error: function(err) {
                console.error('데이터 전송 오류:', err);
              }
            });
          });

          $('#show-register-form').on('click', function(event) {
            event.preventDefault();
            $('#login-form').addClass('hidden');
            $('#register-form').removeClass('hidden');
          });

          $('#show-login-form').on('click', function(event) {
            event.preventDefault();
            $('#register-form').addClass('hidden');
            $('#login-form').removeClass('hidden');
          });

          $('#back-login-form').on('click', function(event) {
            event.preventDefault();
            $('#change-form').addClass('hidden');
            $('#logout-form').removeClass('hidden');
          });

          $('#loginForm').on('submit', function(event) {
            event.preventDefault();

            var username = $('#username').val();
            var password = $('#password').val();

            $.ajax({
              type: 'POST',
              url: '/login',
              data: { username: username, password: password },
              success: function(response) {
                alert(response.message);
                localStorage.setItem('username', username);
                $('#username').val('');
                $('#password').val('');
                refreshAuthUI();
              },
              error: function() {
                alert('로그인 실패, 아이디와 비밀번호를 확인해 주세요');
                $('#password').val('');
              }
            });
          });

          $('#logoutForm').on('submit', function(event) {
            event.preventDefault();

            $.ajax({
              type: 'POST',
              url: '/logout',
              success: function(response) {
                alert(response.message);
                localStorage.removeItem('username');
                refreshAuthUI();
              },
              error: function(xhr, status, error) {
                alert('로그아웃 실패: ' + error);
              }
            });
          });

          $('#changePassword').on('submit', function(event) {
            event.preventDefault();
            $('#logout-form').addClass('hidden');
            $('#change-form').removeClass('hidden');
          });

          $('#changeForm').on('submit', function(event) {
            event.preventDefault();

            var username = localStorage.getItem('username');
            var oldPassword = $('#oldPassword').val();
            var newPassword = $('#newPassword').val();
            var confirmPassword = $('#confirmPassword').val();

            if (newPassword !== confirmPassword) {
              alert('새 비밀번호와 확인용 비밀번호가 일치하지 않습니다.');
              $('#confirmPassword').val('');
              return;
            }

            if (oldPassword === newPassword) {
              alert('새로운 비밀번호가 기존과 동일합니다.');
              $('#newPassword').val('');
              $('#confirmPassword').val('');
              return;
            }

            $.ajax({
              type: 'POST',
              url: '/change-password',
              data: { username: username, oldPassword: oldPassword, newPassword: newPassword },
              success: function(response) {
                alert(response.message);
                $('#oldPassword').val('');
                $('#newPassword').val('');
                $('#confirmPassword').val('');
                $('#change-form').addClass('hidden');
                $('#login-form').removeClass('hidden');
                refreshAuthUI();
              },
              error: function() {
                alert('기존 비밀번호가 일치하지 않습니다.');
                $('#oldPassword').val('');
                $('#newPassword').val('');
                $('#confirmPassword').val('');
              }
            });
          });

          $('#registerForm').on('submit', function(event) {
            event.preventDefault();

            var newUsername = $('#new-username').val();
            var newPassword = $('#new-password').val();

            $.ajax({
              type: 'POST',
              url: '/register',
              data: { username: newUsername, password: newPassword },
              success: function(response) {
                alert(response.message);
                $('#new-username').val('');
                $('#new-password').val('');
                $('#register-form').addClass('hidden');
                $('#login-form').removeClass('hidden');
              },
              error: function() {
                alert('이미 존재하는 회원입니다');
              }
            });
          });

          $('#search-input').on('input', function() {
            var query = $(this).val();

            $.ajax({
              type: 'GET',
              url: '/search',
              data: { query: query },
              success: function(results) {
                displaySearchDropdown(results);
              },
              error: function(xhr, status, error) {
                console.error('검색 실패:', error);
              }
            });
          });

          $('#cart-tab').on('click', function() {
            loadCart();
          });

          $('.tab[data-section="ranking-container"]').on('click', function() {
            loadPopularProducts();
          });

          $('.tab[data-section="category-container"]').on('click', function() {
            loadCategoryPage();
          });

          $(document).on('click', '.category-item', function() {
            loadProductsByCategory($(this).text());
          });

          $(document).on('click', '.product[data-id]', function(event) {
            if ($(event.target).closest('.slick-arrow, .slick-dots, .remove-btn').length) {
              return;
            }
            openProductDetail($(this).data('id'));
          });

          $(document).on('click', '.back-button', function(event) {
            event.stopPropagation();
            $('#product-detail-container').addClass('hidden').empty();
            $('#main').removeClass('hidden');
          });

          $(document).on('click', '#add-to-cart-button', function(event) {
            event.stopPropagation();

            var username = localStorage.getItem('username');
            var productId = $(this).data('product-id');

            $.ajax({
              type: 'POST',
              url: '/add-to-cart',
              contentType: 'application/json',
              data: JSON.stringify({ productId: productId, username: username }),
              success: function(response) {
                alert(response.message);
              },
              error: function(xhr) {
                var errorMessage = xhr.responseJSON ? xhr.responseJSON.message : '장바구니에 추가하는 중 오류가 발생했습니다.';
                alert(errorMessage);
              }
            });
          });

          $(document).on('click', '.product-link', function(event) {
            event.preventDefault();
            openProductDetail($(this).data('id'));
          });

          $(document).on('click', '.remove-btn', function(event) {
            event.stopPropagation();

            var username = localStorage.getItem('username');
            var productId = $(this).data('id');

            $.ajax({
              type: 'POST',
              url: '/remove-from-cart',
              contentType: 'application/json',
              data: JSON.stringify({ productId: productId, username: username }),
              success: function(response) {
                alert(response.message || '상품을 장바구니에서 제거하였습니다.');
                loadCart();
              },
              error: function(err) {
                console.error('상품 삭제 오류:', err);
              }
            });
          });
        });
      </script>
    </body>
    </html>
  `;
}

router.get('/', (req, res) => {
  const db = req.app.locals.db;

  db.query('SELECT * FROM producttable', (error, results) => {
    if (error) {
      console.error('쿼리 실행 오류:', error);
      return res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
    }

    res.send(renderPage(results));
  });
});

module.exports = router;