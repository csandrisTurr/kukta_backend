require('dotenv').config();
const express = require('express');
var mysql = require('mysql');
const uuid = require('uuid');
var cors = require('cors');
var CryptoJS = require("crypto-js");
var moment = require('moment');

const app = express();
const port = process.env.PORT;
const passwdRegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

var pool  = mysql.createPool({
  connectionLimit : process.env.CONNECTIONLIMIT,
  host            : process.env.DBHOST,
  user            : process.env.DBUSER,
  password        : process.env.DBPASS,
  database        : process.env.DBNAME
});

// get API version
app.get('/', (req, res) => {
  res.send(`API version : ${process.env.VERSION}`);
});

// user regisztráció (ez szinte ugyan az)
app.post('/reg', (req, res) => {

  // kötelező adatok ellenőrzése
  if (!req.body.name || !req.body.email || !req.body.passwd || !req.body.confirm ){
     res.status(203).send('Nem adtál meg minden kötelező adatot!');
     return;
  }

  // jelszavak ellenőrzése
  if (req.body.passwd != req.body.confirm){
    res.status(203).send('A megadott jelszavak nem egyeznek!');
    return;
  }
  
  // jelszó min kritériumoknak megfelelés
  if (!req.body.passwd.match(passwdRegExp)){
    res.status(203).send('A jelszó nem elég biztonságos!');
    return;
  }

  // email cím ellenőrzés
  pool.query(`SELECT * FROM users WHERE email='${req.body.email}'`, (err, results) => {
     
    if (err){
      res.status(500).send('Hiba történt az adatbázis elérése közben!');
      return;
     }
    
    // ha van már ilyen email cím
    if (results.length != 0){
      res.status(203).send('Ez az e-mail cím már regisztrálva van!');
      return;
     }
    
    // új felhasználó felvétele
    pool.query(`INSERT INTO users VALUES('${uuid.v4()}', '${req.body.name}', '${req.body.email}', SHA1('${req.body.passwd}'), '0', '1')`, (err, results)=>{
      if (err){
        res.status(500).send('Hiba történt az adatbázis művelet közben!');
        return;
       }
       res.status(202).send('Sikeres regisztráció!');
       return;
    });
    return;
  });
 
});

// user belépés
app.post('/login', (req, res) => {

  //console.log(req.body);
  if (!req.body.email || !req.body.passwd) {
    res.status(203).send('Hiányzó adatok!');
    return;
  }

  pool.query(`SELECT id, name, email, role, status FROM users WHERE email ='${req.body.email}' AND pass='${CryptoJS.SHA1(req.body.passwd)}'`, (err, results) =>{
    if (err){
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }
    if (results.length == 0){
      res.status(203).send('Hibás belépési adatok!');
      return;
    }
    res.status(202).send(results);
    return;
  });

});
// Kategóriák lekérése
app.get('/categories', logincheck, (req, res) => {
  pool.query(`SELECT name FROM categories`, (err, results) =>{ 
    if (err){
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }
    if (results.length == 0){
      res.status(203).send('Nincsenek kategóriák!');
      return;
    }
    res.status(202).send(results);
    return;
  });
})

// bejelentkezett felhasználó adatainak lekérése
app.get('/me/:id', logincheck, (req, res) => {
 //TODO: id-t megoldani backenden majd, hogy ne kelljen itt átadni
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  pool.query(`SELECT name, email, role FROM users WHERE ID='${req.params.id}'`, (err, results) =>{ 
    if (err){
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }

    if (results.length == 0){
      res.status(203).send('Hibás azonosító!');
      return;
    }

    res.status(202).send(results);
    return;

  });
});

// felhasználó módosítása
app.patch('/users/:id', logincheck, (req, res) => {
  
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  if (!req.body.name || !req.body.email || !req.body.role) {
    res.status(203).send('Hiányzó adatok!');
    return;
  }

  //TODO: ne módosíthassa már meglévő email címre az email címét
  console.log(req.body.role)
  
  pool.query(`UPDATE users SET name='${req.body.name}', email='${req.body.email}', role='${req.body.role == "Admin" ? 1 : 0}' WHERE id='${req.params.id}'`, (err, results) => {
    if (err){
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }

    if (results.affectedRows == 0){
      res.status(203).send('Hibás azonosító!');
      return;
    }

    res.status(200).send('Felhasználó adatok módosítva!');
    return;
  });
  
});

