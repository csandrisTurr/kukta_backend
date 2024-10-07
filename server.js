require('dotenv').config();
const express = require('express');
var mysql = require('mysql');
const uuid = require('uuid');
var cors = require('cors');
var CryptoJS = require('crypto-js');
var moment = require('moment');

const app = express();
const port = process.env.PORT;
const passwordRegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

// middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

var pool = mysql.createPool({
  connectionLimit: process.env.CONNECTIONLIMIT,
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASS,
  database: process.env.DBNAME,
});

// get API version
app.get('/', (req, res) => {
  res.send(`API version : ${process.env.VERSION}`);
});

// user regisztráció (ez szinte ugyan az)
app.post('/reg', (req, res) => {
  // kötelező adatok ellenőrzése
  if (
    !req.body.name ||
    !req.body.email ||
    !req.body.password ||
    !req.body.phone
  ) {
    res.status(203).send('Nem adtál meg minden kötelező adatot!');
    return;
  }

  // jelszó min kritériumoknak megfelelés
  if (!req.body.password.match(passwordRegExp)) {
    res.status(203).send('A jelszó nem elég biztonságos!');
    return;
  }

  // email cím ellenőrzés
  pool.query(
    `SELECT * FROM users WHERE email='${req.body.email}'`,
    (err, results) => {
      if (err) {
        res.status(500).send('Hiba történt az adatbázis elérése közben!');
        return;
      }

      // ha van már ilyen email cím
      if (results.length != 0) {
        res.status(203).send('Ez az e-mail cím már regisztrálva van!');
        return;
      }

      // új felhasználó felvétele
      pool.query(
        `INSERT INTO users VALUES('${uuid.v4()}', '${req.body.name}', '${
          req.body.email
        }', SHA1('${req.body.password}'), 'usr', ${req.body.phone}, '0')`,
          (err, results) => {
            if (err) {
            res.status(500).send('Hiba történt az adatbázis művelet közben!');
            return;
          }
          res.status(202).send('Sikeres regisztráció!');
          return;
        },
      );
      return;
    },
  );
});

// user belépés
app.post('/login', (req, res) => {
  //console.log(req.body);
  if (!req.body.email || !req.body.password) {
    res.status(203).send('Hiányzó adatok!');
    return;
  }

  pool.query(
    `SELECT id, name, email, role, banned FROM users WHERE email ='${
      req.body.email
    }' AND password='${CryptoJS.SHA1(req.body.password)}'`,
    (err, results) => {
      if (err) {
        console.log(err)
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }
      if (results.length == 0) {
        res.status(203).send('Hibás belépési adatok!');
        return;
      }
      res.status(202).send(results);
      return;
    },
  );
});

// Kategóriák lekérése
app.get('/categories', logincheck, (req, res) => {
  pool.query(`SELECT * FROM categories`, (err, results) => {
    if (err) {
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }
    if (results.length == 0) {
      res.status(203).send('Nincsenek kategóriák!');
      return;
    }
    res.status(202).send(results);
    return;
  });
});

// bejelentkezett felhasználó adatainak lekérése
app.get('/me/:id', logincheck, (req, res) => {
  //TODO: id-t megoldani backenden majd, hogy ne kelljen itt átadni
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  pool.query(
    `SELECT name, email, role, phone, banned FROM users WHERE ID='${req.params.id}'`,
    (err, results) => {
      if (err) {
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }

      if (results.length == 0) {
        res.status(203).send('Hibás azonosító!');
        return;
      }

      res.status(202).send(results);
      return;
    },
  );
});

// felhasználó módosítása
app.patch('/users/:id', logincheck, (req, res) => {
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  if (!req.body.name || !req.body.email || !req.body.role || !req.body.role) {
    res.status(203).send('Hiányzó adatok!');
    return;
  }

  //TODO: ne módosíthassa már meglévő email címre az email címét
  console.log(req.body.role);

  pool.query(
    `UPDATE users SET name='${req.body.name}', email='${
      req.body.email
    }', phone='${req.body.phone}', role='${req.body.role}' WHERE id='${req.params.id}'`,
    (err, results) => {
      if (err) {
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }

      if (results.affectedRows == 0) {
        res.status(203).send('Hibás azonosító!');
        return;
      }

      res.status(200).send('Felhasználó adatok módosítva!');
      return;
    },
  );
});

