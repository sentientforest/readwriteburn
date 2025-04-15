import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import { dbService } from './db';
import { registerRandomEthUser, registerEthUser } from './controllers/identities';
import { proxy } from "./controllers/proxy";
import type { 
  BurnAndSubmitDto,
  BurnAndVoteDto,
  BurnGalaDto,
  SubfireDto
} from './types';

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Helper function to verify burn DTO
function verifyBurnDto(burnDto: BurnGalaDto, burnCost: number): number {
  if (!Array.isArray(burnDto.tokenInstances) || burnDto.tokenInstances.length !== 1) {
    throw new Error("Invalid burnDto.tokenInstances length");
  }

  const galaQty = burnDto.tokenInstances[0];
  const { collection, category, type, additionalKey } = galaQty.tokenInstanceKey;

  if (collection !== "GALA" || category !== "Unit" || type !== "none" || additionalKey !== "none") {
    throw new Error("Incorrect burnDto $GALA TokenInstanceKey");
  }

  const burnQuantity = +galaQty.quantity;
  if (!(burnQuantity >= burnCost)) {
    throw new Error(`Insufficient $GALA burn quantity: ${galaQty.quantity}, required: ${burnCost}`);
  }

  return burnQuantity;
}

// Identity routes
app.get('/api/identities/new-random-user', registerRandomEthUser);
app.post('/api/identities/register', registerEthUser);
app.post('/identities/CreateHeadlessWallet', registerEthUser);
app.post('/api/:channel/:contract/:method', proxy);

// Subfire routes
app.post('/api/subfires', async (req, res, next) => {
  try {
    const subfire = req.body as SubfireDto;
    const created = dbService.createSubfire(subfire);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.get('/api/subfires', async (req, res, next) => {
  try {
    const subfires = dbService.getAllSubfires();
    res.json(subfires);
  } catch (error) {
    next(error);
  }
});

app.get('/api/subfires/:id', async (req, res, next) => {
  try {
    const subfire = dbService.getSubfire(parseInt(req.params.id));
    if (!subfire) {
      return res.status(404).json({ error: 'Subfire not found' });
    }
    res.json(subfire);
  } catch (error) {
    next(error);
  }
});

app.put('/api/subfires/:id', async (req, res, next) => {
  try {
    const subfire = req.body as SubfireDto;
    const updated = dbService.updateSubfire(parseInt(req.params.id), subfire);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/subfires/:id', async (req, res, next) => {
  try {
    const success = dbService.deleteSubfire(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Subfire not found' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Submission routes
app.get('/api/submissions', async (req, res, next) => {
  try {
    const submissions = dbService.getAllSubmissions();
    res.json(submissions);
  } catch (error) {
    next(error);
  }
});

app.get('/api/submissions/:id', async (req, res, next) => {
  try {
    const submission = dbService.getSubmission(parseInt(req.params.id));
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json(submission);
  } catch (error) {
    next(error);
  }
});

app.post('/api/submissions', async (req, res, next) => {
  try {
    const dto = req.body as BurnAndSubmitDto;
    
    verifyBurnDto(dto.burnDto, 10); 

    const saved = dbService.saveSubmission(dto.submission);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

app.post('/api/submissions/:id/vote', async (req, res, next) => {
  try {
    const dto = req.body as BurnAndVoteDto;
    
    verifyBurnDto(dto.burnDto, 5); 
    const success = dbService.voteSubmission(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/subfires/:id/submissions', async (req, res, next) => {
  try {
    const submissions = dbService.getSubmissionsBySubfire(parseInt(req.params.id));
    res.json(submissions);
  } catch (error) {
    next(error);
  }
});

app.listen(port, () => {
  console.log(`${process.env.PROJECT_ID ?? "Server"} is running on port ${port}`);
});
