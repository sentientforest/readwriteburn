import "dotenv/config";

import cors from "cors";
import express from "express";

import { deleteFire, fireStarter, listFires, readFire, updateFire } from "./controllers/fires";
import { registerEthUser, registerRandomEthUser } from "./controllers/identities";
import { proxy } from "./controllers/proxy";
import {
  createSubmission,
  listSubmissions,
  listSubmissionsByFire,
  readSubmission,
  upvoteSubmission
} from "./controllers/submissions";

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Identity routes
app.get("/api/identities/new-random-user", registerRandomEthUser);
app.post("/api/identities/register", registerEthUser);
app.post("/identities/CreateHeadlessWallet", registerEthUser);
app.post("/api/:channel/:contract/:method", proxy);

// Subfire routes
app.post("/api/fires", fireStarter);
app.get("/api/fires", listFires);
app.get("/api/fires/:slug", readFire);
app.put("/api/fires/:slug", updateFire);
app.delete("/api/fires/:slug", deleteFire);

// Submission routes
app.get("/api/submissions", listSubmissions);
app.get("/api/submissions/:id", readSubmission);
app.post("/api/submissions", createSubmission);
app.post("/api/submissions/:id/vote", upvoteSubmission);
app.get("/api/fires/:slug/submissions", listSubmissionsByFire);

app.listen(port, () => {
  console.log(`${process.env.PROJECT_ID ?? "Server"} is running on port ${port}`);
});
