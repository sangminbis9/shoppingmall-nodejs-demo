# 쇼핑몰 프로그램 README

## 개요
이 프로젝트는 간단한 쇼핑몰 웹 애플리케이션입니다. 주요 기능으로는 상품 등록, 회원가입 및 로그인, 카테고리 분류, 조회수 기반 인기 목록, 검색, 장바구니 등이 있습니다. 이 프로그램은 MySQL을 데이터베이스로 사용하며, Express.js를 사용하여 서버 측 코드를 구현합니다.

## 기능
- **상품 등록**: 유저가 입력한 정보를 MySQL에 저장하며, 입력 받은 사진은 해당 상품의 이름으로 생성된 폴더에 저장됩니다.
- **회원가입 및 로그인**: 유저명을 데이터베이스에서 확인하고, 회원가입 및 로그인을 처리합니다.
- **카테고리 분류**: 서로 다른 카테고리들을 불러와 조회할 수 있습니다.
- **조회수 기반 인기 목록**: 상품 조회 시 해당 상품의 조회수를 증가시켜 인기 목록을 구성합니다.
- **검색**: 사용자의 입력을 기반으로 실시간으로 유사한 결과를 보여줍니다.
- **장바구니**: 유저의 장바구니 정보를 MySQL에 저장합니다.

## 설치 사항
프로젝트를 실행하기 위해 다음 사항들을 설치해야 합니다:
- Node.js
- MySQL

### MySQL 설치
MySQL은 8.0버전을 사용하였습니다.

## 데이터베이스 구성
프로젝트에 필요한 데이터베이스 및 테이블을 설정합니다.

### 데이터베이스 및 테이블 생성
MySQL에 접속하여 아래의 SQL 스크립트를 실행합니다:

```sql
CREATE DATABASE productdb;

USE productdb;

CREATE TABLE producttable (
    name VARCHAR(30) NOT NULL,
    image TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL,
    gender TEXT NOT NULL,
    views INT NOT NULL,
    price INT NOT NULL,
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id)
);

CREATE TABLE login (
    num INT NOT NULL AUTO_INCREMENT,
    id VARCHAR(45) NOT NULL,
    pw VARCHAR(45) NOT NULL,
    cart JSON DEFAULT NULL,
    PRIMARY KEY (num)
);
