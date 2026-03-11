const express = require('express');
const bodyParser = require('body-parser');

//import md5
const md5 = require('md5');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// untuk handle foto
const multer = require('multer');
const path = require('path');
const fs = require('fs'); //umntuk membaca file system

//import model
const models = require('../models/index');
const user = models.user;

//import auth
const auth = require("../auth")
const jwt = require("jsonwebtoken")
const SECRET_KEY = "butterflyhotel"

// config storage image (nyeting)
const storage = multer.diskStorage({
    destination:(req,file,cb) => {
        //cb = call back memanggil kembali
        cb(null, "./images/foto_user")
    },
    filename: (req,file,cb) => {
        cb(null, "user-" + Date.now() + path.extname(file.originalname))
    }
})
let upload = multer({storage: storage})

// endpoint login user 
app.post("/auth", async (req,res) => {
    let data= {
        email: req.body.email,
        password: md5(req.body.password)
    }
 
    let result = await user.findOne({where: data})
    if(result){
        let payload = JSON.stringify(result)
        // generate token
        let token = jwt.sign(payload, SECRET_KEY)
        res.json({
            logged: true,
            data: result,
            token: token
        })
    }else{
        res.json({
            logged: false,
            message: "Invalid email or password"
        })
    }
})

// get user 
app.get("/", auth, (req, res) =>{
    user.findAll()
        .then(user => {
            res.json({
                count: user.length,
                user: user
            })
        })
        .catch(error => {
            res.json({
                message: error.message
            })
        })  
})

//endpoint untuk menampilkan data user berdasarkan id
//GET USER BY ID, METHOD:GET FUCNTION: FINDONE
app.get("/:id_user", (req, res) =>{
    user.findOne({ where: {id_user: req.params.id_user}})
    .then(result => {
        res.json({
            user: result
        })
    })
    .catch(error => {
        res.json({
            message: error.message
        })
    })
})

//endpoint untuk menampilkan data user berdasarkan role
//GET USER BY ROLE, METHOD:GET FUCNTION: FINDONE
app.get("/role/:role", (req, res) =>{
    user.findAll({ where: {role: req.params.role}})
    .then(result => {
        res.json({
            count: result.length,
            user: result
        })
    })
    .catch(error => {
        res.json({
            message: error.message
        })
    })
})

//endpoint untuk menambahkan data user baru
app.post("/", upload.single("foto"), (req, res) =>{
    if (!req.file) {
        res.json({
            message: "No uploaded file"
        })
    } else {
        let data = {
            nama_user: req.body.nama_user,
            foto: req.file.filename,
            email: req.body.email,
            password: md5(req.body.password),
            role: req.body.role,
        }
        user.create(data)
        .then(result => {
            res.json({
                message: "data has been inserted"
            })
        })
        .catch(error => {
            res.json({
                message: error.message
            })
        })
    }
})

//endpoint untuk mengubah data user berdasarkan id
app.put("/:id", upload.single("foto"), (req, res) =>{
    let param = { id_user: req.params.id}
    let data = {
        nama_user: req.body.nama_user,
        email: req.body.email,
        password: md5(req.body.password),
        role: req.body.role,
    }
    if (req.file) {
        // get data by id
        const row = user.findOne({where: param})
        .then(result => {
            let oldFileName = result.foto
           
            // delete old file
            let dir = path.join(__dirname,"../images/foto_user",oldFileName)
            fs.unlink(dir, err => console.log(err))
        })
        .catch(error => {
            console.log(error.message);
        })

        // set new filename
        data.foto = req.file.filename
    }
    if(req.body.password){
        data.password = md5(req.body.password)
    }

    user.update(data, {where: param})
        .then(result => {
            res.json({
                message: "data has been updated",
            })
        })
        .catch(error => {
            res.json({
                message: error.message
            })
        })
})

// endpoint untuk menghapus data user berdasarkan id
app.delete("/:id", async (req, res) =>{
    try {
        let param = { id_user: req.params.id}
        let result = await user.findOne({where: param})
        let oldFileName = result.foto
           
        // delete old file
        let dir = path.join(__dirname,"../images/foto_user",oldFileName)
        fs.unlink(dir, err => console.log(err))
 
        // delete data
        user.destroy({where: param})
        .then(result => {
           
            res.json({
                message: "data has been deleted",
            })
        })
        .catch(error => {
            res.json({
                message: error.message
            })
        })
 
    } catch (error) {
        res.json({
            message: error.message
        })
    }
})

module.exports = app;