const express = require('express'); 
const session = require('express-session'); 
const hbs = require('express-handlebars'); 
const mongoose = require('mongoose'); 
const passport = require('passport'); 
const localStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt'); 
const app = express();

// mongodb://localhost:3000/cluster0
//Connecter base Mongo => aller dans mongo Db, le cluster selectionné et faire connect avec node + copy paste link
mongoose.connect('mongodb+srv://admin:admin@cluster0.hmvl2wv.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true, 
    useUnifiedTopology: true
}); 

//Normalement mettre dans un autre dossier

const userSchema = new mongoose.Schema({
    //objet username, password
    username: {
        type: String, 
        required: true
    }, 
    password: {
        type: String, 
        required: true
    }
}); 

const User = mongoose.model('User', userSchema); //creer l'user sur le model plus haut

//Middleware permet de faire le lien entre code et bdd
app.set('view engine', 'hbs');
app.set('view engine', 'html');
app.engine('hbs', hbs.engine({extname: '.hbs'})); // Problème bien mettre engine
app.set('view engine', 'hbs'); 
app.use(express.static(__dirname+'/public')); 
app.use(session({
    secret: "verygoodsecret", 
    resave: false, 
    saveUninitialized: true
})); 

app.use(express.urlencoded({ extended: false})); 
app.use(express.json()); // pour les tests

//Passport.js
app.use(passport.initialize()); //initialiser passport
app.use(passport.session());  //session pour rester connecter

passport.serializeUser(function (user, done){
    done(null, user.id); 
}); 

//deserialiser l'user pour avoir ses détails
passport.deserializeUser(function (id, done){
    User.findById(id, function (err, user){
        done(err, user)
    }); 
}); 

passport.use(new localStrategy(function (username, password, done){
    User.findOne({username: username}, function (err, user){
        if(err){
            return done(err); 
        }
        if(!user){
            return done(null, false, {message: 'Incorrect username'}); 
        }

        bcrypt.compare(password, user.password, function (err, res) {
            if (err) return done(err); 

            if (res === false){
                return done(null, false, {message: 'incorrect password'}); 
            }

            return done(null, user); 
        })
    })
})); 

// fontion qui redirige automatiquement si on est pas log
function isLoggedIn(req, res, next){
    if (req.isAuthenticated()) return next(); 
    res.redirect('/login'); 
}

function isLoggedOut(req, res, next){
    if (!req.isAuthenticated()) return next(); 
    res.redirect('/'); 
}

// Routes
app.get('/', isLoggedIn, (req, res) => { //ajout de isLoggedIn pour la page d'acceuil
    res.render("index", {title: "Home"}); 
}); 

app.get('/login', isLoggedOut, (req, res) => {
    const response = {
        title:"Login", 
        error: req.query.error
    }

    res.render('login', response); 
})

app.get('/about',isLoggedIn, (req, res) => {
    res.render("index", {title:"About"});
})

app.post('/login', passport.authenticate('local', {
    // si succès alors redirigé vers home 
    successRedirect: '/', 
    // sinon vers login avec l'activation de la error (voir route login)
    failureRedirect: '/login?error=true'
})); 

// app.get('/logout', function(res, req){
//     req.logout(); 
//     res.redirect('/'); 
// })

//Syntaxe à changé 

app.get("/logout", function (req, res) {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });

// setup user admin 

app.get('/setup', async (req, res) => {
    const exists = await User.exists({username: "admin"}); 
    // Si un user admin exists alors rediriger vers login 
    if (exists) {
        console.log("Exist")
        res.redirect('/login'); 
        return; 
    }

    bcrypt.genSalt(10, function (err, salt) {
        if (err) return next(err); 
        // hash = password haché
        bcrypt.hash("pass", salt, function (err, hash){
            if (err) return next(err);
            //création d'un nouveau user admin avec le nouveau password  
            const newAdmin = new User({
                username: "admin", 
                password: hash
            }); 

            newAdmin.save(); 

            res.redirect('/login');
        })
    })
})

app.listen(3000, () => {
    console.log("Listening on port 3000")
})