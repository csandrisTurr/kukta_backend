CREATE TABLE `users` (
    `id` INT PRIMARY KEY NOT NULL AUTOINCREMENT,
    `name` VARCHAR(32) NOT NULL,
    `email` VARCHAR(64) NOT NULL,
    `password` VARCHAR(40) NOT NULL,
    `role` VARCHAR(3) NOT NULL, -- adm, usr, mod
    `phone` VARCHAR(15),
    `banned` TINYINT(1) NOT NULL,
);

CREATE TABLE `recipe` (
    `id` INT PRIMARY KEY NOT NULL AUTOINCREMENT,
    `title` VARCHAR(64) NOT NULL,
    `description` STRING NOT NULL,
    `calories` INT NOT NULL,
    `time` INT NOT NULL, -- adm, usr, mod
    `image` STRING,
);

CREATE TABLE `addition` (
    `recipe_id` INT FOREIGN KEY NOT NULL,
    `name` VARCHAR(64) NOT NULL,
);

CREATE TABLE `category_claim` (
    `recipe_id` FOREIGN KEY NOT NULL,
    `category_id` FOREIGN KEY NOT NULL,
)

CREATE TABLE `category` (
    `id` INT PRIMARY KEY NOT NULL AUTOINCREMENT,
    `name` VARCHAR(32) NOT NULL,
);