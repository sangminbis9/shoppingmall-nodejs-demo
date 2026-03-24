const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
  
const router = express.Router();

router.get('/', (req, res) => {
  const db = req.app.locals.db;

  db.query('SELECT * FROM producttable', (error, results, fields) => {
    if (error) {
      console.error('쿼리 실행 오류: ', error);
      return res.status(500).send('데이터 조회 중 오류가 발생했습니다.');
    } else {
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
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
              grid-template-columns: repeat(2, 1fr); /* 한 줄에 2개의 열을 지정 */
              gap: 10px;
            }
            .category-item {
              border: 1px solid #ccc;
              padding: 10px;
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
              text-align:left;
              background-color: #f9f9f9;
              box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
              z-index: 1;
              max-height: 200px;
              overflow-y: auto;
              width: 60%; /* Set to 100% to match the search input */
              border-top: none; /* To blend with the search input */
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
              margin: 20px 0; /* Adjust margin as needed */
            }
            #search-form {
              position: relative;
              margin: 0 auto;
              width: 100%; /* Set to 100% to center the search form */
            }
            #search-input {
              width: 60%; /* Set to 60% to match the container */
              box-sizing: border-box;
              border: 2px solid #ccc;
              border-radius: 8px;
              font-size: 16px;
              margin-top: 10%;
              padding: 12px 20px 12px 40px;
              border-bottom-left-radius: 0; /* Match the dropdown */
              border-bottom-right-radius: 0; /* Match the dropdown */
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
            #remove-btn {
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
              &:hover {
                background: rgb(77,77,77);
                color: #fff;
              }
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
      `;

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
              <!--
              <p>Category: ${product.category}</p>
              <p>Color: ${product.color}</p>
              <p>Gender: ${product.gender}</p>
              -->
              <p>Price: ₩${product.price.toLocaleString()}</p>
            </div>`;
      });

      html += `
            </div>

            
            <div class="ranking-container" id="ranking-container"> </div>

            <div class="insert-container" id="insert-container"> 
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

              <script>
                document.getElementById('price').addEventListener('input', function(event) {
                  let input = event.target.value;
                  
                  // '₩'와 ','를 제거하여 숫자만 남김
                  input = input.replace(/[^0-9]/g, "");
                  
                  if (input.length > 0) {
                    // 숫자에 쉼표를 추가
                    let formattedPrice = Number(input).toLocaleString('ko-KR');
                    // 앞에 '₩' 추가
                    event.target.value = '₩' + formattedPrice;
                  } else {
                    event.target.value = '';
                  }
                });
              </script>
            </div>
          </div>

          <div class="category-container" id="category-container"> </div>

          <div class="search-container" id="search-container">
            <form id="search-form">
              <input type="text" id="search-input" placeholder="검색어를 입력하세요" required>
            </form>
            <div id="search-results" class="dropdown-content"></div>
          </div>

          <div class="cart-container" id="cart-container"> cart-container </div>

          <div class="mypage-container" id="mypage-container">
            <!-- 로그인 폼 -->
            <div id="login-form">
              <h2>로그인</h2>
              <form id="loginForm" action="/login" method="POST">
                <input type="text" id="username" name="username" placeholder="User" required>
                <input type="password" id="password" name="password" placeholder="Password" required>
                <button id="login-button" type="submit">로그인</button>
              </form>
              <p>계정이 없으신가요? <a href="#" id="show-register-form">회원가입하기</a></p>
            </div>
            <!-- 회원가입 폼 -->
            <div id="register-form" class="hidden">
              <h2>회원가입</h2>
              <form id="registerForm" action="/register" method="POST">
                <input type="text" id="new-username" name="username" placeholder="User" required>
                <input type="password" id="new-password" name="password" placeholder="Password" required>
                <button id="register-button" type="submit">회원가입</button>
              </form>
              <p>이미 계정이 있으신가요? <a href="#" id="show-login-form">로그인하러 가기</a></p>
            </div>
            <!-- 로그아웃 폼 -->
            <div id="logout-form" class="hidden">
              <h2><span id="usernameDisplay"></span></h2>
              <form id="changePassword" action="/logout" method="POST">
                <button id="changePassword-button" type="submit">비밀번호 변경</button>
              </form>
              <form id="logoutForm" action="/logout" method="POST">
                <button id="logout-button" type="submit">로그아웃</button>
              </form>
            </div>
            <!-- 비밀번호 변경 폼 -->
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

        <div class="product-detail-container hidden" id="product-detail-container"> </div>

        <div class="search-result hidden" id="search-result"> </div>

          <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/slick-carousel/slick/slick.min.js"></script>
          <script>
            $(document).ready(function() {
              const username = localStorage.getItem('username');
            
              if (username) {
                  // username이 존재하면 /destroy-session을 호출합니다.
                  $.ajax({
                      url: '/destroy-session',
                      method: 'POST',
                      contentType: 'application/json',
                      success: function(result) {
                          if (result.success) {
                              console.log('세션이 성공적으로 파괴되었습니다.');
                              // localStorage에서 username을 제거합니다.
                              localStorage.removeItem('username');
                          } else {
                              console.error('세션 파괴 실패.');
                          }
                      },
                      error: function(error) {
                          console.error('세션 파괴 요청 중 오류 발생:', error);
                      }
                  });
              } else {
                  console.log('username이 localStorage에 없습니다.');
              }

              $('.slider').slick({
                infinite: true,
                slidesToShow: 1,
                slidesToScroll: 1,
                prevArrow: '<button type="button" class="slick-prev"><</button>',
                nextArrow: '<button type="button" class="slick-next">></button>'
              });

              $('.back-button').on('click', function(event) {
                event.stopPropagation();
                $('#product-detail-container').addClass('hidden');
                $('#main').removeClass('hidden');
              });

              $('.product').on('click', function(event) {
                event.stopPropagation();
                const productId = $(this).data('id');
                const username = localStorage.getItem('username');

                $.ajax({
                  type: 'POST',
                  url: '/product-detail',
                  data: { productId: productId},
                  success: function(response) {
                      $('#product-detail-container').html(response);
                      $('#main').addClass('hidden');
                      $('#product-detail-container').removeClass('hidden');
                      showDetailSection('image-container');
                      window.scrollTo(0, 0);

                      $('.back-button').on('click', function(event) {
                        event.stopPropagation();
                        $('#product-detail-container').addClass('hidden');
                        $('#main').removeClass('hidden');
                      });

                      $('#add-to-cart-button').on('click', function() {
                        $.ajax({
                            type: 'POST',
                            url: '/add-to-cart',
                            contentType: 'application/json',
                            data: JSON.stringify({ productId: productId, username: username }),
                            success: function(response) {
                                alert(response.message);
                            },
                            error: function(xhr, status, error) {
                                const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : '장바구니에 추가하는 중 오류가 발생했습니다.';
                                alert(errorMessage);
                            }
                        });
                      });
                    },
                    error: function(xhr, status, error) {
                        alert('상품 정보를 불러오는 중 오류가 발생했습니다.');
                    }
                });
              });

              $('#insert-form').submit(function(event) {
                event.preventDefault(); // 기본 동작 중단
            
                // FormData 객체 생성
                var formData = new FormData(this);
            
                // POST 요청 보내기
                $.ajax({
                  type: 'POST',
                  url: '/submit',
                  data: formData,
                  contentType: false, // 파일 데이터를 전송할 때는 false로 설정
                  processData: false, // formData 객체를 문자열로 변환하지 않도록 설정
                  success: function(response) {
                    // 성공 시 처리
                    alert(response);
                  },
                  error: function(err) {
                    // 오류 발생 시 처리
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

              $('#login-form').on('submit', function(event) {
                event.preventDefault();
                const username = $('#username').val();
                const password = $('#password').val();
                const loginForm = document.getElementById('login-form');
                const logoutForm = document.getElementById('logout-form');

                $.ajax({
                  type: 'POST',
                  url: '/login',
                  data: { username: username, password: password },
                  success: function(response) {
                    alert(response.message);
                    logoutForm.classList.remove('hidden');
                    loginForm.classList.add('hidden');
                    $('#username').val('');
                    $('#password').val('');

                    localStorage.setItem('username', username);
                    $('#usernameDisplay').text(username)
                  },
                  error: function(xhr, status, error) {
                    alert('로그인 실패, 아이디와 비밀번호를 확인해 주세요');
                   $('#password').val('');
                  }
                });
              });
              $('#logoutForm').on('submit', function(event) {
                event.preventDefault();
                const loginForm = document.getElementById('login-form');
                const logoutForm = document.getElementById('logout-form');
                
                $.ajax({
                  type: 'POST',
                  url: '/logout',
                  success: function(response) {
                    alert(response.message);
                    logoutForm.classList.add('hidden');
                    loginForm.classList.remove('hidden');

                    localStorage.removeItem('username');
                  },
                  error: function(xhr, status, error) {
                    alert('로그아웃 실패: ' + error);
                  }
                });
              });
              $('#changePassword').on('submit', function(event) {
                event.preventDefault();
                const changeForm = document.getElementById('change-form');
                const logoutForm = document.getElementById('logout-form');
                
                logoutForm.classList.add('hidden');
                changeForm.classList.remove('hidden');
              });
              $('#changeForm').on('submit', function(event) {
                event.preventDefault();
                const loginForm = document.getElementById('login-form');
                const changeForm = document.getElementById('change-form');
                const username = localStorage.getItem('username');
                const oldPassword = $('#oldPassword').val();
                const newPassword = $('#newPassword').val();
                const confirmPassword = $('#confirmPassword').val();
              
                // 새 비밀번호와 확인용 비밀번호가 일치하는지 확인
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

                    changeForm.classList.add('hidden');
                    loginForm.classList.remove('hidden');
                  },
                  error: function(xhr, status, error) {
                    alert('기존 비밀번호가 일치하지 않습니다.');
                    $('#oldPassword').val('');
                    $('#newPassword').val('');
                    $('#confirmPassword').val('');
                  }
                });
              });

              $('#register-form').on('submit', function(event) {
                event.preventDefault();
                const newUsername = $('#new-username').val();
                const newPassword = $('#new-password').val();
                const loginForm = document.getElementById('login-form');
                const registerForm = document.getElementById('register-form');
              
                $.ajax({
                  type: 'POST',
                  url: '/register',
                  data: { username: newUsername, password: newPassword },
                  success: function(response) {
                    alert(response.message);
                    loginForm.classList.remove('hidden');
                    registerForm.classList.add('hidden');
                    $('#new-username').val('');
                    $('#new-password').val('');
                  },
                  error: function(xhr, status, error) {
                    alert('이미 존재하는 회원입니다');
                    $('#username').val('');
                    $('#password').val('');
                  }
                });
              });

              $('#search-input').on('input', function() {
                const query = $(this).val();
          
                $.ajax({
                  type: 'GET',
                  url: '/search',
                  data: { query: query },
                  success: function(results) {
                    displaySearchDropdown(results);
                  },
                  error: function(xhr, status, error) {
                    console.error('검색 실패: ', error);
                  }
                });
              });
              
              $('#cart-tab').click(function() {
                // 현재 로그인 상태인지 확인
                $.ajax({
                    url: '/session-check',
                    method: 'GET',
                    success: function(response) {
                        if (response.loggedIn) {
                            // 로그인된 경우 서버로부터 장바구니 정보를 가져오는 AJAX 요청
                            $.ajax({
                                url: '/user-cart',
                                method: 'GET',
                                success: function(html) {
                                    const cartContainer = document.querySelector('#cart-container');
                                    // 받아온 HTML을 장바구니 컨테이너에 삽입
                                    $('#cart-container').html(html);
                                    
                                    $('.product').on('click', function(event) {
                                      event.stopPropagation();
                                      const productId = $(this).data('id');
                                      const username = localStorage.getItem('username');
                      
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
  
                                              $('.back-button').on('click', function(event) {
                                                event.stopPropagation();
                                                $('#product-detail-container').addClass('hidden');
                                                $('#main').removeClass('hidden');
                                              });
  
                                              $('#add-to-cart-button').on('click', function() {
                                                $.ajax({
                                                    type: 'POST',
                                                    url: '/add-to-cart',
                                                    contentType: 'application/json',
                                                    data: JSON.stringify({ productId: productId, username: username }),
                                                    success: function(response) {
                                                        alert(response.message);
                                                    },
                                                    error: function(xhr, status, error) {
                                                        const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : '장바구니에 추가하는 중 오류가 발생했습니다.';
                                                        alert(errorMessage);
                                                    }
                                                });
                                              });
                                          },
                                          error: function(xhr, status, error) {
                                              alert('상품 정보를 불러오는 중 오류가 발생했습니다.');
                                          }
                                      });
                                    });
                                    $('.remove-btn').click(function() {
                                      event.stopPropagation();
                                      // 현재 로그인된 사용자의 username을 local storage에서 가져옵니다.
                                      var username = localStorage.getItem('username');
                                      
                                      // 해당 상품의 데이터 ID를 가져옵니다.
                                      var productId = $(this).data('id');
                                      
                                      // AJAX 요청을 보냅니다.
                                      $.ajax({
                                          type: 'POST',
                                          url: '/remove-from-cart',
                                          contentType: 'application/json',
                                          data: JSON.stringify({ productId: productId, username: username }),
                                          success: function(response) {
                                              // 서버에서 장바구니를 업데이트한 후 새로운 상품 목록을 받아옵니다.
                                              // 이 부분에서 새로운 상품 목록을 화면에 갱신하거나 필요한 작업을 수행합니다.
                                              alert('상품을 장바구니에서 제거하였습니다. 장바구니를 다시 클릭하여 업데이트 해주십시오.');
                                          },
                                          error: function(err) {
                                              console.error('상품 삭제 오류:', err);
                                          }
                                      });
                                    });
                                },
                                error: function(err) {
                                    console.error('Error fetching user cart:', err);
                                }
                            });
                        } else {
                            // 로그인되지 않은 경우 메시지 표시
                            $('#cart-container').html('<p style="text-align:center; margin-top:40%; font-size:20px">로그인 후 이용해주세요.</p>');
                        }
                    },
                    error: function(err) {
                        console.error('Error checking session:', err);
                    }
                });
              });
            });

            document.querySelector('.tab[data-section="ranking-container"]').addEventListener('click', function() {
              fetch('/popular-products')
                .then(response => response.text())
                .then(html => {
                  const rankingContainer = document.querySelector('#ranking-container');
                  rankingContainer.innerHTML = html;
            
                  // 동적으로 삽입된 슬라이더 초기화
                  $(rankingContainer).find('.slider').slick({
                    infinite: true,
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    prevArrow: '<button type="button" class="slick-prev"><</button>',
                    nextArrow: '<button type="button" class="slick-next">></button>'
                  });
                  $('.product').on('click', function(event) {
                    event.stopPropagation();
                    const productId = $(this).data('id');
                    const username = localStorage.getItem('username');
    
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

                            $('.back-button').on('click', function(event) {
                              event.stopPropagation();
                              $('#product-detail-container').addClass('hidden');
                              $('#main').removeClass('hidden');
                            });

                            $('#add-to-cart-button').on('click', function() {
                              $.ajax({
                                  type: 'POST',
                                  url: '/add-to-cart',
                                  contentType: 'application/json',
                                  data: JSON.stringify({ productId: productId, username: username }),
                                  success: function(response) {
                                      alert(response.message);
                                  },
                                  error: function(xhr, status, error) {
                                      const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : '장바구니에 추가하는 중 오류가 발생했습니다.';
                                      alert(errorMessage);
                                  }
                              });
                            });
                        },
                        error: function(xhr, status, error) {
                            alert('상품 정보를 불러오는 중 오류가 발생했습니다.');
                        }
                    });
                  });
                })
                .catch(error => {
                  console.error('인기 목록 요청 오류:', error);
                });
            });

            document.querySelector('.tab[data-section="category-container"]').addEventListener('click', function() {
              fetch('/category-page')
              .then(response => response.text())
              .then(html => {
                  const categoryContainer = document.querySelector('#category-container');
                  categoryContainer.innerHTML = html;
                  
                  // 카테고리를 클릭했을 때의 이벤트 리스너 추가
                  document.querySelectorAll('.category-item').forEach(item => {
                      item.addEventListener('click', function() {
                          const category = this.innerText;
                          // 클릭한 카테고리에 해당하는 상품 데이터 요청
                          fetch('/products-by-category/' + category)
                              .then(response => response.text())
                              .then(html => {
                                  // 받아온 상품 데이터를 category-container에 업데이트
                                  categoryContainer.innerHTML = html;
                                  // 동적으로 삽입된 슬라이더 초기화
                                  $(categoryContainer).find('.slider').slick({
                                    infinite: true,
                                    slidesToShow: 1,
                                    slidesToScroll: 1,
                                    prevArrow: '<button type="button" class="slick-prev"><</button>',
                                    nextArrow: '<button type="button" class="slick-next">></button>'
                                  });
                                  $('.product').on('click', function(event) {
                                    event.stopPropagation();
                                    const productId = $(this).data('id');
                                    const username = localStorage.getItem('username');
                    
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

                                            $('.back-button').on('click', function(event) {
                                              event.stopPropagation();
                                              $('#product-detail-container').addClass('hidden');
                                              $('#main').removeClass('hidden');
                                            });

                                            $('#add-to-cart-button').on('click', function() {
                                              $.ajax({
                                                  type: 'POST',
                                                  url: '/add-to-cart',
                                                  contentType: 'application/json',
                                                  data: JSON.stringify({ productId: productId, username: username }),
                                                  success: function(response) {
                                                      alert(response.message);
                                                  },
                                                  error: function(xhr, status, error) {
                                                      const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : '장바구니에 추가하는 중 오류가 발생했습니다.';
                                                      alert(errorMessage);
                                                  }
                                              });
                                            });
                                        },
                                        error: function(xhr, status, error) {
                                            alert('상품 정보를 불러오는 중 오류가 발생했습니다.');
                                        }
                                    });
                                  });
                              })
                              .catch(error => {
                                  console.error('상품 목록 요청 오류:', error);
                              });
                      });
                  });
              })
              .catch(error => {
                  console.error('카테고리 페이지 요청 오류:', error);
              });
            });
            

            document.addEventListener('DOMContentLoaded', () => {
                // 기본으로 첫 번째 섹션 보이기
              showSection('home-container');
              showSubSection('product-container');
            });

            function displaySearchDropdown(results) {
              const searchResultsDropdown = $('#search-results');
              searchResultsDropdown.empty();
            
              if (results.length === 0) {
                searchResultsDropdown.append('<p><a>검색 결과가 없습니다.</a></p>');
              } else {
                const resultList = $('<ul></ul>');
                results.forEach(function(result) {
                  const listItem = $('<p></p>').html('<a href="#" class="product-link" data-id="' + result.id + '">' + result.name + '</a>');
                  resultList.append(listItem);
                });
                searchResultsDropdown.append(resultList);
              }
            
              // Add click event handler for each product link
              $('.product-link').on('click', function(event) {
                event.preventDefault();
                const productId = $(this).data('id');
                $.ajax({
                  type: 'POST',
                  url: '/product-detail',
                  data: { productId: productId },
                  success: function(response) {
                    const username = localStorage.getItem('username');
                    $('#product-detail-container').html(response);
                    $('#main').addClass('hidden');
                    $('#product-detail-container').removeClass('hidden');
                    showDetailSection('image-container');
                    window.scrollTo(0, 0);

                    $('.back-button').on('click', function(event) {
                      event.stopPropagation();
                      $('#product-detail-container').addClass('hidden');
                      $('#main').removeClass('hidden');
                    });

                    $('#add-to-cart-button').on('click', function() {
                      $.ajax({
                          type: 'POST',
                          url: '/add-to-cart',
                          contentType: 'application/json',
                          data: JSON.stringify({ productId: productId, username: username }),
                          success: function(response) {
                              alert(response.message);
                          },
                          error: function(xhr, status, error) {
                              const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : '장바구니에 추가하는 중 오류가 발생했습니다.';
                              alert(errorMessage);
                          }
                      });
                    });
                  },
                  error: function(xhr, status, error) {
                    console.error('제품 상세 정보 가져오기 실패: ', error);
                  }
                });
              });
            }
            
            function showSubSection(subsectionId) {
              // 모든 섹션 숨기기
              document.querySelectorAll('.product-container, .ranking-container, .insert-container').forEach(section => {
                  section.style.display = 'none';
              });
          
              // 클릭한 탭의 섹션 보이기
              document.getElementById(subsectionId).style.display = 'block';
          
              // 모든 탭을 비활성화
              document.querySelectorAll('.tab').forEach(tab => {
                  tab.classList.remove('active');
              });
          
              // 클릭한 탭 활성화
              document.querySelector('[data-section="' + subsectionId + '"]').classList.add('active');
            }          
            function showSection(sectionId) {
                // 모든 섹션 숨기기
                document.querySelectorAll('.home-container, .category-container, .search-container, .cart-container, .mypage-container').forEach(section => {
                    section.style.display = 'none';
                });
            
                // 클릭한 탭의 섹션 보이기
                document.getElementById(sectionId).style.display = 'block';
            
                // 모든 탭을 비활성화
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.classList.remove('active');
                });
            
                // 클릭한 탭 활성화
                document.querySelector('[data-section="' + sectionId + '"]').classList.add('active');
            }
            function showDetailSection(sectionId) {
              // 모든 섹션 숨기기
              document.querySelectorAll('.detail, .image-container, .order-info').forEach(section => {
                  section.style.display = 'none';
              });
  
              // 클릭한 탭의 섹션 보이기
              document.getElementById(sectionId).style.display = 'block';
  
              // 모든 탭을 비활성화
              document.querySelectorAll('.tab').forEach(tab => {
                  tab.classList.remove('active');
              });
  
              // 클릭한 탭 활성화
              document.querySelector('[data-section="' + sectionId + '"]').classList.add('active'); 
            }
          </script>
        </body>
        </html>
      `;

      res.send(html);
    }
  });
});

process.on('SIGINT', () => {
  console.log('서버 종료됨. MySQL 연결 종료.');
  connection.end();
  process.exit(0);
});

module.exports = router;