// jelszó módosítás
app.patch('/passmod/:id', logincheck, (req, res) => {
  
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító! (0)');
    return;
  }

  if (!req.body.oldpass || !req.body.newpass || !req.body.confirm) {
    res.status(203).send('Hiányzó adatok!');
    return;
  }

   // jelszavak ellenőrzése
   if (req.body.newpass != req.body.confirm){
    res.status(203).send('A megadott jelszavak nem egyeznek!');
    return;
  }
  
  // jelszó min kritériumoknak megfelelés
  if (!req.body.newpass.match(passwdRegExp)){
    res.status(203).send('A jelszó nem elég biztonságos!');
    return;
  }

  // megnézzük, hogy jó-e a megadott jelenlegi jelszó
  pool.query(`SELECT pass FROM users WHERE id='${req.params.id}'`, (err, results) => {
    if (err){
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }

    if (results.length == 0){
      res.status(203).send('Hibás azonosító! (1)');
      return;
    }
    if (results[0].pass != CryptoJS.SHA1(req.body.oldpass)){
      res.status(203).send('A jelenlegi jelszó nem megfelelő!');
      return;
    }

    pool.query(`UPDATE users SET pass=SHA1('${req.body.newpass}') WHERE id='${req.params.id}'`, (err, results) => {
      if (err){
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }
  
      if (results.affectedRows == 0){
        res.status(203).send('Hibás azonosító!');
        return;
      }
  
      res.status(200).send('A jelszó módosítva!');
      return;
    });

  });

});

