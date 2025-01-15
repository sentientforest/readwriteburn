// write input from client, only needs id of entity to reference for 
// junction table foreign keys 
export interface AssociativeId {
  id: string;
}

// full entity, for responses sent to client which need readable display data 
export interface AssociativeEntity extends AssociativeId {
  name: string;
  description?: string;
}

export interface SavePizzaSelectionDto {
  id?: string;
  name: string;
  contributor?: string;
  description?: string;
  crust: AssociativeId;
  sauce: AssociativeId;
  toppings: AssociativeId[];
}

export interface PizzaSelectionResDto {
  id: string;
  name: string;
  contributor: string;
  crust: AssociativeEntity;
  sauce: AssociativeEntity;
  toppings: AssociativeEntity[];
}

export interface BurnGalaDto {

}

export interface BurnAndSavePizzaSelectionDto {
  pizza: SavePizzaSelectionDto;
  burnDto: BurnGalaDto;
}