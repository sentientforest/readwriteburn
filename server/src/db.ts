import Database from 'better-sqlite3';
import { AssociativeEntity, PizzaResDto } from './types';

const db = new Database('readwriteburn.db');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pizza_crust_styles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS pizza_sauces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS pizza_toppings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS pizzas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contributor TEXT,
      description TEXT,
      crust_id TEXT NOT NULL,
      sauce_id TEXT NOT NULL,
      votes INTEGER DEFAULT 0,
      FOREIGN KEY (crust_id) REFERENCES pizza_crust_styles(id),
      FOREIGN KEY (sauce_id) REFERENCES pizza_sauces(id)
    );

    CREATE TABLE IF NOT EXISTS pizza_toppings_junction (
      pizza_id TEXT NOT NULL,
      topping_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      PRIMARY KEY (pizza_id, topping_id),
      FOREIGN KEY (pizza_id) REFERENCES pizzas(id),
      FOREIGN KEY (topping_id) REFERENCES pizza_toppings(id)
    );
  `);
}

export function mapBasicRow(row: any): AssociativeEntity {
  return {
    id: row.id,
    name: row.name,
    description: row.description
  };
}

export const dbService = {
  getCrustStyles: (): AssociativeEntity[] => {
    return db.prepare('SELECT id, name, description FROM pizza_crust_styles')
      .all() as AssociativeEntity[];
  },

  getSauces: (): AssociativeEntity[]=> {
    return db.prepare('SELECT id, name, description FROM pizza_sauces')
      .all() as AssociativeEntity[];
  },

  getToppings: () => {
    return db.prepare('SELECT id, name, description FROM pizza_toppings')
      .all() as AssociativeEntity[];
  },

  getPizza: (id: string): PizzaResDto | null => {
    const pizza = db.prepare(`
      SELECT p.*, c.name as crust, s.name as sauce
      FROM pizzas p
      JOIN pizza_crust_styles c ON p.crust_id = c.id
      JOIN pizza_sauces s ON p.sauce_id = s.id
      WHERE p.id = ?
    `).get(id);

    if (pizza) {
      const toppings = db.prepare(`
        SELECT t.id, t.name, t.description, j.quantity
        FROM pizza_toppings t
        JOIN pizza_toppings_junction j ON t.id = j.topping_id
        WHERE j.pizza_id = ?
      `).all(id);

      return { ...pizza, toppings: toppings as AssociativeEntity[] } as PizzaResDto;
    }
    return null;
  },

  getAllPizzas: () => {
    return db.prepare(`
      SELECT p.*, c.name as crust, s.name as sauce
      FROM pizzas p
      JOIN pizza_crust_styles c ON p.crust_id = c.id
      JOIN pizza_sauces s ON p.sauce_id = s.id
    `).all();
  },

  savePizza: (pizza: any) => {
    const insertPizza = db.prepare(`
      INSERT INTO pizzas (id, name, contributor, description, crust_id, sauce_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertTopping = db.prepare(`
      INSERT INTO pizza_toppings_junction (pizza_id, topping_id, quantity)
      VALUES (?, ?, ?)
    `);

    const { id, name, contributor, description, crust, sauce, toppings } = pizza;

    db.transaction(() => {
      insertPizza.run(id, name, contributor, description, crust.id, sauce.id);
      
      for (const topping of toppings) {
        insertTopping.run(id, topping.id, topping.quantity || 1);
      }
    })();

    return dbService.getPizza(id);
  },

  votePizza: (id: string) => {
    return db.prepare('UPDATE pizzas SET votes = votes + 1 WHERE id = ?').run(id);
  }
};

// Initialize the database when this module is imported
initializeDatabase();
