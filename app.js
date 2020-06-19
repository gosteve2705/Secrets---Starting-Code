//jshint esversion:6

const express = require("express");
const ejs = require("ejs");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static('public'));
// Registering and setting  the view engine
app.set('view engine', 'ejs');


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true ,useUnifiedTopology: true });

const userSchema = {
  email: String,
  password: String
};

const User = new mongoose.model('user', userSchema);


app.get('/',function(req,res){
  res.render('home');
});

app.get('/register', function(req,res){
  res.render('register');
});

app.get('/login',function(req,res){
  res.render('login');
});


app.post('/register', function(req,res){
  const username = req.body.username;
  const password = req.body.password;

  const user = new User({
    email: username,
    password: password
  });

  user.save(function(err){
    if(err){
      res.send(err);
    }else{
      res.render('secrets');
    }
  });


});


app.post('/login',function(req,res){
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({email: username},function(err,foundUser){
    if(foundUser.password === password){
      res.render('secrets');
    }else{
      res.send('wrong password or username');
    }
  });
});


app.listen(3000,function(){
  console.log("server started on port 3000");
});
