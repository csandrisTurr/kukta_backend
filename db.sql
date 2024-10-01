CREATE TABLE `users` (
    `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(32) NOT NULL,
    `email` VARCHAR(64) NOT NULL,
    `password` VARCHAR(40) NOT NULL,
    `role` VARCHAR(3) NOT NULL, -- adm, usr, mod
    `phone` VARCHAR(15),
    `banned` TINYINT(1) NOT NULL
);

CREATE TABLE `recipe` (
    `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(64) NOT NULL,
    `description` TEXT NOT NULL,
    `calories` INT NOT NULL,
    `time` INT NOT NULL, -- adm, usr, mod
    `image` MEDIUMBLOB
);

CREATE TABLE `addition` (
    `recipe_id` INT NOT NULL,
    `name` VARCHAR(64) NOT NULL
);

CREATE TABLE `category_claim` (
    `recipe_id` INT NOT NULL,
    `category_id` INT NOT NULL
);

CREATE TABLE `category` (
    `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(32) NOT NULL
);