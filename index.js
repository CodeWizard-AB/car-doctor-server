import express from "express";
import cors from "cors";
import mongodb from "mongodb";
import dotenv from "dotenv";
import jsonwebtoken from "jsonwebtoken";
import cookieParser from "cookie-parser";
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// * middleware
app.use(
	cors({
		origin: [
			"https://car-doctor-103b0.web.app",
			"https://car-doctor-103b0.firebaseapp.com",
		],
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());

// * custom middleware
const logger = (req, res, next) => {
	console.log(req.url);
	next();
};

const verifyToken = (req, res, next) => {
	const token = req.cookies.token;
	console.log("credential:", token);
	// * no token available
	if (!token) return res.status(401).send({ message: "unauthorized access" });

	// * verify token
	jsonwebtoken.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
		if (error) return res.status(401).send({ message: "unauthorized" });
		req.user = decoded;
		next();
	});
};

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

		// * auth api

		app.post("/jwt", (req, res) => {
			const token = jsonwebtoken.sign(req.body, process.env.ACCESS_TOKEN, {
				expiresIn: "1h",
			});
			res
				.cookie("token", token, {
					httpOnly: true,
					secure: true,
					sameSite: "none",
				})
				.send({ success: true });
		});

		app.post("/logout", (req, res) => {
			console.log("logged out", req.body);
			res.clearCookie("token", { maxAge: 0 }).send({ success: true });
		});

		// * service api

		app.get("/car-services", logger, async (req, res) => {
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

		// * booking api

		app.post("/service-bookings", async (req, res) => {
			const result = await bookingCollect.insertOne(req.body);
			res.send(result);
		});

		app.get("/service-bookings", verifyToken, async (req, res) => {
			console.log("verified user:", req.user);
			let query = {};

			if (req.user.email !== req.query.email) {
				return res.status(403).send({ message: "forbidden access" });
			}

			if (req.query?.email) query = { email: req.query.email };
			const result = await bookingCollect.find(query).toArray();
			res.send(result);
		});

		app.get("/service-bookings/:id", async (req, res) => {
			const query = { _id: new ObjectId(req.params.id) };
			const result = await bookingCollect.findOne(query);
			res.send(result);
		});

		app.delete("/service-bookings/:id", async (req, res) => {
			const query = { _id: new ObjectId(req.params.id) };
			const result = await bookingCollect.deleteOne(query);
			res.send(result);
		});

		app.patch("/service-bookings/:id", async (req, res) => {
			const filter = { _id: new ObjectId(req.params.id) };
			const options = { upsert: true };
			const updated = { $set: req.body };
			const result = await bookingCollect.updateOne(filter, updated, options);
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
