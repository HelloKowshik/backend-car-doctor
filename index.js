const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zg5lt79.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.use(cors({
    origin:['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => res.send('Car Doctor is Comming....'));

const logger = async(req, res, next) => {
    console.log(`Logger: ${req.hostname},${req.originalUrl}`);
    next();
}

const verifyToken = async(req, res, next) => {
    const token = req.cookies?.token;
    console.log(`Token in MW: ${token}`);
    if(!token){
        return res.status(401).send({message: 'not authorized'});
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
            console.log(err);
            return res.status(401).send({message: 'unauthorized'});
        }
        req.user = decoded;
        next();
    });
};



async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    const servicesCollection = client.db('carsDoctor').collection('services');
    const bookingCollection = client.db('carsDoctor').collection('bookings');

    app.post('/jwt', async(req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'});
        res.cookie('token', token, {httpOnly: true, secure: false}).send({success: true});
    });

    app.get('/services', async(req, res) => {
        const cursor = servicesCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    });

    app.get('/services/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const options = {
            projection:{ title: 1, service_id: 1, price: 1, img: 1}
        };
        const result = await servicesCollection.findOne(query, options);
        res.send(result);
    });

    app.get('/bookings', verifyToken, async(req, res) => {
        let query = {};
        // console.log(req.cookies.token);
        if(req.query.email !== req.user.email){
            return res.status(403).send({message: 'forbidden access'});
        }
        if(req.query?.email){
            query = {customerEmail : req.query.email};
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
    });

    app.post('/bookings', async(req, res) => {
        const bookingData = req.body;
        const result = await bookingCollection.insertOne(bookingData);
        res.send(result);
    });

    app.patch('/bookings/:id', async(req, res) => {
        const id = req.params.id;
        const updatedBooking = req.body;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set:{
                status:updatedBooking.status
            }
        };
        const result = await bookingCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });

    app.delete('/bookings/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
    });

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
    console.log(`Server is Active @ PORT: ${PORT}`);
})
