import express from "express";
import cors from "cors";
import mongodb from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// * middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = mongodb;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kmw7lj5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		const serviceCollect = client.db("DoctorDB").collection("CarServices");
		const bookingCollect = client.db("DoctorDB").collection("BookServies");

		app.get("/car-services", async (req, res) => {
			const result = await serviceCollect.find().toArray();
			res.send(result);
		});

		app.get("/car-services/:id", async (req, res) => {
			const query = { _id: new ObjectId(req.params.id) };
			const options = {
				projection: { title: 1, price: 1, service_id: 1 },
			};
			const result = await serviceCollect.findOne(query, options);
			res.send(result);
		});

		app.post("/service-bookings", async (req, res) => {
			const result = await bookingCollect.insertOne(req.body);
			res.send(result);
		});

		app.get("/service-bookings", async (req, res) => {
			let query = {};
			if (req.query?.email) query = { email: req.query.email };
			const result = await bookingCollect.find(query).toArray();
			res.send(result);
		});

		app.get("/service-bookings/:id", async (req, res) => {
			const result = await bookingCollect.findOne(req.params.id);
			res.send(result);
		});

		app.delete("/service-bookings/:id", async (req, res) => {
			const query = { _id: new ObjectId(req.params.id) };
			const result = await bookingCollect.deleteOne(query);
			res.send(result);
		});

		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("server is running");
});

app.listen(port, () => {
	console.log("server is running on port", port);
});
