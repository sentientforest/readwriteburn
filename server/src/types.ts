export interface AssociativeId {
  id: string;
  quantity?: number;
}

export interface AssociativeEntity extends AssociativeId {
  name: string;
  description?: string;
}

export interface SavePizzaSelectionDto {
  id: string;
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

export interface PizzaResDto {
  id: string;
  name: string;
  contributor: string;
  description: string;
  crust: string;
  crust_id: string;
  sauce: string;
  sauce_id: string;
  toppings: AssociativeEntity[];
  votes?: number;
}

export interface TokenInstanceKey {
  collection: string;
  category: string;
  type: string;
  additionalKey: string;
  instance: string;
}

export interface BurnTokenQuantity {
  tokenInstanceKey: TokenInstanceKey;
  quantity: string;
}

export interface BurnGalaDto {
  tokenInstances: Array<BurnTokenQuantity>;
  owner: string;
  uniqueKey: string;
  signature: string;
}

export interface BurnAndSavePizzaSelectionDto {
  pizza: SavePizzaSelectionDto;
  burnDto: BurnGalaDto;
}

export interface BurnAndVoteDto {
  item_id: string;
  burnDto: BurnGalaDto;
}
