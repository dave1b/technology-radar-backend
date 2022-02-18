const mongoClient = require("mongodb").MongoClient;
const jwt = require('jsonwebtoken');
const objectId = require("mongodb").ObjectId;
const bodyParser = require("body-parser");
const express = require("express");
const server = express();
require('dotenv').config()
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'POST, GET');
        return res.status(200).json({});
    }
    next();
})

const connectionString = `${process.env.LOCALMONGODB}`;

server.get('/getByName/:name', async (req, res) => {
    const client = await mongoClient.connect(connectionString);
    const db = client.db('techradar');
    const collection = db.collection('technologies');
    const result = await collection.findOne({ name: req.params.name });

    if (result) {
        res.send(result);
    } else {
        res.status(404);
    }
    res.end();
});

server.get('/getAllPublishedByCategory/:category', async (req, res) => {
    const client = await mongoClient.connect(connectionString);
    const db = client.db('techradar');
    const collection = db.collection('technologies');
    const result = await collection.find({ category: req.params.category, published: true }).toArray();

    if (result) {
        res.send(result);
    } else {
        res.status(404);
    }

    res.end();
});

server.post('/addNewTechnology', verifyToken, async (req, res) => {
    console.log("in add")
    console.log(req.body)
    const client = await mongoClient.connect(connectionString);
    const db = client.db('techradar');
    const collection = db.collection('technologies');
    const result = await collection.insertOne(req.body);

    if (result) {
        res.send(result);
    } else {
        res.status(404);
    }
    res.end();
});

server.post('/editTechnology', verifyToken, async (req, res) => {
    console.log("in edit")
    console.log(req.body)
    const client = await mongoClient.connect(connectionString);
    const db = client.db('techradar');
    const collection = db.collection('technologies');
    const queryFilter = { name: req.body.name }
    const result = await collection.updateOne(queryFilter, { $set: req.body.technology });
    if (result) {
        res.send(result);
    } else {
        res.status(404);
    }
    res.end();
});

server.post('/login', async (req, res) => {
    let userData = req.body
    const client = await mongoClient.connect(connectionString);
    const db = client.db('techradar');
    const collection = db.collection('users');
    const collectionLoginLogs = db.collection('loginLogs');
    collection.findOne({ email: userData.email }, (error, user) => {
        if (error) {
            console.log(error);
        } else {
            if (!user) {
                res.status(401).send('Invalid username');
            } else {
                if (user.pwd !== userData.pwd) {
                    res.status(401).send('Invalid password');
                } else {
                    let payload = { subject: user.email };
                    let token = jwt.sign(payload, process.env.JWTSECRETKEY);
                    var date = new Date();
                    var dateTimeStamp = date.toLocaleDateString() + " " + date.toLocaleTimeString();
                    collectionLoginLogs.insertOne({
                        user: user.email,
                        loginTimeStamp: dateTimeStamp
                    })
                    res.status(200).send({ token });
                }
            }
        }
    });
});

server.get('/getAllUnpublished', verifyToken, async (req, res) => {
    const client = await mongoClient.connect(connectionString);
    const db = client.db('techradar');
    const collection = db.collection('technologies');
    const result = await collection.find({ published: false }).toArray();
    res.json(result)
});





function verifyToken(req, res, next) {
    let token = req.headers['authorization'];

    if (token && token.startsWith('Bearer ')) {
        // Remove Bearer from string
        token = token.split(' ')[1];
        jwt.verify(token, process.env.JWTSECRETKEY, (err, decoded) => {
            if (err) {
                res.status(401).send('Token is not valid!');
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        return res.status(401).send('No token supplied. Access Unauthorized!')
    }
};

server.listen(4566);
console.log("Server running")