// jelszó módosítás
app.patch('/passmod/:id', logincheck, (req, res) => {
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító! (0)');
    return;
  }

  if (!req.body.oldpass || !req.body.newpass) {
    res.status(203).send('Hiányzó adatok!');
    return;
  }

  // jelszó min kritériumoknak megfelelés
  if (!req.body.newpass.match(passwordRegExp)) {
    res.status(203).send('A jelszó nem elég biztonságos!');
    return;
  }

  // megnézzük, hogy jó-e a megadott jelenlegi jelszó
  pool.query(
    `SELECT pass FROM users WHERE id='${req.params.id}'`,
    (err, results) => {
      if (err) {
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }

      if (results.length == 0) {
        res.status(203).send('Hibás azonosító! (1)');
        return;
      }
      if (results[0].pass != CryptoJS.SHA1(req.body.oldpass)) {
        res.status(203).send('A jelenlegi jelszó nem megfelelő!');
        return;
      }

      pool.query(
        `UPDATE users SET password='${CryptoJS.SHA1(req.body.newpass).toString()}' WHERE id='${req.params.id}'`,
        (err, results) => {
          if (err) {
            res.status(500).send('Hiba történt az adatbázis lekérés közben!');
            return;
          }

          if (results.affectedRows == 0) {
            res.status(203).send('Hibás azonosító!');
            return;
          }

          res.status(200).send('A jelszó módosítva!');
          return;
        },
      );
    },
  );
});

// felhasználók listája (CSAK ADMIN)
app.get('/users', (req, res) => {
  //TODO: csak admin joggal lehet - később

  pool.query(`SELECT id, name, email, role, phone, banned FROM users`, (err, results) => {
    if (err) {
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }
    res.status(200).send(results);
    return;
  });
});

app.get('/username/:id', (req, res) => {
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  pool.query(
    `SELECT name FROM users WHERE ID='${req.params.id}'`,
    (err, results) => {
      if (err) {
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }

      if (results.length == 0) {
        res.status(203).send('Hibás azonosító!');
        return;
      }

      res.status(202).send(results);
      return;
    },
  );
});

// felhasználó adatainak lekérése id alapján (CSAK ADMIN)
app.get('/users/:id', (req, res) => {
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  pool.query(
    `SELECT name, email, role, phone, banned FROM users WHERE ID='${req.params.id}'`,
    (err, results) => {
      if (err) {
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }

      if (results.length == 0) {
        res.status(203).send('Hibás azonosító!');
        return;
      }

      res.status(202).send(results);
      return;
    },
  );
});

// felhasználó törlése id alapján (CSAK ADMIN)
app.delete('/users/:id', logincheck, (req, res) => {
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  pool.query(
    `DELETE FROM users WHERE ID='${req.params.id}'`,
    (err, results) => {
      if (err) {
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }

      if (results.affectedRows == 0) {
        res.status(203).send('Hibás azonosító!');
        return;
      }

      res.status(200).send('Felhasználó törölve!');
      return;
    },
  );
});

