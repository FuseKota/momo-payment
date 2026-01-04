import { SquareClient, SquareEnvironment } from 'square';

const environment =
  process.env.SQUARE_ENVIRONMENT === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

export const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment,
});

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID!;

export function getSquareEnvironmentName(): string {
  return process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'Production'
    : 'Sandbox';
}

export default squareClient;
