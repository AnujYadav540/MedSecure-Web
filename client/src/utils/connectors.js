import { InjectedConnector } from '@web3-react/injected-connector';

export const injected = new InjectedConnector({
  supportedChainIds: [
    1, // Mainnet
    137, // Polygon
    80001 // Mumbai Testnet
  ]
}); 