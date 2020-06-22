//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const GitHubStrategy = require('passport-github').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");

app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static('public'));
// Registering and setting  the view engine
app.set('view engine', 'ejs');


app.use(session({
  secret: 'keyboard secret',
  resave: false,
  saveUninitialized: true,

}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URL, {useNewUrlParser: true ,useUnifiedTopology: true,useCreateIndex: true });


const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  githubId: String,
  facebookId: String,
  secrets: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model('user', userSchema);





// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Google Auth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://post-a-secret.herokuapp.com/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// Github Auth
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "https://post-a-secret.herokuapp.com/auth/github/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ githubId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
// facebook Auth
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://post-a-secret.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/',function(req,res){
  res.render('home');
});

app.get('/register', function(req,res){
  res.render('register');
});

app.get('/login',function(req,res){
  res.render('login');
});

app.get('/secrets', function(req,res){
  User.find({'secrets': {$ne: null}},
  function(err,foundUsers){
    if (err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render('secrets',{foundUsersWithSecrets: foundUsers});
      }
    }
  }
);
});

app.get('/submit',function(req,res){
  if(req.isAuthenticated()){
    res.render('submit');
  }else{
    res.redirect('/login');
  }
});

app.post('/submit',function(req,res){
  const submittedSecret = req.body.secret;

  User.findById(req.user._id, function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){

        foundUser.secrets =  submittedSecret ;

        foundUser.save(function(){
          res.redirect('/secrets');
        });
      }
    }
  });
});

app.get('/logout',function(req,res){
  req.logout();
  res.redirect('/');
});


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  app.get('/auth/github',
    passport.authenticate('github'));

  app.get('/auth/github/secrets',
    passport.authenticate('github', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });

  app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });




app.post('/register', function(req,res){

User.register({username: req.body.username}, req.body.password, function (err, user){
  if(err){
    console.log(err);
    res.redirect('/register');
  }else{
    passport.authenticate('local')(req,res, function(){
      res.redirect('/secrets');
    });
  }
});



});


app.post('/login',function(req,res){
const user = new User({
  username: req.body.username,
  password: req.body.password
});
req.login(user, function(err) {
  if (err) {
    console.log(err);
    res.redirect('/login');
  }else{
    passport.authenticate('local')(req,res, function(){
      res.redirect('/secrets');
    });}
  });

});


app.listen(process.env.PORT||3000,function(){
  console.log("server started on port 3000");
});
