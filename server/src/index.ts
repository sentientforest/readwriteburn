import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import { dbService } from './db';
import { registerRandomEthUser, registerEthUser } from './controllers/identities';
import { proxy } from "./controllers/proxy";
import type { 
  BurnAndSavePizzaSelectionDto,
  BurnAndVoteDto,
  BurnGalaDto
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

// Pizza routes
app.get('/api/pizza-menu', async (req, res, next) => {
  try {
    const crusts = dbService.getCrustStyles().map(row => ({ 
      id: row.id, 
      name: row.name, 
      description: row.description 
    }));
    
    const sauces = dbService.getSauces().map(row => ({ 
      id: row.id, 
      name: row.name, 
      description: row.description 
    }));
    
    const toppings = dbService.getToppings().map(row => ({ 
      id: row.id, 
      name: row.name, 
      description: row.description 
    }));

    res.json({ crusts, sauces, toppings });
  } catch (error) {
    next(error);
  }
});

app.get('/api/pizzas', async (req, res, next) => {
  try {
    const pizzas = dbService.getAllPizzas();
    res.json(pizzas);
  } catch (error) {
    next(error);
  }
});

app.get('/api/pizzas/:id', async (req, res, next) => {
  try {
    const pizza = dbService.getPizza(req.params.id);
    if (!pizza) {
      return res.status(404).json({ error: 'Pizza not found' });
    }
    res.json(pizza);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pizzas', async (req, res, next) => {
  try {
    const dto = req.body as BurnAndSavePizzaSelectionDto;
    
    verifyBurnDto(dto.burnDto, 10); 

    const savedPizza = dbService.savePizza(dto.pizza);
    res.status(201).json(savedPizza);
  } catch (error) {
    next(error);
  }
});

app.post('/api/pizzas/:id/vote', async (req, res, next) => {
  try {
    const dto = req.body as BurnAndVoteDto;
    
    verifyBurnDto(dto.burnDto, 5); 
    const result = dbService.votePizza(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pizza not found' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.listen(port, () => {
  console.log(`${process.env.PROJECT_ID ?? "Server"} is running on port ${port}`);
});