// felhasználók listája (CSAK ADMIN)
app.get('/users', (req, res) => {

  //TODO: csak admin joggal lehet - később

  pool.query(`SELECT id, name, email, role FROM users`, (err, results) => {
    if (err){
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
 
   pool.query(`SELECT name FROM users WHERE ID='${req.params.id}'`, (err, results) =>{ 
     if (err){
       res.status(500).send('Hiba történt az adatbázis lekérés közben!');
       return;
     }
 
     if (results.length == 0){
       res.status(203).send('Hibás azonosító!');
       return;
     }
 
     res.status(202).send(results);
     return;
 
   });
 });

// felhasználó adatainak lekérése id alapján (CSAK ADMIN)
app.get('/users/:id', (req, res) => {

  if (!req.params.id) {
     res.status(203).send('Hiányzó azonosító!');
     return;
   }
 
   pool.query(`SELECT name, email, role FROM users WHERE ID='${req.params.id}'`, (err, results) =>{ 
     if (err){
       res.status(500).send('Hiba történt az adatbázis lekérés közben!');
       return;
     }
 
     if (results.length == 0){
       res.status(203).send('Hibás azonosító!');
       return;
     }
 
     res.status(202).send(results);
     return;
 
   });
 });
 
// felhasználó törlése id alapján (CSAK ADMIN)
app.delete('/users/:id', logincheck, (req, res) => {
  
  if (!req.params.id) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  pool.query(`DELETE FROM users WHERE ID='${req.params.id}'`, (err, results) => {
    
    if (err){
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }
    
    if (results.affectedRows == 0){
      res.status(203).send('Hibás azonosító!');
      return;
    }

    res.status(200).send('Felhasználó törölve!');
    return;

  });
});

// Zoli
app.post('/recipes/:userID', logincheck, (req, res) => {
console.log("Ezt is meghívták");
  if (!req.params.userID || req.params.userID == "undefined") {
    console.log("Hiányzó azonosító!");
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  if (!req.body.title || !req.body.descr || !req.body.time || !req.body.ingredients || !req.body.calorie) {
    console.log("Hiányzó adatok!");
    res.status(203).send('Hiányzó adatok!');
    return;
  }
  console.log("Fasz")
  console.log(req.body.cat)
  pool.query(`SELECT id FROM categories WHERE name = "${req.body.cat}"`, (err ,results) => {
    if (err){
      console.log("Hiba történt az adatbázis művelet közben! (0)");
      res.status(500).send('Hiba történt az adatbázis művelet közben! (0)');
      return;
    }
    if (results.length != 0){
      console.log(results[0]);
      //console.log(`INSERT INTO recipes (catid, userid, title, descr, time, ingredients, calorie) VALUES('${results[0].id}', '${req.params.userID}', '${req.body.title}', '${req.body.descr}', ${req.body.time}, '${req.body.ingredients}', ${req.body.calorie})`);
      
      pool.query(`INSERT INTO recipes (catid, userid, title, descr, time, ingredients, calorie) VALUES('${results[0].id}', '${req.params.userID}', '${req.body.title}', '${req.body.descr}', ${req.body.time}, '${req.body.ingredients}', ${req.body.calorie})`,  (err, end) => {
        if (err){
          console.log("Hiba történt az adatbázis művelet közben! (1)");
          res.status(500).send('Hiba történt az adatbázis művelet közben! (1)');
          return;
        }
        console.log(end)
        res.status(200).send('The recipe has been added!');
        return;
      });
    }
    })
  });



  app.get('/recipes', (req, res) => {
    pool.query(`SELECT * FROM recipes`, (err, results) => {
      if (err){
        res.status(500).send('Hiba történt az adatbázis lekérés közben!');
        return;
      }
      res.status(200).send(results);
      return;
    });
  });


/*pool.query(`SELECT id FROM categories WHERE name = "${req.body.cat}"`, (err, results) => {
  if (err){
    console.log("Hiba történt az adatbázis művelet közben!");
    res.status(500).send('Hiba történt az adatbázis művelet közben!');
    return;
  }
  if (results.length != 0){
    pool.query(`INSERT INTO recipes (catid, userid, title, descr, time, ingredients, calorie) VALUES('${uuid.v4()}', '${results[0].id}', '${req.params.userID}', '${req.body.title}', '${req.body.descr}`, `${req.body.time}`, `${req.body.ingredients}`, `${req.body.calorie})`,  (err) => {
      if (err){
        console.log("Hiba történt az adatbázis művelet közben!");
        res.status(500).send('Hiba történt az adatbázis művelet közben!');
        return;
      }
      console.log("sikeresen felrakva")
      res.status(200).send('The recipe has been added!');
      return;
    });
  }
})*/

 /*
// összes felhasználó lépésadatainak lekérdezése (CSAK ADMIN)
app.get('/steps', logincheck, (req, res) => {
  
  pool.query(`SELECT * FROM stepdatas`, (err, results) => {
    if (err){
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }

    res.status(200).send(results);
    return;

  });

});

// felhasználó lépésadatainak lekérdezése
app.get('/steps/:userID', logincheck, (req, res) => {
  if (!req.params.userID) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  pool.query(`SELECT * FROM stepdatas WHERE userID='${req.params.userID}'`, (err, results) => {
    if (err){
      res.status(500).send('Hiba történt az adatbázis lekérés közben!');
      return;
    }

    res.status(200).send(results);
    return;

  });

});

// felhasználó lépésadatainak felvitele
app.post('/steps/:userID', logincheck, (req, res) => {

  if (!req.params.userID) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  if (!req.body.date || !req.body.stepcount) {
    res.status(203).send('Hiányzó adatok!');
    return;
  }

  let today = moment().format('YYYY-MM-DD');
  let date = moment(req.body.date).format('YYYY-MM-DD');

  // string-ként összehasonlítjuk a két dátumot
  if (date.localeCompare(today) > 0){
    res.status(203).send('A dátum nem lehet jövőbeli!');
    return;
  }

  pool.query(`SELECT ID FROM stepdatas WHERE userID='${req.params.userID}' AND date='${date}'`, (err ,results) => {
    if (err){
      res.status(500).send('Hiba történt az adatbázis művelet közben!');
      return;
    }

    if (results.length != 0){
      // update
      pool.query(`UPDATE stepdatas SET count=count+${req.body.stepcount} WHERE ID='${results[0].ID}'`, (err) => {
        if (err){
          res.status(500).send('Hiba történt az adatbázis művelet közben!');
          return;
        }
    
        res.status(200).send('A lépésadat hozzáadva a meglévőhöz!');
        return;
      });
    }

    // insert
    if (results.length == 0){
    pool.query(`INSERT INTO stepdatas VALUES('${uuid.v4()}', '${req.params.userID}', '${date}', ${req.body.stepcount})`, (err) => {
      if (err){
        res.status(500).send('Hiba történt az adatbázis művelet közben!');
        return;
      }
  
      res.status(200).send('A lépésadat felvéve!');
      return;
    });
    }
  });

});

// felhasználó lépésadatainak módosítása
app.patch('/steps/:userID', logincheck, (req, res) => {
  if (!req.params.userID) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  if (!req.body.date || !req.body.stepcount) {
    res.status(203).send('Hiányzó adatok!');
    return;
  }

  let date = moment(req.body.date).format('YYYY-MM-DD');

  pool.query(`UPDATE stepdatas SET count=${req.body.stepcount} WHERE userID='${req.params.userID}' AND date='${date}'`, (err, results) => {
    if (err){
      res.status(500).send('Hiba történt az adatbázis művelet közben!');
      return;
    }

    if (results.affectedRows == 0){
      res.status(203).send('Nincs ilyen adat!');
      return;
    }

    res.status(200).send('A lépésadat módosítva!');
    return;

  });

});

// felhasználó összes lépésadatainak törlése
app.delete('/steps/:userID', logincheck, (req, res) => {
  if (!req.params.userID) {
    res.status(203).send('Hiányzó azonosító!');
    return;
  }

  // ha nincs dátum megadva, akkor a felhasználó összes lépésadatát töröljük
 
  pool.query(`DELETE FROM stepdatas WHERE userID='${req.params.userID}'`, (err, results) => {
    if (err){
      res.status(500).send('Hiba történt az adatbázis művelet közben!');
      return;
    }

    if (results.affectedRows == 0){
      res.status(203).send('Nincs ilyen adat!');
      return;
    }

    res.status(200).send(`Az összes lépésadat törölve! (${results.affectedRows} nap)`);
    return;

  });   
  
});

// felhasználó lépésadatainak törlése
app.delete('/steps/:userID/:date', logincheck, (req, res)=>{
    
    if (!req.params.userID || !req.params.date) {
      res.status(203).send('Hiányzó paraméter!');
      return;
    }
    
    // ha van dátum, akkor csak azt töröljük
   
      let date = moment(req.params.date).format('YYYY-MM-DD');
      
      pool.query(`DELETE FROM stepdatas WHERE userID='${req.params.userID}' AND date='${date}'`, (err, results) => {
        if (err){
          res.status(500).send('Hiba történt az adatbázis művelet közben!');
          return;
        }
  
        if (results.affectedRows == 0){
          res.status(203).send('Nincs ilyen adat!');
          return;
        }
  
        res.status(200).send(`Az lépésadat törölve!`);
        return;
  
      });   
    
})


*/
// MIDDLEWARE functions

// bejelentkezés ellenőrzése
function logincheck(req, res, next){
  console.log("Login check meghívva");
  let token = req.header('Authorization');
  
  if (!token){
    res.status(400).send('Jelentkezz be!');
    return;
  }

  pool.query(`SELECT * FROM users WHERE ID='${token}'`, (err, results) => {
    if (results.length == 0){
      res.status(400).send('Hibás authentikáció!');
      return;
    } 

    next();
  });

  return;
}

// jogosultság ellenőrzése
function admincheck(req, res, next){
  let token = req.header('Authorization');
  
  if (!token){
    res.status(400).send('Jelentkezz be!');
    return;
  }

  pool.query(`SELECT role FROM users WHERE ID='${token}'`, (err, results) => {
    if (results.length == 0){
      res.status(400).send('Hibás authentikáció!');
      return;
    } 
    if (results[0].role != 'admin'){
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

/*
  stepcounter - users, stepdatas
---------------------------------------------
  felhasználó kezelés:
  -------------------------
  POST /reg - user regisztráció  - nincs megkötés
  POST /login - user belépés - nincs megkötés
  GET /me - bejelentkezett felhasználó adatai - logincheck
  GET /users - felhasználók listája - ok (CSAK admin!) - logincheck, admincheck
  GET /users/:id - loginckeck, admincheck
  PATCH /users/:id - logincheck
  PATCH /passmod/:id - logincheck
  DELETE /users/:id - adott id-jű felhasználó tölése (CSAK admin!) - logincheck, admincheck

  lépésadatok keelése:
  --------------------------
  GET /steps - minden felhasználó lépésadatának lekérdezése - logincheck, adminckeck
  GET /steps/:userID - felhasználó lépésadatainak lekérdezése - logincheck
  POST /steps/:userID - felhasználó lépésadat felvitele - logincheck  
  PATCH /steps/:userID - felhasználó lépésadat módosítása - ologincheckk 
  DELETE /steps/:userID - felhasználó lépésadat törlése - logincheck
  DELETE /steps/:userID/:date - felhasználó napi lépésének törlése - logincheck

*/

//stepcount insertnél megnézni, hogy arra a napra van-e már lépés és akkor update insert helyett (adja hozzá a már meglévőhöz) - ok