// Zoli
app.post('/recipes', logincheck, (req, res) => {
  console.log('Ezt is meghívták');

  if (
    !req.body.title ||
    !req.body.description ||
    !req.body.calories ||
    !req.body.time ||
    !req.body.image ||
    !req.body.categories ||
    !req.body.additions
  ) {
    console.log('Hiányzó adatok!');
    res.status(203).send('Hiányzó adatok!');
    return;
  }
  let recipeId = null;
  pool.query(
    `INSERT INTO recipes (user_id, title, description, calories, time, image) VALUES ('${
      req.header('Authorization')}', '${req.body.title}', '${req.body.description}', ${req.body.calories}, '${req.body.time}', '${req.body.image}')`,
    (err, end) => {
      if (err) {
        console.log('Hiba történt az adatbázis művelet közben! (1)');
        console.log(err)
        res
          .status(500)
          .send('Hiba történt az adatbázis művelet közben! (1)');
        return;
      }

      recipeId = end.insertId;

      req.body.categories = req.body.categories;
      const jaj = req.body.categories.map(x => `('${recipeId}', '${x}')`);

      if (req.body.categories.length != 0) {
        pool.query(
          `INSERT INTO category_claims VALUES ${jaj.join(', ')}`,
          (err, end) => {
            if (err) {
              console.log('Hiba történt az adatbázis művelet közben! (2)');
              res
                .status(500)
                .send('Hiba történt az adatbázis művelet közben! (2)');
              return;
            }
            console.log(end);
            return;
          },
        );
      }

      const akurva = req.body.additions.map(x => `('${recipeId}', '${x}')`);
      console.log(
          `INSERT INTO additions VALUES ${akurva.join(', ')}`
      )

      if (req.body.additions.length != 0) {
        pool.query(
          `INSERT INTO additions VALUES ${akurva.join(', ')}`,
          (err, end) => {
            if (err) {
              console.log('Hiba történt az adatbázis művelet közben! (3)');
              res
                .status(500)
                .send('Hiba történt az adatbázis művelet közben! (3)');
              return;
            }
            console.log(end);
            return;
          },
        );
      }

      res.status(200).send('The recipe has been added!');
      return;
    },
  );
});

app.get('/recipes', (req, res) => {
  pool.query(`SELECT *, LEFT(description, 100), (select count(*) from additions where recipes.id = additions.recipe_id) as additions FROM recipes`, (err, results) => {
    if (err) {
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }
    res.status(200).send(results);
    return;
  });
});

app.get('/recipes/:id', (req, res) => {
  pool.query(`SELECT * FROM recipes where id = ${req.params['id']}`, (err, results) => {
    if (err) {
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }

    res.status(200).send(results);
    return;
  });
});

app.get('/recipes/:id/additions', (req, res) => {
  pool.query(`SELECT * FROM additions where additions.recipe_id = ${req.params['id']}`, (err, results) => {
    if (err) {
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }

    res.status(200).send(results);
    return;
  });
});

// MIDDLEWARE functions

// bejelentkezés ellenőrzése
function logincheck(req, res, next) {
  let token = req.header('Authorization');

  if (!token) {
    res.status(400).send('Jelentkezz be!');
    return;
  }

  pool.query(`SELECT * FROM users WHERE ID='${token}'`, (err, results) => {
    if (results.length == 0) {
      res.status(400).send('Hibás authentikáció!');
      return;
    }

    next();
  });

  return;
}

app.get('/stats', logincheck, (req, res) => {
  let stats = {};

  pool.query(`SELECT (SELECT count(*) FROM users) as users, (SELECT count(*) FROM categories) as categories, (SELECT count(*) FROM category_claims) as categoryClaims, (SELECT count(*) FROM recipes) as recipes, (SELECT count(*) FROM additions) as additions;`, (err, results) => {
    if (err)
      return res.status(500).send('Hiba történt az adatbázis lekérés közben!');

    stats = results[0];
    res.status(200).send(stats);
  });

});

// jogosultság ellenőrzése
function admincheck(req, res, next) {
  let token = req.header('Authorization');

  if (!token) {
    res.status(400).send('Jelentkezz be!');
    return;
  }

  pool.query(`SELECT role FROM users WHERE ID='${token}'`, (err, results) => {
    if (results.length == 0) {
      res.status(400).send('Hibás authentikáció!');
      return;
    }
    if (results[0].role != 'admin') {
      res.status(400).send('Nincs jogosultságod!');
      return;
    }
    next();
  });

  return;
}
app.listen(port, () => {
  //console.log(process.env) ;
  console.log(`Server listening on port ${port}...`);
});
