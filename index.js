require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

// Middleware
app.use(cors());
app.use(express.json());

// ---------------------
// Mongodb connection

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lds4lih.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Verify token
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
};

// Verify token email
const verifyTokenEmail = (paramName) => {
  return async (req, res, next) => {
    const queryEmail = req.query[paramName];
    if (queryEmail !== req.decoded.email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    next();
  };
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // Collection
    const shareFoodCollection = client
      .db("shareFoodDb")
      .collection("shareFood");

    // GET

    // Get foods by donorEmail (with token verification)
    app.get(
      "/shareFood/donor",
      verifyFirebaseToken,
      verifyTokenEmail("donorEmail"),
      async (req, res) => {
        const donorEmail = req.query.donorEmail;

        const query = {
          foodDonarEmail: donorEmail,
        };
        const foods = await shareFoodCollection.find(query).toArray();
        res.send(foods);
      }
    );

    // Get foods by requestedBy (with token verification)
    app.get(
      "/shareFood/requested",
      verifyFirebaseToken,
      verifyTokenEmail("requestedBy"),
      async (req, res) => {
        const requestedBy = req.query.requestedBy;

        const query = {
          requestedBy: requestedBy,
        };
        const foods = await shareFoodCollection.find(query).toArray();
        res.send(foods);
      }
    );

    // Get all foods (no token required)
    app.get("/shareFood", async (req, res) => {
      const foods = await shareFoodCollection.find({}).toArray();
      res.send(foods);
    });

    // Sorted Get based on (expired date)
    app.get("/sortedAvailableFoods", async (req, res) => {
      try {
        const result = await shareFoodCollection
          .find()
          .sort({ expiredDate: 1, _id: 1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // Specific GET by id
    app.get("/shareFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shareFoodCollection.findOne(query);
      res.send(result);
    });

    // specific PATCH
    app.patch("/shareFood/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedData = req.body;
      const updateDocument = {
        $set: updatedData,
      };
      const result = await shareFoodCollection.updateOne(
        filter,
        updateDocument
      );
      res.send(result);
    });

    // specific PUT
    app.put("/shareFood/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedData = req.body;
      const updateDocument = {
        $set: updatedData,
      };
      const result = await shareFoodCollection.updateOne(
        filter,
        updateDocument
      );
      res.send(result);
    });

    // POST
    app.post("/shareFood", verifyFirebaseToken, async (req, res) => {
      const addData = req.body;
      const result = await shareFoodCollection.insertOne(addData);
      res.send(result);
    });

    // DELETE
    app.delete("/shareFood/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shareFoodCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// ---------------------

app.get("/", (req, res) => {
  res.send("ShareBite server is running!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
