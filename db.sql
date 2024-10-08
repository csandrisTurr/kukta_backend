CREATE DATABASE `kukta`
DEFAULT CHARACTER SET `utf8`
COLLATE `utf8_general_ci`;

USE `kukta`;

CREATE TABLE `users` (
    `id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `name` VARCHAR(32) NOT NULL,
    `email` VARCHAR(64) NOT NULL,
    `password` VARCHAR(40) NOT NULL,
    `role` VARCHAR(3) NOT NULL, -- adm, usr, mod
    `phone` VARCHAR(15),
    `banned` TINYINT(1) NOT NULL
);

CREATE TABLE `recipes` (
    `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(64) NOT NULL,
    `description` TEXT NOT NULL,
    `calories` INT NOT NULL,
    `time` INT NOT NULL, -- adm, usr, mod
    `image` MEDIUMBLOB
);

CREATE TABLE `additions` (
    `recipe_id` INT NOT NULL,
    `name` VARCHAR(64) NOT NULL
);

CREATE TABLE `category_claims` (
    `recipe_id` INT NOT NULL,
    `category_id` INT NOT NULL
);

CREATE TABLE `categories` (
    `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(32) NOT NULL
);